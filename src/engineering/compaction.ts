import type { PackingResult } from './packing';

export type CompactionStage = 'loose' | 'vibrating' | 'compacted';

export interface CompactionState {
  stage: CompactionStage;
  progress: number;
  settlementFactor: number;
  lateralVibration: number;
  packingDensity: number;
  voidFraction: number;
  voidRatio: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function evaluateCompaction(packing: PackingResult, progressInput: number): CompactionState {
  const progress = clamp(progressInput, 0, 1);
  const stage: CompactionStage = progress <= 0.02 ? 'loose' : progress < 0.98 ? 'vibrating' : 'compacted';

  const densityGainPotential = Math.max(0.015, Math.min(0.085, 0.705 - packing.packingDensity));
  const eased = 1 - Math.pow(1 - progress, 2.2);
  const packingDensity = clamp(packing.packingDensity + densityGainPotential * eased, packing.packingDensity, 0.72);
  const voidFraction = 1 - packingDensity;
  const voidRatio = voidFraction / packingDensity;

  return {
    stage,
    progress,
    settlementFactor: 1 - 0.14 * eased,
    lateralVibration: stage === 'vibrating' ? (1 - progress) * 0.012 + 0.002 : 0,
    packingDensity,
    voidFraction,
    voidRatio,
  };
}
