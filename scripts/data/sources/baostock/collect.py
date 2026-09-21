"""Bounded serial BaoStock acquisition. Raw responses never enter Git."""
import argparse, csv, hashlib, inspect, json, subprocess, sys, time
from importlib.metadata import version
from datetime import datetime, timezone
from pathlib import Path

def worker(request):
    import socket
    socket.setdefaulttimeout(12)
    import baostock as bs
    login = bs.login()
    if login.error_code != '0':
        raise RuntimeError('login: ' + login.error_code + ': ' + login.error_msg)
    try:
        fn = getattr(bs, request['function'])
        result = fn(**request['kwargs'])
        fields, rows = list(result.fields), []
        if result.error_code != '0':
            raise RuntimeError(result.error_code + ': ' + result.error_msg)
        if not fields: raise RuntimeError('No returned field schema')
        while result.next():
            if result.error_code != '0':
                raise RuntimeError(result.error_code + ': ' + result.error_msg)
            row = result.get_row_data()
            if len(row) != len(fields): raise RuntimeError('row width mismatch')
            rows.append(row)
        if result.error_code != '0': raise RuntimeError(result.error_msg)
        print('RESULT_JSON:' + json.dumps({'fields': fields, 'rows': rows, 'signature': str(inspect.signature(fn))}))
    finally:
        bs.logout()

