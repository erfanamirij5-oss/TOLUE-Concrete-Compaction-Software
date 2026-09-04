import type { ConcreteProject } from '../domain/project';
import { analyzeMix } from './analyzeMix';
import { evaluateCompaction } from './compaction';
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
  wCm: number;
  packingDensity: number;
  voidFraction: number;
  closureErrorPercent: number;
}

export interface ProjectAssessment {
  mixes: ProjectMixAssessment[];
  averageScore: number;
  bestMixId: string | null;
  weakestMixId: string | null;
  method: 'tolue-project-assessment-v1';
  evaluationSeed: number;
  noteFa: string;
}

export function evaluateProjectAssessment(project: ConcreteProject, seed = 20260905): ProjectAssessment {
  const mixes = project.mixes.map((mix) => {
    const analysis = analyzeMix(mix);
    const packing = generatePacking(mix, analysis, seed);
    const compaction = evaluateCompaction(packing, 1);
    const diagnostics = diagnoseMix(mix, analysis, packing);
    const compliance = evaluateReferenceCompliance(mix);
    const assessment = evaluateFinalAssessment(mix, analysis, packing, diagnostics, compliance, compaction);
    return {
      mixId: mix.id,
      mixName: mix.name,
      score: assessment.score,
      labelFa: assessment.labelFa,
      rankFa: assessment.rankFa,
      assessment,
      wCm: analysis.wCm,
      packingDensity: packing.packingDensity,
      voidFraction: packing.voidFraction,
      closureErrorPercent: analysis.volumeClosureErrorPercent,
    };
  }).sort((a,b)=>b.score-a.score);

  return {
    mixes,
    averageScore: mixes.length ? Math.round(mixes.reduce((sum,item)=>sum+item.score,0)/mixes.length) : 0,
    bestMixId: mixes[0]?.mixId ?? null,
    weakestMixId: mixes[mixes.length-1]?.mixId ?? null,
    method:'tolue-project-assessment-v1',
    evaluationSeed: seed,
    noteFa:'برای مقایسه منصفانه، همه طرح‌ها با Seed یکسان و وضعیت تراکم تکمیل‌شده مدل داخلی ارزیابی شده‌اند. این رتبه‌بندی جایگزین نتایج آزمایشگاهی یا کنترل استاندارد رسمی نیست.',
  };
}
