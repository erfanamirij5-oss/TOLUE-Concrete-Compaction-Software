import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { CompactionState } from './compaction';
import type { DiagnosticSummary } from './diagnostics';
import type { PackingResult } from './packing';
import type { ComplianceSummary } from './referenceCompliance';
import { analyzeCombinedGradation } from './combinedGradation';
import { evaluateEffectiveCompaction } from './effectiveCompaction';

export type FinalAssessmentLevel = 'excellent' | 'good' | 'conditional' | 'weak' | 'critical';

export interface FinalAssessment {
  score: number;
  level: FinalAssessmentLevel;
  labelFa: string;
  rankFa: string;
  effectiveCompactionScore: number;
  diagnosticsScore: number;
  gradationScore: number;
  packingScore: number;
  volumetricScore: number;
  criticalGateApplied: boolean;
  strengthsFa: string[];
  warningsFa: string[];
  method: 'tolue-final-assessment-v1';
  heuristic: true;
}

const clamp=(v:number,min=0,max=100)=>Math.max(min,Math.min(max,v));

export function finalAssessmentLevel(score:number): Pick<FinalAssessment,'level'|'labelFa'|'rankFa'> {
  if(score>=90) return {level:'excellent',labelFa:'عالی',rankFa:'سطح A'};
  if(score>=78) return {level:'good',labelFa:'مناسب',rankFa:'سطح B'};
  if(score>=62) return {level:'conditional',labelFa:'قابل‌قبول مشروط',rankFa:'سطح C'};
  if(score>=45) return {level:'weak',labelFa:'ضعیف',rankFa:'سطح D'};
  return {level:'critical',labelFa:'بحرانی',rankFa:'سطح E'};
}

export function evaluateFinalAssessment(
  mix:MixDesign,
  analysis:MixAnalysis,
  packing:PackingResult,
  diagnostics:DiagnosticSummary,
  compliance:ComplianceSummary,
  compaction?:CompactionState,
):FinalAssessment {
  const combined=analyzeCombinedGradation(mix,analysis);
  const effective=evaluateEffectiveCompaction(analysis,packing,combined,compaction);
  const packingScore=clamp(((packing.packingDensity-0.52)/0.18)*100);
  const volumetricScore=clamp(100-Math.abs(analysis.volumeClosureErrorPercent)*10);
  const gradationScore=clamp(combined.continuityScore*0.58+compliance.score*0.42);

  let score=clamp(
    effective.score*0.38+
    diagnostics.score*0.22+
    gradationScore*0.22+
    packingScore*0.10+
    volumetricScore*0.08,
  );

  const severeGap=combined.gaps.some(g=>g.severity==='critical');
  const criticalGateApplied=diagnostics.critical>0 || effective.level==='ineffective' || severeGap || Math.abs(analysis.volumeClosureErrorPercent)>6;
  if(criticalGateApplied) score=Math.min(score,61);
  if(diagnostics.critical>=2 || (effective.level==='ineffective'&&severeGap)) score=Math.min(score,44);

  const rounded=Math.round(score);
  const level=finalAssessmentLevel(rounded);
  const strengthsFa:string[]=[];
  const warningsFa:string[]=[];
  if(effective.score>=78) strengthsFa.push('تراکم مؤثر طرح در مدل داخلی مناسب ارزیابی شده است.');
  else warningsFa.push('تراکم مؤثر طرح نیازمند بررسی یا اصلاح است.');
  if(gradationScore>=80) strengthsFa.push('پیوستگی دانه‌بندی و کنترل مرجع داخلی وضعیت مناسبی دارد.');
  else warningsFa.push('دانه‌بندی مرکب یا محدوده مرجع داخلی امتیاز طرح را کاهش داده است.');
  if(packingScore>=75) strengthsFa.push('پتانسیل بسته‌بندی سنگدانه‌ها مناسب است.');
  if(diagnostics.critical>0) warningsFa.push(`${diagnostics.critical} هشدار بحرانی مهندسی فعال است؛ سقف نمره نهایی اعمال شد.`);
  if(severeGap) warningsFa.push('گپ بحرانی در دانه‌بندی مرکب شناسایی شده و سقف نمره اعمال شده است.');
  if(Math.abs(analysis.volumeClosureErrorPercent)>6) warningsFa.push('خطای بسته‌شدن حجم بالا است و اعتبار ارزیابی را محدود می‌کند.');

  return {
    score:rounded,
    ...level,
    effectiveCompactionScore:effective.score,
    diagnosticsScore:diagnostics.score,
    gradationScore:Math.round(gradationScore),
    packingScore:Math.round(packingScore),
    volumetricScore:Math.round(volumetricScore),
    criticalGateApplied,
    strengthsFa,
    warningsFa,
    method:'tolue-final-assessment-v1',
    heuristic:true,
  };
}
