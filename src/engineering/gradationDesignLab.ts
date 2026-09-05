import type { AggregateMaterialKey, GradationCurve, MixAnalysis, MixDesign } from '../domain/mixDesign';
import { analyzeCombinedGradation, type CombinedGradationPoint } from './combinedGradation';

export interface GradationBlendShares { sand:number; aggregate5to12:number; aggregate12to25:number; }
export interface GradationLabResult {
  shares: GradationBlendShares;
  points: CombinedGradationPoint[];
  continuityScore:number;
  packingProxyPercent:number;
  voidProxyPercent:number;
  pasteDemandIndex:number;
  riskScore:number;
  level:'good'|'attention'|'critical';
  noteFa:string;
}

const KEYS:AggregateMaterialKey[]=['sand','aggregate5to12','aggregate12to25'];
const clamp=(v:number,min=0,max=100)=>Math.max(min,Math.min(max,v));
const normalized=(shares:GradationBlendShares):GradationBlendShares=>{const s=Math.max(0,shares.sand),a=Math.max(0,shares.aggregate5to12),b=Math.max(0,shares.aggregate12to25),t=Math.max(1e-9,s+a+b);return{sand:s/t*100,aggregate5to12:a/t*100,aggregate12to25:b/t*100}};
function sortedCurve(curve:GradationCurve){return[...curve.points].filter(p=>p.sieveMm>0&&Number.isFinite(p.passingPercent)).sort((a,b)=>b.sieveMm-a.sieveMm)}
function passingAt(curve:GradationCurve,sieveMm:number){const p=sortedCurve(curve);if(!p.length)return null;if(sieveMm>=p[0].sieveMm)return clamp(p[0].passingPercent);if(sieveMm<=p[p.length-1].sieveMm)return clamp(p[p.length-1].passingPercent);for(let i=0;i<p.length-1;i++){const u=p[i],l=p[i+1];if(sieveMm<=u.sieveMm&&sieveMm>=l.sieveMm){const t=(Math.log(sieveMm)-Math.log(l.sieveMm))/Math.max(1e-9,Math.log(u.sieveMm)-Math.log(l.sieveMm));return clamp(l.passingPercent+(u.passingPercent-l.passingPercent)*t)}}return null}

export function baselineGradationShares(mix:MixDesign,analysis:MixAnalysis):GradationBlendShares{
 const r=analyzeCombinedGradation(mix,analysis);const get=(k:AggregateMaterialKey)=>r.shares.find(s=>s.materialKey===k)?.sharePercent??0;return normalized({sand:get('sand'),aggregate5to12:get('aggregate5to12'),aggregate12to25:get('aggregate12to25')});
}

export function evaluateGradationDesignLab(mix:MixDesign,analysis:MixAnalysis,input:GradationBlendShares):GradationLabResult{
 const shares=normalized(input);const curves=KEYS.map(k=>mix.gradations.find(g=>g.materialKey===k)).filter((g):g is GradationCurve=>Boolean(g));const sieves=[...new Set(curves.flatMap(c=>c.points.map(p=>Number(p.sieveMm.toFixed(4)))))].filter(v=>v>0).sort((a,b)=>b-a);
 const raw=sieves.map(sieveMm=>{let w=0,represented=0;for(const key of KEYS){const curve=curves.find(c=>c.materialKey===key);if(!curve)continue;const p=passingAt(curve,sieveMm);if(p===null)continue;const f=shares[key]/100;w+=p*f;represented+=f}return{sieveMm,passingPercent:represented?clamp(w/represented):0}});
 const points:CombinedGradationPoint[]=raw.map((p,i)=>({...p,retainedPercentToNext:raw[i+1]?Math.max(0,p.passingPercent-raw[i+1].passingPercent):null}));
 let gapPenalty=0;for(let i=0;i<points.length-1;i++){const retained=points[i].retainedPercentToNext??0,ratio=points[i].sieveMm/Math.max(1e-6,points[i+1].sieveMm);if(ratio>=1.85&&retained<2)gapPenalty+=18;else if(ratio>=1.55&&retained<4)gapPenalty+=8}
 const continuityScore=Math.round(clamp(100-gapPenalty));
 const fines=points.find(p=>Math.abs(p.sieveMm-0.3)<0.08)?.passingPercent??shares.sand*.55;
 const mid=points.find(p=>Math.abs(p.sieveMm-4.75)<1)?.passingPercent??shares.sand;
 const balancePenalty=Math.abs(shares.sand-42)*.65+Math.abs(shares.aggregate5to12-28)*.3+Math.abs(shares.aggregate12to25-30)*.25;
 const packingProxyPercent=clamp(analysis.aggregateVolumeM3*100+(continuityScore-70)*.08-balancePenalty*.08,45,86);
 const voidProxyPercent=clamp(100-packingProxyPercent,10,55);
 const pasteDemandIndex=Math.round(clamp(35+fines*.34+Math.max(0,mid-55)*.42+voidProxyPercent*.55,0,100));
 const riskScore=Math.round(clamp((100-continuityScore)*.55+Math.max(0,pasteDemandIndex-55)*.45+balancePenalty*.35));
 const level=riskScore>=52?'critical':riskScore>=28?'attention':'good';
 return{shares,points,continuityScore,packingProxyPercent:Number(packingProxyPercent.toFixed(1)),voidProxyPercent:Number(voidProxyPercent.toFixed(1)),pasteDemandIndex,riskScore,level,noteFa:'Design Lab یک ابزار مقایسه‌ای Heuristic داخلی TOLUE است. Packing، Void و Paste Demand در این بخش شاخص‌های نماینده برای غربالگری Blend هستند و جایگزین Trial Mix، آزمایش دانه‌بندی یا مدل تراکم فیزیکی اعتبارسنجی‌شده نیستند.'};
}
