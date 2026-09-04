import type { AggregateMaterialKey, GradationCurve, MixAnalysis, MixDesign } from '../domain/mixDesign';

export interface CombinedGradationPoint {
  sieveMm: number;
  passingPercent: number;
  retainedPercentToNext: number | null;
}

export interface AggregateBlendShare {
  materialKey: AggregateMaterialKey;
  labelFa: string;
  absoluteVolumeM3: number;
  sharePercent: number;
}

export interface CombinedGradationGap {
  upperSieveMm: number;
  lowerSieveMm: number;
  retainedPercent: number;
  sizeRatio: number;
  severity: 'attention' | 'critical';
  messageFa: string;
}

export interface CombinedGradationResult {
  basis: 'absolute-volume';
  basisLabelFa: string;
  points: CombinedGradationPoint[];
  shares: AggregateBlendShare[];
  gaps: CombinedGradationGap[];
  continuityScore: number;
  valid: boolean;
  warningsFa: string[];
  method: 'tolue-combined-gradation-v1';
}

const LABELS: Record<AggregateMaterialKey, string> = {
  sand: 'ماسه',
  aggregate5to12: 'نخودی ۴٫۷۵–۱۲',
  aggregate12to25: 'بادامی ۱۲–۲۵',
};

const AGGREGATE_KEYS: AggregateMaterialKey[] = ['sand', 'aggregate5to12', 'aggregate12to25'];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function sortedCurve(curve: GradationCurve) {
  return [...curve.points]
    .filter((point) => Number.isFinite(point.sieveMm) && point.sieveMm > 0 && Number.isFinite(point.passingPercent))
    .sort((a, b) => b.sieveMm - a.sieveMm);
}

/** Log-sieve interpolation is used because sieve series are approximately geometric. */
function passingAt(curve: GradationCurve, sieveMm: number) {
  const points = sortedCurve(curve);
  if (!points.length) return null;
  if (sieveMm >= points[0].sieveMm) return clamp(points[0].passingPercent, 0, 100);
  if (sieveMm <= points[points.length - 1].sieveMm) return clamp(points[points.length - 1].passingPercent, 0, 100);

  for (let index = 0; index < points.length - 1; index += 1) {
    const upper = points[index];
    const lower = points[index + 1];
    if (sieveMm <= upper.sieveMm && sieveMm >= lower.sieveMm) {
      const logUpper = Math.log(upper.sieveMm);
      const logLower = Math.log(lower.sieveMm);
      const t = (Math.log(sieveMm) - logLower) / Math.max(1e-9, logUpper - logLower);
      return clamp(lower.passingPercent + (upper.passingPercent - lower.passingPercent) * t, 0, 100);
    }
  }
  return null;
}

function uniqueSieves(curves: GradationCurve[]) {
  const values = curves.flatMap((curve) => curve.points.map((point) => point.sieveMm)).filter((value) => value > 0 && Number.isFinite(value));
  return [...new Set(values.map((value) => Number(value.toFixed(4))))].sort((a, b) => b - a);
}

export function analyzeCombinedGradation(mix: MixDesign, analysis: MixAnalysis): CombinedGradationResult {
  const warningsFa: string[] = [];
  const curves = AGGREGATE_KEYS.map((key) => mix.gradations.find((curve) => curve.materialKey === key)).filter((curve): curve is GradationCurve => Boolean(curve));
  const aggregateVolumes = AGGREGATE_KEYS.map((materialKey) => ({
    materialKey,
    absoluteVolumeM3: analysis.materials.find((material) => material.key === materialKey)?.absoluteVolumeM3 ?? 0,
  }));
  const totalAggregateVolume = aggregateVolumes.reduce((sum, item) => sum + item.absoluteVolumeM3, 0);

  const shares: AggregateBlendShare[] = aggregateVolumes.map((item) => ({
    materialKey: item.materialKey,
    labelFa: LABELS[item.materialKey],
    absoluteVolumeM3: item.absoluteVolumeM3,
    sharePercent: totalAggregateVolume > 0 ? (item.absoluteVolumeM3 / totalAggregateVolume) * 100 : 0,
  }));

  if (curves.length !== AGGREGATE_KEYS.length) warningsFa.push('برای تشکیل منحنی مرکب، دانه‌بندی هر سه بخش ماسه، نخودی و بادامی لازم است.');
  if (totalAggregateVolume <= 0) warningsFa.push('حجم سنگدانه برای تشکیل منحنی مرکب معتبر نیست.');

  const sieves = uniqueSieves(curves);
  const rawPoints = sieves.map((sieveMm) => {
    let weightedPassing = 0;
    let representedShare = 0;
    for (const share of shares) {
      const curve = curves.find((item) => item.materialKey === share.materialKey);
      if (!curve) continue;
      const passing = passingAt(curve, sieveMm);
      if (passing === null) continue;
      const fraction = share.sharePercent / 100;
      weightedPassing += passing * fraction;
      representedShare += fraction;
    }
    return {
      sieveMm,
      passingPercent: representedShare > 0 ? clamp(weightedPassing / representedShare, 0, 100) : 0,
    };
  });

  const points: CombinedGradationPoint[] = rawPoints.map((point, index) => {
    const next = rawPoints[index + 1];
    return {
      ...point,
      retainedPercentToNext: next ? Math.max(0, point.passingPercent - next.passingPercent) : null,
    };
  });

  const gaps: CombinedGradationGap[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const upper = points[index];
    const lower = points[index + 1];
    const retained = upper.retainedPercentToNext ?? 0;
    const ratio = upper.sieveMm / Math.max(lower.sieveMm, 1e-6);
    // Internal engineering heuristic only: a wide size interval carrying very little retained aggregate is treated as a potential grading gap.
    const critical = ratio >= 1.85 && retained < 2.0;
    const attention = ratio >= 1.55 && retained < 4.0;
    if (critical || attention) {
      gaps.push({
        upperSieveMm: upper.sieveMm,
        lowerSieveMm: lower.sieveMm,
        retainedPercent: retained,
        sizeRatio: ratio,
        severity: critical ? 'critical' : 'attention',
        messageFa: `در بازه ${lower.sieveMm} تا ${upper.sieveMm} میلی‌متر سهم نگه‌داشته‌شده فقط ${retained.toFixed(1)}٪ است؛ پیوستگی این رده اندازه نیازمند بررسی است.`,
      });
    }
  }

  const totalGapPenalty = gaps.reduce((sum, gap) => sum + (gap.severity === 'critical' ? 18 : 8), 0);
  const monotonicPenalty = points.slice(1).reduce((sum, point, index) => sum + (point.passingPercent > points[index].passingPercent + 0.5 ? 20 : 0), 0);
  const continuityScore = clamp(100 - totalGapPenalty - monotonicPenalty, 0, 100);

  return {
    basis: 'absolute-volume',
    basisLabelFa: 'وزن‌دهی بر اساس حجم مطلق واقعی سنگدانه‌ها',
    points,
    shares,
    gaps,
    continuityScore,
    valid: warningsFa.length === 0 && points.length >= 2,
    warningsFa,
    method: 'tolue-combined-gradation-v1',
  };
}
