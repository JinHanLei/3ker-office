import {it,expect} from 'vitest';
import {amountFen,decimalUnits,roundRatio,stableStringify,decode,randomNext,ms,marketDate} from './index.js';
it('K02 exact rounding and large money serialization',()=>{
 expect(amountFen(100000n,100n)).toBe(100000n);expect(roundRatio(5n,2n)).toBe(3n);expect(roundRatio(-5n,2n)).toBe(-3n);
 expect(decimalUnits('9007199254740993.1234',4)).toBe(90071992547409931234n);
 expect(decode(stableStringify({cashFen:900719925474099312345n,quantity:100n}))).toEqual({cashFen:900719925474099312345n,quantity:100n});
 expect(()=>decimalUnits('1.12345',4)).toThrow();
});
it('K02 substreams restore independently',()=>{
 const a:Record<string,number>={},b:Record<string,number>={};randomNext(42,a,'pet');
 expect(randomNext(42,a,'social')).toBe(randomNext(42,b,'social'));
 const saved=JSON.parse(JSON.stringify(a));expect(randomNext(42,a,'social')).toBe(randomNext(42,saved,'social'));
});
it('K02 explicit timezone',()=>{expect(ms('2020-01-02T09:30:00+08:00')).toBe(ms('2020-01-02T01:30:00Z'));expect(marketDate(ms('2020-01-01T16:01:00Z'))).toBe('2020-01-02');});
