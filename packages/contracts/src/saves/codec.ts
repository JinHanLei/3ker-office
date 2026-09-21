/** Wire values are base-ten integer strings. Only unit-bearing fields are revived. */
export function encodeState(value:unknown):string{return JSON.stringify(value,(_key,v:unknown)=>typeof v==='bigint'?v.toString():v);}
const quantityKeys=new Set(['quantity','remaining','frozenQuantity','shareQuantity','quantityDelta','volume']);
export function decodeState<T>(text:string):T{return JSON.parse(text,(key,v:unknown)=>typeof v==='string'&&(/(?:Fen|Units)$/.test(key)||quantityKeys.has(key))&&/^-?\d+$/.test(v)?BigInt(v):v) as T;}
