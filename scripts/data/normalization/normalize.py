"""Decimal-based BaoStock normalization; rejects missing metadata and daily conflicts."""
import argparse,csv,hashlib,json
from datetime import datetime,timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

def units(value,scale):
    n=Decimal(value)*scale
    if n!=n.to_integral_value(): raise ValueError('Unrepresentable precision: '+value)
    return str(int(n))

def normalize(root,output):
    manifest=json.loads((root/'request-manifest.json').read_text('utf-8-sig'))
    def read(label,allow_empty=False):
        item=next((r for r in manifest['requests'] if r['label']==label),None)
        if not item or item['status'] not in (['PASS','EMPTY'] if allow_empty else ['PASS']): raise ValueError('Required source response missing: '+label)
        path=root/item['file']
        if hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']: raise ValueError('Source hash mismatch')
        with path.open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
    days=[r['calendar_date'] for r in read('calendar') if r['is_trading_day']=='1']
    universe={r['code']:r for r in read('universe')}
    codes=[r['kwargs']['code'] for r in manifest['requests'] if r['label'].endswith('-5m') and 'delisted' not in r['label']]
    bars=[];securities=[];names=[];statuses=[];gaps=[];audit=[]
    at=lambda d,t:d+'T'+t+':00+08:00'
    calendar=[{'date':d,'sessions':[{'open':at(d,'09:30'),'close':at(d,'11:30')},{'open':at(d,'13:00'),'close':at(d,'15:00')}]} for d in days]
    for code in codes:
        basic=read(code+'-basic')[0]
        if code not in universe or basic.get('type')!='1' or basic['ipoDate']>days[0]:raise ValueError('Historical identity unverified: '+code)
        if basic.get('outDate') and basic['outDate']<=days[-1]:raise ValueError('Exit requires last-trading and policy evidence')
        securities.append({'securityId':code,'board':'GAME_TEST','listedAt':at(basic['ipoDate'],'09:30')})
        # Current names are deliberately excluded.
        names.append({'securityId':code,'code':code,'name':'历史名称缺失','from':at(days[0],'00:00'),'to':at(days[-1],'23:59'),'knownAt':at(days[0],'00:00')})
        raw=read(code+'-5m');daily={r['date']:r for r in read(code+'-daily')};byday={}
        for r in raw:
            if r['adjustflag']!='3':raise ValueError('Adjusted data rejected')
            dt=datetime.strptime(r['time'][:14],'%Y%m%d%H%M%S');end=dt.isoformat()+'+08:00';start=(dt-timedelta(minutes=5)).isoformat()+'+08:00'
            bar={'securityId':code,'barStart':start,'barEnd':end,'availableAt':end,'openUnits':units(r['open'],10000),'highUnits':units(r['high'],10000),'lowUnits':units(r['low'],10000),'closeUnits':units(r['close'],10000),'volume':units(r['volume'],1),'amountFen':str(int((Decimal(r['amount'])*100).quantize(Decimal('1'),rounding=ROUND_HALF_UP)))}
            bars.append(bar);byday.setdefault(r['date'],[]).append(bar)
        for d in days:
            if d not in daily: gaps.append(code+':daily missing:'+d);continue
            dr=daily[d];rows=byday.get(d,[])
            if dr['tradestatus']=='0':
                statuses.append({'securityId':code,'from':at(d,'00:00'),'to':at(d,'23:59'),'status':'SUSPENDED'});continue
            if len(rows)!=48:gaps.append(code+':5m count '+str(len(rows))+':'+d)
            if rows:
                checks={'volume':sum(int(x['volume']) for x in rows)==int(Decimal(dr['volume'])),'close':rows[-1]['closeUnits']==units(dr['close'],10000),'high':max(int(x['highUnits']) for x in rows)==int(units(dr['high'],10000)),'low':min(int(x['lowUnits']) for x in rows)==int(units(dr['low'],10000))}
                if not all(checks.values()):gaps.append(code+':daily aggregation conflict:'+d+':'+str(checks))
    # Real company actions are audited separately. Missing dates never get synthesized.
    action_keys=set()
    for code in codes:
        for row in read(code+'-dividend',allow_empty=True):
            missing=[f for f in ['dividPlanDate','dividRegistDate','dividOperateDate','dividPayDate'] if not row.get(f)]
            cash=row.get('dividCashPsBeforeTax')
            numerator,denominator=(Decimal(cash)*100).as_integer_ratio() if cash else (None,None)
            if not cash:missing.append('dividCashPsBeforeTax')
            mapped={'securityId':code,'cashFenNumerator':str(numerator) if numerator is not None else None,'cashFenDenominator':str(denominator) if denominator is not None else None,'recordDate':row.get('dividRegistDate'),'effectiveDate':row.get('dividOperateDate'),'payDate':row.get('dividPayDate'),'announcementDate':row.get('dividPlanDate'),'stockReleaseDate':row.get('dividStockMarketDate') or None,'stockRatioRaw':row.get('dividStocksPs'),'reserveRatioRaw':row.get('dividReserveToStockPs') or None,'timePrecision':'date','announcementVisibilityPolicy':'next-calendar-day-00:00-Asia/Shanghai','implementationStatus':'SDK_OPERATE_YEAR_RECORD_NOT_ANNOUNCEMENT_VERIFIED'}
            key=(code,row.get('dividRegistDate'),row.get('dividOperateDate'),row.get('dividPayDate'))
            audit.append({'raw':row,'mapped':mapped,'status':'DUPLICATE_CANDIDATE' if key in action_keys else 'CANDIDATE','missing':missing});action_keys.add(key)
            if days[0]<=row.get('dividOperateDate','')<=days[-1]:gaps.append('Company action in window requires implemented-status and announcement evidence')
        factors=read(code+'-adjust',allow_empty=True)
        if factors:gaps.append(code+':adjustment in window requires explicit verified action coverage')
    if gaps: raise ValueError('Coverage blocked: '+json.dumps(gaps))
    output.mkdir(parents=True,exist_ok=False)
    rule=json.loads(Path('rules/synthetic-basic-v1.json').read_text('utf-8'));rule.update(board='GAME_TEST',requiredPermission='GAME_TEST',from_=at(days[0],'00:00'));rule.pop('from_');rule['from']=at(days[0],'00:00');rule['to']=at(days[-1],'23:59');rule['boardAvailableAt']=rule['from']
    files={'manifest':{'scenarioId':'baostock-sample','scenarioVersion':manifest['acquiredAt'],'synthetic':False,'marketDataKind':'real','rulesetKind':'game-test','ruleVersion':'synthetic-basic-v1','start':at(days[0],'09:00'),'end':at(days[-1],'15:00'),'coverageStatus':'COMPLETE','gaps':[],'source':'BaoStock','usage':'UNCONFIRMED','redistribution':'UNCONFIRMED'},'calendar':calendar,'securities':securities,'names':names,'bars-5m':bars,'trading-status':statuses,'corporate-actions':[],'rules':[rule],'provenance':{'source':'BaoStock','sdkVersion':manifest['sdkVersion'],'rawHashes':{r['file']:r['sha256'] for r in manifest['requests'] if 'sha256' in r},'notes':['5 minute end labels; volume shares; unadjusted=3','Game test fees/permissions; historical names unavailable']},'coverage-report':{'status':'COMPLETE','notes':['Verified daily high/low/close/volume; actions outside window audited separately']},'corporate-actions-audit':audit}
    for name,value in files.items():(output/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'securities':len(securities),'days':len(days),'bars':len(bars),'output':str(output)}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args()
    try:normalize(Path(a.input),Path(a.output))
    except Exception as error:
        rejected=Path(a.output+'.rejected-records.jsonl');rejected.parent.mkdir(parents=True,exist_ok=True)
        with rejected.open('a',encoding='utf-8') as stream:stream.write(json.dumps({'status':'REJECTED','input':a.input,'error':str(error)},ensure_ascii=False)+'\n')
        raise
