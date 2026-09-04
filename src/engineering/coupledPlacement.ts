import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { RebarNetworkInput } from '../domain/rebarAnalysis';
import type { CompactionState } from './compaction';
import { analyzeCombinedGradation } from './combinedGradation';
import { evaluateEffectiveCompaction } from './effectiveCompaction';
import { finalAssessmentLevel, type FinalAssessmentLevel } from './finalAssessment';
import { evaluateLocalCompactionHeatmap } from './localCompactionHeatmap';
import type { PackingResult } from './packing';
import { analyzeRebarBridgeRisk } from './rebarBridgeRisk';
import { analyzeRebarPlacement } from './rebarPlacement';

export interface CoupledPlacementAssessment {
  score: number;
  level: FinalAssessmentLevel;
  labelFa: string;
  rankFa: string;
  effectiveCompactionScore: number;
  bridgeSafetyScore: number;
  localCompactionSafetyScore: number;
  aggregatePassingScore: number;
  vibratorAccessibilityScore: number;
  governingOpeningMm: number;
  bridgeRiskScore: number;
  bridgeCandidateSharePercent: number;
  bridgeCriticalSharePercent: number;
  rebarAffectedCells: number;
  criticalGateApplied: boolean;
  strengthsFa: string[];
  warningsFa: string[];
  method: 'tolue-coupled-placement-v1';
  heuristic: true;
}

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));

export function evaluateCoupledPlacement(
  mix: MixDesign,
  analysis: MixAnalysis,
  packing: PackingResult,
  compaction: CompactionState,
  network: RebarNetworkInput,
): CoupledPlacementAssessment {
  const combined=analyzeCombinedGradation(mix,analysis);
  const effective=evaluateEffectiveCompaction(analysis,packing,combined,compaction);
  const bridge=analyzeRebarBridgeRisk(packing,network);
  const heatmap=evaluateLocalCompactionHeatmap(analysis,packing,compaction,5,network);
  const rebar=analyzeRebarPlacement(mix,network);

  const bridgeSafetyScore=clamp(100-bridge.score);
  const localCompactionSafetyScore=clamp(100-heatmap.meanRisk);
  const aggregatePassingScore=clamp(rebar.aggregatePassingIndex);
  const vibratorAccessibilityScore=clamp(rebar.vibratorAccessibilityIndex);

  let score=clamp(
    effective.score*0.30+
    bridgeSafetyScore*0.25+
    localCompactionSafetyScore*0.20+
    aggregatePassingScore*0.15+
    vibratorAccessibilityScore*0.10,
  );

  const bridgeGate=bridge.level==='high' || bridge.criticalSharePercent>=8;
  const vibratorGate=vibratorAccessibilityScore<35;
  const effectiveGate=effective.level==='ineffective';
  const criticalGateApplied=bridgeGate || vibratorGate || effectiveGate;

  if(criticalGateApplied) score=Math.min(score,61);
  if((bridgeGate&&effectiveGate) || (bridge.criticalSharePercent>=15&&vibratorAccessibilityScore<35)) score=Math.min(score,44);

  const rounded=Math.round(score);
  const grade=finalAssessmentLevel(rounded);
  const strengthsFa:string[]=[];
  const warningsFa:string[]=[];

  if(effective.score>=78) strengthsFa.push('تراکم مؤثر طرح، پایه مناسبی برای اجرای بتن در شبکه آرماتور فراهم می‌کند.');
  else warningsFa.push('تراکم مؤثر طرح، پشتیبانی کامل از اجرای بتن در شبکه آرماتور را نشان نمی‌دهد.');
  if(bridge.level==='low') strengthsFa.push('ریسک هندسی پل‌زدگی ذرات در گلوگاه شبکه پایین ارزیابی شده است.');
  else warningsFa.push(`ریسک پل‌زدگی ${bridge.level==='high'?'بالا':'قابل توجه'} است؛ ${bridge.candidateSharePercent.toFixed(1)}٪ ذرات درشت در محدوده حساس قرار دارند.`);
  if(localCompactionSafetyScore>=70) strengthsFa.push('نقشه ریسک موضعی، شرایط نسبتاً مناسب اطراف شبکه را نشان می‌دهد.');
  else warningsFa.push(`${heatmap.rebarAffectedCells} سلول نقشه تراکم تحت تأثیر محدودیت هندسی آرماتور قرار گرفته‌اند.`);
  if(vibratorAccessibilityScore>=70) strengthsFa.push('دسترسی هندسی سر ویبراتور مناسب ارزیابی شده است.');
  else warningsFa.push('دسترسی سر ویبراتور محدود است و می‌تواند تحقق تراکم را کاهش دهد.');
  if(criticalGateApplied) warningsFa.push('به علت وجود عامل بحرانی، سقف نمره قابلیت اجرا اعمال شده است.');

  return {
    score:rounded,
    ...grade,
    effectiveCompactionScore:effective.score,
    bridgeSafetyScore:Math.round(bridgeSafetyScore),
    localCompactionSafetyScore:Math.round(localCompactionSafetyScore),
    aggregatePassingScore:Math.round(aggregatePassingScore),
    vibratorAccessibilityScore:Math.round(vibratorAccessibilityScore),
    governingOpeningMm:bridge.governingOpeningMm,
    bridgeRiskScore:bridge.score,
    bridgeCandidateSharePercent:bridge.candidateSharePercent,
    bridgeCriticalSharePercent:bridge.criticalSharePercent,
    rebarAffectedCells:heatmap.rebarAffectedCells,
    criticalGateApplied,
    strengthsFa,
    warningsFa,
    method:'tolue-coupled-placement-v1',
    heuristic:true,
  };
}
