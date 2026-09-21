import {z} from 'zod';
import {id,iso,natural,positive} from '../primitives/index.js';
export const barSchema=z.object({securityId:id,barStart:iso,barEnd:iso,availableAt:iso,openUnits:positive,highUnits:positive,lowUnits:positive,closeUnits:positive,volume:natural,amountFen:natural,upperUnits:positive.optional(),lowerUnits:positive.optional()}).strict();
export const ruleSchema=z.object({id,from:iso,to:iso,board:z.string(),priceTickUnits:positive,quantityStep:positive,minimumBuyQuantity:positive,oddLotSellPolicy:z.enum(['all-remainder','reject']),sellableDelayTradingDays:z.number().int().min(1),commissionNumerator:natural,commissionDenominator:positive,minimumCommissionFen:natural,stampNumerator:natural,stampDenominator:positive,capacityNumerator:positive,capacityDenominator:positive,requiredPermission:z.string(),boardAvailableAt:iso});
export const actionSchema=z.object({actionId:id,securityId:id,type:z.enum(['DIVIDEND','SHARES','EXIT','RIGHTS','ACQUISITION','EXCHANGE']),knownAt:iso,recordAt:iso,effectiveAt:iso,payAt:iso.optional(),releaseAt:iso.optional(),cashNumerator:natural.optional(),cashDenominator:positive.optional(),shareNumerator:natural.optional(),shareDenominator:positive.optional(),fractionPolicy:z.enum(['reject','floor']).optional(),exitPolicy:z.literal('game-writeoff-v1').optional()});
export const scenarioSchema=z.object({
 manifest:z.object({scenarioId:id,scenarioVersion:z.string(),synthetic:z.boolean(),marketDataKind:z.enum(['synthetic','real']),rulesetKind:z.enum(['game-test','historical-verified']),ruleVersion:z.string(),start:iso,end:iso,coverageStatus:z.enum(['COMPLETE','PARTIAL','BLOCKED']),gaps:z.array(z.string()),source:z.string(),usage:z.string(),redistribution:z.string()}),
 calendar:z.array(z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),sessions:z.array(z.object({open:iso,close:iso})).min(1)})).min(1),
 securities:z.array(z.object({securityId:id,board:z.string(),listedAt:iso,lastTradableAt:iso.optional(),delistedAt:iso.optional(),exitKnownAt:iso.optional()})),
 names:z.array(z.object({securityId:id,code:z.string(),name:z.string(),from:iso,to:iso,knownAt:iso})),
 bars:z.array(barSchema),
 tradingStatus:z.array(z.object({securityId:id,from:iso,to:iso,status:z.enum(['SUSPENDED','MISSING'])})),
 actions:z.array(actionSchema),rules:z.array(ruleSchema).min(1),
 provenance:z.object({source:z.string(),sdkVersion:z.string(),rawHashes:z.record(z.string()),notes:z.array(z.string())}),
 coverageReport:z.object({status:z.string(),notes:z.array(z.string())})
}).superRefine((s,ctx)=>{if(s.manifest.synthetic!==(s.manifest.marketDataKind==='synthetic'))ctx.addIssue({code:'custom',message:'Synthetic/source mismatch'});});
export type ScenarioPack=z.infer<typeof scenarioSchema>;
export type Bar=z.infer<typeof barSchema>;
export type Rule=z.infer<typeof ruleSchema>;
export type CorporateAction=z.infer<typeof actionSchema>;
