import type { MixAnalysis } from '../domain/mixDesign';
import type { CompactionState } from './compaction';
import type { PackingResult } from './packing';
import type { ComplianceSummary } from './referenceCompliance';

export type HealthLevel = 'good' | 'attention' | 'critical';

export interface EngineeringHealth {
  score: number;
  level: HealthLevel;
  labelFa: string;
  packingScore: number;
  volumetricScore: number;
  gradationScore: number;
  compactionScore: number;
  riskIntensity: number;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export function evaluateEngineeringHealth(
  analysis: MixAnalysis,
  packing: PackingResult,
  compaction: CompactionState,
  compliance?: ComplianceSummary,
): EngineeringHealth {
  const packingScore = clamp(((packing.packingDensity - 0.50) / 0.20) * 100);
  const closurePenalty = Math.min(100, Math.abs(analysis.volumeClosureErrorPercent) * 10);
  const wcmPenalty = analysis.wCm <= 0.50 ? 0 : Math.min(100, (analysis.wCm - 0.50) * 280);
  const volumetricScore = clamp(100 - closurePenalty * 0.65 - wcmPenalty * 0.35);
  const gradationScore = compliance ? compliance.score : 100;
  const compactionScore = clamp(35 + compaction.progress * 65);

  const score = Math.round(
    packingScore * 0.32 +
    volumetricScore * 0.24 +
    gradationScore * 0.30 +
    compactionScore * 0.14,
  );

  const level: HealthLevel = score >= 78 ? 'good' : score >= 55 ? 'attention' : 'critical';
  const labelFa = level === 'good' ? 'وضعیت مناسب' : level === 'attention' ? 'نیازمند بررسی' : 'وضعیت بحرانی';

  return {
    score,
    level,
    labelFa,
    packingScore: Math.round(packingScore),
    volumetricScore: Math.round(volumetricScore),
    gradationScore: Math.round(gradationScore),
    compactionScore: Math.round(compactionScore),
    riskIntensity: clamp(100 - score) / 100,
  };
}
