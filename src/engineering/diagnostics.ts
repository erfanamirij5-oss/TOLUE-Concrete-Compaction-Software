import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { PackingResult } from './packing';
import { analyzeGradation } from './gradation';

export type DiagnosticSeverity = 'info' | 'warning' | 'critical';

export interface DiagnosticItem {
  id: string;
  severity: DiagnosticSeverity;
  title: string;
  observation: string;
  consequence: string;
  cause: string;
  recommendation: string;
  evidence: string[];
}

export interface DiagnosticSummary {
  score: number;
  critical: number;
  warnings: number;
  items: DiagnosticItem[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function diagnoseMix(mix: MixDesign, analysis: MixAnalysis, packing: PackingResult): DiagnosticSummary {
  const items: DiagnosticItem[] = [];
  const gradations = mix.gradations.map((curve) => ({ curve, result: analyzeGradation(curve) }));
  const sand = analysis.materials.find((m) => m.key === 'sand');
  const totalAgg = Math.max(0.0001, analysis.aggregateVolumeM3);
  const fineFraction = (sand?.absoluteVolumeM3 ?? 0) / totalAgg;
  const pasteFraction = analysis.pasteVolumeM3;

  if (packing.packingDensity < 0.58) {
    items.push({
      id: 'packing-low', severity: packing.packingDensity < 0.55 ? 'critical' : 'warning', title: 'Low packing density',
      observation: `Estimated packing density is ${(packing.packingDensity * 100).toFixed(1)}%.`,
      consequence: 'Higher inter-particle void demand can increase required paste, shrinkage potential and sensitivity to segregation.',
      cause: 'The current combined grading/fine-coarse balance does not efficiently fill void space in the v1 packing model.',
      recommendation: 'Improve combined gradation continuity and rebalance fine/intermediate/coarse aggregate fractions before increasing paste.',
      evidence: [`Void fraction ${(packing.voidFraction * 100).toFixed(1)}%`, `PSD continuity ${(packing.continuityScore * 100).toFixed(0)}%`],
    });
  }

  if (analysis.wCm > 0.50) {
    items.push({
      id: 'wcm-high', severity: analysis.wCm > 0.58 ? 'critical' : 'warning', title: 'High water-to-cementitious ratio',
      observation: `w/cm is ${analysis.wCm.toFixed(3)}.`,
      consequence: 'May reduce strength and durability and increase bleeding risk, subject to binder system and exposure requirements.',
      cause: 'Water content is high relative to cement plus silica fume content.',
      recommendation: 'Reduce free water or increase effective cementitious content only after checking workability and admixture demand.',
      evidence: [`w/cm ${analysis.wCm.toFixed(3)}`],
    });
  }

  if (pasteFraction < 0.24) {
    items.push({
      id: 'paste-low', severity: pasteFraction < 0.21 ? 'critical' : 'warning', title: 'Low paste volume',
      observation: `Paste volume is ${pasteFraction.toFixed(3)} m³/m³.`,
      consequence: 'Insufficient paste may reduce coating, cohesion and pumpability and make compaction more difficult.',
      cause: 'Binder + water + liquid admixture absolute volume is low relative to aggregate skeleton demand.',
      recommendation: 'First improve aggregate packing; if workability remains deficient, increase paste volume strategically rather than water alone.',
      evidence: [`Paste ${(pasteFraction * 100).toFixed(1)}%`, `Packing ${(packing.packingDensity * 100).toFixed(1)}%`],
    });
  } else if (pasteFraction > 0.36) {
    items.push({
      id: 'paste-high', severity: 'warning', title: 'High paste volume',
      observation: `Paste volume is ${pasteFraction.toFixed(3)} m³/m³.`,
      consequence: 'Excess paste can increase shrinkage, heat generation and cost without improving aggregate skeleton efficiency.',
      cause: 'Paste demand appears high relative to the estimated aggregate packing condition.',
      recommendation: 'Evaluate whether improved combined grading can reduce paste demand while maintaining workability.',
      evidence: [`Paste ${(pasteFraction * 100).toFixed(1)}%`],
    });
  }

  if (fineFraction < 0.32 || fineFraction > 0.52) {
    const low = fineFraction < 0.32;
    items.push({
      id: 'fine-balance', severity: 'warning', title: low ? 'Low fine-aggregate fraction' : 'High fine-aggregate fraction',
      observation: `Fine aggregate represents ${(fineFraction * 100).toFixed(1)}% of aggregate absolute volume.`,
      consequence: low ? 'May reduce cohesion and increase segregation sensitivity.' : 'May increase surface area, water/admixture demand and viscosity.',
      cause: 'Fine-to-total aggregate balance is outside the current heuristic working band.',
      recommendation: low ? 'Increase fine fraction or improve intermediate grading continuity.' : 'Reduce excessive fines or increase coarser fractions while preserving continuous grading.',
      evidence: [`Fine aggregate fraction ${(fineFraction * 100).toFixed(1)}%`],
    });
  }

  const invalidGradation = gradations.find((g) => !g.result.valid);
  if (invalidGradation) {
    items.push({
      id: 'gradation-invalid', severity: 'critical', title: 'Invalid gradation input',
      observation: `${invalidGradation.curve.label} contains inconsistent sieve/passing data.`,
      consequence: 'Packing and derived diagnostics are not reliable until PSD input is corrected.',
      cause: invalidGradation.result.errors.join(' '),
      recommendation: 'Correct sieve ordering and passing percentages before accepting simulation results.',
      evidence: invalidGradation.result.errors,
    });
  } else if (packing.continuityScore < 0.55) {
    items.push({
      id: 'gradation-gap', severity: 'warning', title: 'Weak gradation continuity',
      observation: `PSD continuity score is ${(packing.continuityScore * 100).toFixed(0)}%.`,
      consequence: 'Gap-prone grading can increase voids and make the mix more sensitive to paste content and compaction energy.',
      cause: 'One or more aggregate PSDs provide limited particle-size spread in the current continuity heuristic.',
      recommendation: 'Blend aggregate fractions to create a smoother combined grading curve and reduce abrupt retained-fraction gaps.',
      evidence: gradations.map((g) => `${g.curve.label}: D50 ${g.result.d50?.toFixed(2) ?? '—'} mm`),
    });
  }

  if (Math.abs(analysis.volumeClosureErrorPercent) > 3) {
    items.push({
      id: 'volume-closure', severity: Math.abs(analysis.volumeClosureErrorPercent) > 6 ? 'critical' : 'warning', title: 'Absolute-volume closure error',
      observation: `Volume closure error is ${analysis.volumeClosureErrorPercent.toFixed(1)}%.`,
      consequence: 'The entered batch quantities do not reconcile closely to one cubic metre, so downstream volumetric comparisons are distorted.',
      cause: 'Masses, densities and target air content do not currently close to 1.000 m³.',
      recommendation: 'Review material densities, moisture/free-water basis and batch masses, then rebalance quantities to close the absolute-volume equation.',
      evidence: [`Closure error ${analysis.volumeClosureErrorPercent.toFixed(1)}%`],
    });
  }

  if (analysis.wCm > 0.50 && fineFraction < 0.35) {
    items.push({
      id: 'bleeding-segregation', severity: 'warning', title: 'Bleeding / segregation sensitivity',
      observation: 'High w/cm coincides with a relatively low fine-aggregate fraction.',
      consequence: 'The combination can reduce matrix stability and increase free-water migration or coarse-particle settlement.',
      cause: 'Water demand and skeleton grading are not well balanced for cohesion.',
      recommendation: 'Improve fines/gradation and use admixture efficiency to reduce free water before increasing binder indiscriminately.',
      evidence: [`w/cm ${analysis.wCm.toFixed(3)}`, `Fine aggregate ${(fineFraction * 100).toFixed(1)}% of aggregate volume`],
    });
  }

  const critical = items.filter((i) => i.severity === 'critical').length;
  const warnings = items.filter((i) => i.severity === 'warning').length;
  const penalty = critical * 22 + warnings * 9;
  const score = clamp(Math.round(100 - penalty), 0, 100);
  return { score, critical, warnings, items };
}
