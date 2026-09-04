import type { ConcreteProject } from '../domain/project';
import { defaultRebarNetwork, type RebarNetworkInput } from '../domain/rebarAnalysis';
import { analyzeMix } from './analyzeMix';
import { evaluateCompaction } from './compaction';
import { evaluateCoupledPlacement, type CoupledPlacementAssessment } from './coupledPlacement';
import { diagnoseMix } from './diagnostics';
import { evaluateFinalAssessment, type FinalAssessment } from './finalAssessment';
import { generatePacking } from './packing';
import { evaluateReferenceCompliance } from './referenceCompliance';

export interface ProjectMixAssessment {
  mixId: string;
  mixName: string;
  score: number;
  labelFa: string;
  rankFa: string;
  assessment: FinalAssessment;
  placementAssessment: CoupledPlacementAssessment;
  wCm: number;
  packingDensity: number;
  voidFraction: number;
  closureErrorPercent: number;
}

export interface ProjectAssessment {
  mixes: ProjectMixAssessment[];
  averageScore: number;
  averagePlacementScore: number;
  bestMixId: string | null;
  weakestMixId: string | null;
  bestPlacementMixId: string | null;
  weakestPlacementMixId: string | null;
  method: 'tolue-project-assessment-v2';
  evaluationSeed: number;
  rebarScenario: RebarNetworkInput;
  noteFa: string;
}

export function evaluateProjectAssessment(
  project: ConcreteProject,
  seed = 20260905,
  rebarScenario: RebarNetworkInput = defaultRebarNetwork,
): ProjectAssessment {
  const mixes = project.mixes.map((mix) => {
    const analysis = analyzeMix(mix);
    const packing = generatePacking(mix, analysis, seed);
    const compaction = evaluateCompaction(packing, 1);
    const diagnostics = diagnoseMix(mix, analysis, packing);
    const compliance = evaluateReferenceCompliance(mix);
    const assessment = evaluateFinalAssessment(mix, analysis, packing, diagnostics, compliance, compaction);
    const placementAssessment = evaluateCoupledPlacement(mix, analysis, packing, compaction, rebarScenario);
    return {
      mixId: mix.id,
      mixName: mix.name,
      score: assessment.score,
      labelFa: assessment.labelFa,
      rankFa: assessment.rankFa,
      assessment,
      placementAssessment,
      wCm: analysis.wCm,
      packingDensity: packing.packingDensity,
      voidFraction: packing.voidFraction,
      closureErrorPercent: analysis.volumeClosureErrorPercent,
    };
  }).sort((a,b)=>b.score-a.score);

  const byPlacement=[...mixes].sort((a,b)=>b.placementAssessment.score-a.placementAssessment.score);

  return {
    mixes,
    averageScore: mixes.length ? Math.round(mixes.reduce((sum,item)=>sum+item.score,0)/mixes.length) : 0,
    averagePlacementScore: mixes.length ? Math.round(mixes.reduce((sum,item)=>sum+item.placementAssessment.score,0)/mixes.length) : 0,
    bestMixId: mixes[0]?.mixId ?? null,
    weakestMixId: mixes[mixes.length-1]?.mixId ?? null,
    bestPlacementMixId: byPlacement[0]?.mixId ?? null,
    weakestPlacementMixId: byPlacement[byPlacement.length-1]?.mixId ?? null,
    method:'tolue-project-assessment-v2',
    evaluationSeed: seed,
    rebarScenario,
    noteFa:'برای مقایسه منصفانه، همه طرح‌ها با Seed یکسان، تراکم تکمیل‌شده و یک سناریوی آرماتور یکسان ارزیابی شده‌اند. نمره بتن و نمره قابلیت اجرا در آرماتور، مدل مهندسی داخلی TOLUE هستند و جایگزین آزمایش یا کنترل استاندارد رسمی نیستند.',
  };
}
