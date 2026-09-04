import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { PackingResult } from './packing';

export interface ComparisonMetric {
  key: string;
  label: string;
  unit: string;
  a: number;
  b: number;
  delta: number;
  deltaPercent: number | null;
  preference: 'higher' | 'lower' | 'neutral';
}

export function createVariantMix(base: MixDesign): MixDesign {
  return {
    ...base,
    id: `${base.id}-variant-b`,
    name: 'Variant Mix B',
    materials: base.materials.map((material) => {
      if (material.key === 'water') return { ...material, massKgPerM3: Math.max(0, material.massKgPerM3 - 10) };
      if (material.key === 'cement') return { ...material, massKgPerM3: material.massKgPerM3 + 15 };
      if (material.key === 'sand') return { ...material, massKgPerM3: material.massKgPerM3 + 35 };
      if (material.key === 'aggregate12to25') return { ...material, massKgPerM3: Math.max(0, material.massKgPerM3 - 40) };
      return { ...material };
    }),
    gradations: base.gradations.map((curve) => ({ ...curve, points: curve.points.map((point) => ({ ...point })) })),
  };
}

function metric(key: string, label: string, unit: string, a: number, b: number, preference: ComparisonMetric['preference']): ComparisonMetric {
  const delta = b - a;
  return {
    key,
    label,
    unit,
    a,
    b,
    delta,
    deltaPercent: Math.abs(a) > 1e-9 ? (delta / a) * 100 : null,
    preference,
  };
}

export function compareMixes(aAnalysis: MixAnalysis, aPacking: PackingResult, bAnalysis: MixAnalysis, bPacking: PackingResult): ComparisonMetric[] {
  return [
    metric('packing', 'Packing density', '%', aPacking.packingDensity * 100, bPacking.packingDensity * 100, 'higher'),
    metric('voidRatio', 'Void ratio e', '', aPacking.voidRatio, bPacking.voidRatio, 'lower'),
    metric('voidFraction', 'Void fraction', '%', aPacking.voidFraction * 100, bPacking.voidFraction * 100, 'lower'),
    metric('paste', 'Paste volume', 'm³', aAnalysis.pasteVolumeM3, bAnalysis.pasteVolumeM3, 'neutral'),
    metric('aggregate', 'Aggregate volume', 'm³', aAnalysis.aggregateVolumeM3, bAnalysis.aggregateVolumeM3, 'neutral'),
    metric('wcm', 'w/cm', '', aAnalysis.wCm, bAnalysis.wCm, 'lower'),
  ];
}
