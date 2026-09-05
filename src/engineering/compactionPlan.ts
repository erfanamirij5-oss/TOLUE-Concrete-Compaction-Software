import type { RebarNetworkInput } from '../domain/rebarAnalysis';
import type { PackingResult } from './packing';

export interface CompactionPlanInput { pokerDiameterMm:number; radiusFactor:number; insertionSpacingMm:number; vibrationSeconds:number; liftThicknessMm:number; }
export interface CompactionInsertion { key:string; x:number; z:number; coverageRadiusM:number; overlapIndex:number; edgeRisk:boolean; }
export interface CompactionPlanResult { insertions:CompactionInsertion[]; radiusOfInfluenceMm:number; coveragePercent:number; overlapPercent:number; deadZonePercent:number; accessRiskPercent:number; score:number; level:'good'|'attention'|'critical'; noteFa:string; }
export const defaultCompactionPlan:CompactionPlanInput={pokerDiameterMm:38,radiusFactor:5,insertionSpacingMm:180,vibrationSeconds:8,liftThicknessMm:300};
const clamp=(v:number,min=0,max=100)=>Math.max(min,Math.min(max,v));
export function evaluateCompactionPlan(input:CompactionPlanInput,network:RebarNetworkInput,packing:PackingResult):CompactionPlanResult{
 const radiusMm=Math.max(input.pokerDiameterMm*2,Math.min(400,input.pokerDiameterMm*Math.max(2.5,Math.min(8,input.radiusFactor))));
 const spacing=Math.max(80,Math.min(500,input.insertionSpacingMm));const cover=Math.max(20,network.coverMm);const usableMm=Math.max(300,1000-cover*2);const half=usableMm/2;
 const coords:number[]=[];for(let v=-half+spacing/2;v<=half-spacing/2+1;v+=spacing)coords.push(v/1000);if(!coords.length)coords.push(0);
 const overlapRatio=Math.max(0,(radiusMm*2-spacing)/(radiusMm*2));const insertions=coords.flatMap((x,xi)=>coords.map((z,zi)=>({key:`${xi}-${zi}`,x,z,coverageRadiusM:radiusMm/1000,overlapIndex:clamp(overlapRatio*100),edgeRisk:Math.abs(x)>.34||Math.abs(z)>.34})));
 const cell=20,total=cell*cell;let covered=0,doubleCovered=0;for(let ix=0;ix<cell;ix++)for(let iz=0;iz<cell;iz++){const x=-.5+(ix+.5)/cell,z=-.5+(iz+.5)/cell;const hits=insertions.filter(p=>Math.hypot(x-p.x,z-p.z)<=p.coverageRadiusM).length;if(hits>0)covered++;if(hits>1)doubleCovered++;}
 const coverage=covered/total*100,dead=100-coverage,overlap=doubleCovered/total*100;const clearX=Math.max(1,network.x.centerSpacingMm-network.x.barDiameterMm),clearY=Math.max(1,network.y.centerSpacingMm-network.y.barDiameterMm),opening=Math.min(clearX,clearY,network.layers>1?network.clearLayerSpacingMm:Infinity);const accessRisk=clamp((input.pokerDiameterMm-opening)/Math.max(1,input.pokerDiameterMm)*100+Math.max(0,input.liftThicknessMm-radiusMm*1.65)*.18);const dmax=Math.max(1,...packing.particles.map(p=>p.diameterMm||0));const aggPenalty=clamp((dmax/Math.max(1,opening)-.55)*90);const timePenalty=input.vibrationSeconds<4?45:input.vibrationSeconds>20?28:0;const score=Math.round(clamp(100-dead*.8-accessRisk*.55-aggPenalty*.25-timePenalty*.25-Math.max(0,overlap-75)*.15));const level=score>=78?'good':score>=55?'attention':'critical';
 return{insertions,radiusOfInfluenceMm:radiusMm,coveragePercent:Number(coverage.toFixed(1)),overlapPercent:Number(overlap.toFixed(1)),deadZonePercent:Number(dead.toFixed(1)),accessRiskPercent:Number(accessRisk.toFixed(1)),score,level,noteFa:'این برنامه تراکم، مدل برنامه‌ریزی هندسی/Heuristic داخلی TOLUE است. شعاع اثر واقعی ویبراتور به اسلامپ، رئولوژی، نوع دستگاه، فرکانس، هندسه عضو و روش اجرا وابسته است و باید با Trial Placement یا دستورالعمل تجهیز تأیید شود.'};
}
