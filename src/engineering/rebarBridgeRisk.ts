import type { RebarNetworkInput } from '../domain/rebarAnalysis';
import type { PackingResult } from './packing';

export type BridgeParticleRisk = 'none' | 'attention' | 'critical';

export interface BridgeRiskSummary {
  governingOpeningMm: number;
  criticalDiameterMm: number;
  attentionDiameterMm: number;
  candidateParticles: number;
  criticalParticles: number;
  candidateSharePercent: number;
  criticalSharePercent: number;
  score: number;
  level: 'low' | 'attention' | 'high';
  messageFa: string;
  method: 'tolue-rebar-bridge-heuristic-v1';
  heuristic: true;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export function governingRebarOpeningMm(network: RebarNetworkInput) {
  const clearX = Math.max(0, network.x.centerSpacingMm - network.x.barDiameterMm);
  const clearY = Math.max(0, network.y.centerSpacingMm - network.y.barDiameterMm);
  const clearLayer = network.layers > 1 ? Math.max(0, network.clearLayerSpacingMm) : Number.POSITIVE_INFINITY;
  return Math.min(clearX, clearY, clearLayer);
}

/**
 * Internal TOLUE heuristic only. It does not model contact mechanics, particle orientation,
 * flow field, aggregate shape, multi-particle arch stability or DEM collisions.
 * It flags PSD particles whose nominal diameter is large relative to the governing clear opening.
 */
export function particleBridgeRisk(diameterMm: number, network: RebarNetworkInput): BridgeParticleRisk {
  const opening = Math.max(1, governingRebarOpeningMm(network));
  const ratio = Math.max(0, diameterMm) / opening;
  if (ratio >= 0.90) return 'critical';
  if (ratio >= 0.65) return 'attention';
  return 'none';
}

export function analyzeRebarBridgeRisk(packing: PackingResult, network: RebarNetworkInput): BridgeRiskSummary {
  const opening = Math.max(1, governingRebarOpeningMm(network));
  const aggregateParticles = packing.particles.filter((particle) => particle.materialKey === 'aggregate5to12' || particle.materialKey === 'aggregate12to25');
  const risks = aggregateParticles.map((particle) => particleBridgeRisk(particle.diameterMm, network));
  const criticalParticles = risks.filter((risk) => risk === 'critical').length;
  const candidateParticles = risks.filter((risk) => risk !== 'none').length;
  const total = Math.max(1, aggregateParticles.length);
  const criticalSharePercent = (criticalParticles / total) * 100;
  const candidateSharePercent = (candidateParticles / total) * 100;
  const dmax = Math.max(1, ...aggregateParticles.map((particle) => particle.diameterMm));
  const dmaxRatio = dmax / opening;
  const score = Math.round(clamp(criticalSharePercent * 2.8 + candidateSharePercent * 1.35 + Math.max(0, dmaxRatio - 0.45) * 38));
  const level = score >= 68 ? 'high' : score >= 36 ? 'attention' : 'low';
  const messageFa = level === 'high'
    ? 'بخشی از ذرات درشت نسبت بزرگی به گلوگاه شبکه دارند؛ احتمال محدودیت عبور و تشکیل پل چندذره‌ای باید جدی بررسی شود.'
    : level === 'attention'
      ? 'برخی ذرات درشت به محدوده حساس گلوگاه نزدیک‌اند؛ عبور بتن به تراکم، جهت‌گیری ذرات و شرایط اجرا وابسته است.'
      : 'بر اساس اندازه اسمی ذرات نماینده، ریسک هندسی پل‌زدگی پایین ارزیابی می‌شود.';

  return {
    governingOpeningMm: Number(opening.toFixed(1)),
    criticalDiameterMm: Number((opening * 0.90).toFixed(1)),
    attentionDiameterMm: Number((opening * 0.65).toFixed(1)),
    candidateParticles,
    criticalParticles,
    candidateSharePercent: Number(candidateSharePercent.toFixed(1)),
    criticalSharePercent: Number(criticalSharePercent.toFixed(1)),
    score,
    level,
    messageFa,
    method: 'tolue-rebar-bridge-heuristic-v1',
    heuristic: true,
  };
}