def run(args):
    import baostock as bs
    config = json.loads(Path(args.config).read_text('utf-8-sig')) if args.config else {}
    start, end = config.get('start', args.start), config.get('end', args.end)
    codes = config.get('codes', ['sh.600000','sz.000001','sh.600519','sz.000002','sz.000651'])
    requests=[]
    def add(label, function, **kwargs): requests.append({'label': label, 'function': function, 'kwargs': kwargs})
    for code in codes:
        add(code+'-5m','query_history_k_data_plus',code=code,fields='date,time,code,open,high,low,close,volume,amount,adjustflag',start_date=start,end_date=end,frequency='5',adjustflag='3')
        add(code+'-daily','query_history_k_data_plus',code=code,fields='date,code,open,high,low,close,preclose,volume,amount,adjustflag,tradestatus,isST',start_date=start,end_date=end,frequency='d',adjustflag='3')
        add(code+'-basic','query_stock_basic',code=code)
        add(code+'-dividend','query_dividend_data',code=code,year=start[:4],yearType='operate')
        add(code+'-adjust','query_adjust_factor',code=code,start_date=start,end_date=end)
    add('calendar','query_trade_dates',start_date=start,end_date=end)
    add('universe','query_all_stock',day=start)
    # Identity probes first. Dates are not guessed; candidate windows must be inside returned lifecycle.
    for code in ['sh.600240','sz.000018']: add(code+'-delisted-basic','query_stock_basic',code=code)
    root=Path('.runtime/data/baostock');root.mkdir(parents=True,exist_ok=True)
    sdk_version=version('baostock')
    cache_key=hashlib.sha256(json.dumps([sdk_version,requests],sort_keys=True).encode()).hexdigest()
    cached=[]
    for old in sorted(root.glob('*/request-manifest.json')):
        previous=json.loads(old.read_text('utf-8'))
        if previous.get('sdkVersion') in [sdk_version,getattr(bs,'__version__','')]:
            cached.extend((old.parent,r) for r in previous['requests'] if r.get('status') in ['PASS','EMPTY'] and r.get('file'))
        intact=all((old.parent/r['file']).is_file() and hashlib.sha256((old.parent/r['file']).read_bytes()).hexdigest()==r['sha256'] for r in previous['requests'] if 'file' in r)
        if previous.get('cacheKey')==cache_key and previous.get('status')=='PASS' and intact and not args.refresh:
            print(json.dumps({'cacheHit':str(old.parent)}));return 0
    batch=root/datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    (batch/'raw').mkdir(parents=True);(batch/'logs').mkdir()
    manifest={'source':'https://www.baostock.com','sdkVersion':sdk_version,'sdkDeclaredVersion':getattr(bs,'__version__',''),'python':sys.version.split()[0],'requestedFrom':start,'requestedTo':end,'acquiredAt':datetime.now(timezone.utc).isoformat(),'cacheKey':cache_key,'status':'IN_PROGRESS','requests':[],'usage':'UNCONFIRMED','redistribution':'UNCONFIRMED'}
    failures=0
    for request in requests:
        entry=dict(request);entry['attempts']=[]
        result=None
        if not args.refresh:
            for old_root,old in reversed(cached):
                if old['function']==request['function'] and old['kwargs']==request['kwargs']:
                    path=old_root/old['file']
                    if hashlib.sha256(path.read_bytes()).hexdigest()!=old['sha256']:continue
                    with path.open(encoding='utf-8',newline='') as stream: values=list(csv.reader(stream))
                    result={'fields':values[0],'rows':values[1:],'signature':old['signature']};entry['cacheFrom']=str(path);break
        # Consecutive source failures stop unnecessary traffic; identity probes remain bounded.
        if result is None and failures>=2 and 'delisted' not in request['label']:
            entry.update(status='BLOCKED',error='Dependency: repeated source connection failure');manifest['requests'].append(entry);continue
        for attempt in range(0 if result is not None else 2):
            try:
                proc=subprocess.run([sys.executable,'-X','utf8',__file__,'--worker',json.dumps(request)],capture_output=True,text=True,timeout=30,encoding='utf-8',errors='replace')
                (batch/'logs'/(request['label']+'-'+str(attempt)+'.txt')).write_text(proc.stdout+'\n'+proc.stderr,encoding='utf-8')
                lines=[x[len('RESULT_JSON:'):] for x in proc.stdout.splitlines() if x.startswith('RESULT_JSON:')]
                if proc.returncode!=0 or not lines: raise RuntimeError((proc.stderr or proc.stdout)[-1500:])
                result=json.loads(lines[-1]);entry['attempts'].append({'status':'RESPONSE','rowCount':len(result['rows'])});break
            except (subprocess.TimeoutExpired, RuntimeError) as err:
                entry['attempts'].append({'status':'ERROR','error':str(err)[:2000]})
                time.sleep(attempt+1)
        if result is None:
            failures+=1;entry.update(status='BLOCKED',error='Source request failed; see attempts/logs')
        else:
            failures=0
            path=batch/'raw'/(request['label']+'.csv')
            with path.open('x',encoding='utf-8',newline='') as stream:
                writer=csv.writer(stream);writer.writerow(result['fields']);writer.writerows(result['rows'])
            entry.update(status='PASS' if result['rows'] else 'EMPTY',rowCount=len(result['rows']),fields=result['fields'],signature=result['signature'],sha256=hashlib.sha256(path.read_bytes()).hexdigest(),file=str(path.relative_to(batch)))
            if 'date' in result['fields'] and result['rows']:
                values=[r[result['fields'].index('date')] for r in result['rows']];entry.update(returnedFrom=min(values),returnedTo=max(values))
            if 'delisted-basic' in request['label'] and result['rows']:
                row=dict(zip(result['fields'],result['rows'][0]));ipo,out=row.get('ipoDate',''),row.get('outDate','')
                if ipo and out and ipo<start<out:
                    code=request['kwargs']['code'];add(code+'-delisted-5m','query_history_k_data_plus',code=code,fields='date,time,code,open,high,low,close,volume,amount,adjustflag',start_date=start,end_date=min(end,out),frequency='5',adjustflag='3')
                    add(code+'-delisted-daily','query_history_k_data_plus',code=code,fields='date,code,open,high,low,close,preclose,volume,amount,adjustflag,tradestatus,isST',start_date=start,end_date=min(end,out),frequency='d',adjustflag='3')
                else: entry['coverageNote']='Lifecycle does not verify requested window; no invented date'
        manifest['requests'].append(entry)
        (batch/'request-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    # Ancillary absence is never called supported coverage. Core acquisition can still complete.
    manifest['status']='PASS' if all(r['status']=='PASS' or (r['status']=='EMPTY' and r['function'] in ['query_adjust_factor','query_dividend_data']) for r in manifest['requests']) else 'BLOCKED'
    (batch/'request-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    (batch/'coverage-report.json').write_text(json.dumps({'status':manifest['status'],'requests':manifest['requests']},ensure_ascii=False,indent=2),encoding='utf-8')
    (batch/'rejected-records.jsonl').write_text('',encoding='utf-8')
    print(json.dumps({'batch':str(batch),'status':manifest['status'],'requests':len(manifest['requests'])}));return 0 if manifest['status']=='PASS' else 2

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--worker');parser.add_argument('--start',default='2020-01-02');parser.add_argument('--end',default='2020-01-23');parser.add_argument('--config');parser.add_argument('--refresh',action='store_true');args=parser.parse_args()
    if args.worker: worker(json.loads(args.worker))
    else: sys.exit(run(args))
