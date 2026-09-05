import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { PackingResult } from './packing';
import type { CompactionState } from './compaction';
import type { DiagnosticSummary } from './diagnostics';
import type { ComplianceSummary } from './referenceCompliance';
import { analyzeCombinedGradation } from './combinedGradation';

export interface EngineeringResultCenter {
  score:number; level:'good'|'attention'|'critical'; readiness:string;
  kpis:{label:string;value:string;state:'good'|'attention'|'critical'}[];
  priorities:string[];
  riskCount:number;
  noteFa:string;
}
const clamp=(v:number)=>Math.max(0,Math.min(100,v));
export function buildEngineeringResultCenter(mix:MixDesign,analysis:MixAnalysis,packing:PackingResult,compaction:CompactionState,diagnostics:DiagnosticSummary,compliance:ComplianceSummary):EngineeringResultCenter{
 const combined=analyzeCombinedGradation(mix,analysis);const closure=Math.abs(analysis.volumeClosureErrorPercent);const packingPct=compaction.packingDensity*100;const voidPct=compaction.voidFraction*100;
 const risks=(closure>3?1:0)+(combined.continuityScore<78?1:0)+(compliance.issues.length?1:0)+(diagnostics.score<78?1:0)+(compaction.progress<.999?1:0);
 const score=Math.round(clamp(diagnostics.score*.34+combined.continuityScore*.22+clamp(packingPct)*.20+clamp(100-closure*8)*.14+clamp(100-voidPct)*.10));
 const level=score>=82&&risks<=1?'good':score>=62&&risks<=3?'attention':'critical';
 const priorities:string[]=[];
 if(compaction.progress<.999)priorities.push('ابتدا شبیه‌سازی تراکم را کامل کنید تا قضاوت نهایی بر وضعیت متراکم انجام شود.');
 if(closure>3)priorities.push(`بستن حجم طرح را بازبینی کنید؛ خطای فعلی ${closure.toFixed(1)}٪ است.`);
 if(compliance.issues.length)priorities.push(`${compliance.issues.length} مغایرت دانه‌بندی مرجع را پیش از تثبیت Trial Mix بررسی کنید.`);
 if(combined.continuityScore<78)priorities.push(`پیوستگی دانه‌بندی مرکب با امتیاز ${combined.continuityScore} نیازمند اصلاح Blend است.`);
 if(diagnostics.score<78)priorities.push(`تشخیص‌های مهندسی با امتیاز ${diagnostics.score}/100 را در Trial Mix کنترل کنید.`);
 if(priorities.length<3)priorities.push('سناریوی اجرایی ویبره، دسترسی میان آرماتورها و ریسک پل‌زدگی را با شرایط واقعی عضو تطبیق دهید.');
 if(priorities.length<3)priorities.push('نتیجه را با Trial Mix / Trial Placement و داده‌های واقعی پروژه تأیید کنید.');
 const state=(bad:boolean,warn:boolean=false):'good'|'attention'|'critical'=>bad?'critical':warn?'attention':'good';
 return{score,level,readiness:compaction.progress>=.999?'نتیجه شبیه‌سازی آماده جمع‌بندی':'جمع‌بندی موقت تا تکمیل تراکم',riskCount:risks,priorities:priorities.slice(0,3),kpis:[
  {label:'Packing',value:`${packingPct.toFixed(1)}٪`,state:state(packingPct<55,packingPct<62)},
  {label:'Void',value:`${voidPct.toFixed(1)}٪`,state:state(voidPct>42,voidPct>35)},
  {label:'Gradation',value:`${combined.continuityScore}/100`,state:state(combined.continuityScore<62,combined.continuityScore<78)},
  {label:'Volume Closure',value:`${closure.toFixed(1)}٪`,state:state(closure>3,closure>1.5)},
  {label:'Diagnostics',value:`${diagnostics.score}/100`,state:state(diagnostics.score<62,diagnostics.score<78)},
  {label:'Reference',value:compliance.issues.length?`${compliance.issues.length} مورد`:'مناسب',state:state(compliance.issues.length>3,compliance.issues.length>0)}
 ],noteFa:'Engineering Result Center یک جمع‌بندی تصمیم‌یار از خروجی‌های داخلی TOLUE است؛ شاخص‌های Heuristic جایگزین کنترل آیین‌نامه‌ای، آزمایشگاهی یا Trial Mix نیستند.'};
}
