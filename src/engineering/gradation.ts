import type { GradationCurve, GradationPoint } from '../domain/mixDesign';

export interface GradationBand {
  upperMm: number;
  lowerMm: number;
  retainedFraction: number;
}

export interface GradationAnalysis {
  valid: boolean;
  errors: string[];
  finenessModulus: number | null;
  d10: number | null;
  d30: number | null;
  d50: number | null;
  d60: number | null;
  cu: number | null;
  cc: number | null;
  bands: GradationBand[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function validateGradation(points: GradationPoint[]): string[] {
  const errors: string[] = [];
  if (points.length < 2) errors.push('At least two sieve points are required.');

  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    if (p.sieveMm <= 0) errors.push(`Sieve ${i + 1}: size must be > 0 mm.`);
    if (p.passingPercent < 0 || p.passingPercent > 100) errors.push(`Sieve ${p.sieveMm} mm: passing must be 0–100%.`);
    if (i > 0) {
      const prev = points[i - 1];
      if (p.sieveMm >= prev.sieveMm) errors.push('Sieve sizes must be strictly descending.');
      if (p.passingPercent > prev.passingPercent) errors.push('Passing percentage cannot increase toward smaller sieves.');
    }
  }
  return errors;
}

function percentileDiameter(points: GradationPoint[], targetPassing: number): number | null {
  const sorted = [...points].sort((a, b) => a.passingPercent - b.passingPercent);
  if (!sorted.length || targetPassing < sorted[0].passingPercent || targetPassing > sorted[sorted.length - 1].passingPercent) return null;

  for (let i = 1; i < sorted.length; i += 1) {
    const low = sorted[i - 1];
    const high = sorted[i];
    if (targetPassing >= low.passingPercent && targetPassing <= high.passingPercent) {
      if (high.passingPercent === low.passingPercent) return low.sieveMm;
      const t = (targetPassing - low.passingPercent) / (high.passingPercent - low.passingPercent);
      const logD = Math.log10(low.sieveMm) + t * (Math.log10(high.sieveMm) - Math.log10(low.sieveMm));
      return 10 ** logD;
    }
  }
  return null;
}

export function analyzeGradation(curve: GradationCurve): GradationAnalysis {
  const points = curve.points;
  const errors = validateGradation(points);
  const bands: GradationBand[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    bands.push({
      upperMm: points[i].sieveMm,
      lowerMm: points[i + 1].sieveMm,
      retainedFraction: clamp((points[i].passingPercent - points[i + 1].passingPercent) / 100, 0, 1),
    });
  }

  const d10 = percentileDiameter(points, 10);
  const d30 = percentileDiameter(points, 30);
  const d50 = percentileDiameter(points, 50);
  const d60 = percentileDiameter(points, 60);
  const cu = d10 && d60 ? d60 / d10 : null;
  const cc = d10 && d30 && d60 ? (d30 * d30) / (d10 * d60) : null;

  const fmSieves = [4.75, 2.36, 1.18, 0.6, 0.3, 0.15];
  const map = new Map(points.map((p) => [Number(p.sieveMm.toFixed(2)), p.passingPercent]));
  const fmValues = fmSieves.map((s) => map.get(Number(s.toFixed(2))));
  const finenessModulus = fmValues.every((v) => v !== undefined)
    ? fmValues.reduce<number>((sum, passing) => sum + (100 - (passing ?? 100)), 0) / 100
    : null;

  return { valid: errors.length === 0, errors, finenessModulus, d10, d30, d50, d60, cu, cc, bands };
}

export function sampleDiameterMm(curve: GradationCurve, randomValue: number): number {
  const analysis = analyzeGradation(curve);
  const active = analysis.bands.filter((b) => b.retainedFraction > 0);
  if (!active.length) return curve.points.at(-1)?.sieveMm ?? 1;

  const total = active.reduce((sum, b) => sum + b.retainedFraction, 0);
  let target = clamp(randomValue, 0, 0.999999) * total;
  for (const band of active) {
    target -= band.retainedFraction;
    if (target <= 0) {
      const local = clamp((randomValue * 1.61803398875) % 1, 0, 1);
      const logLow = Math.log(Math.max(0.01, band.lowerMm));
      const logHigh = Math.log(Math.max(0.011, band.upperMm));
      return Math.exp(logLow + local * (logHigh - logLow));
    }
  }
  return active[active.length - 1].lowerMm;
}
