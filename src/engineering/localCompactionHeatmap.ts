import type { MixAnalysis } from '../domain/mixDesign';
import type { RebarNetworkInput } from '../domain/rebarAnalysis';
import { defaultRebarNetwork } from '../domain/rebarAnalysis';
import type { CompactionState } from './compaction';
import type { PackingResult } from './packing';

export type HeatmapRiskLevel = 'low' | 'attention' | 'high';

export interface CompactionHeatCell {
  key: string;
  grid: [number, number, number];
  position: [number, number, number];
  particleCount: number;
  coarseCount: number;
  localSolidProxy: number;
  localVoidRisk: number;
  segregationRisk: number;
  executionPenalty: number;
  rebarCongestionRisk: number;
  riskScore: number;
  level: HeatmapRiskLevel;
}

export interface LocalCompactionHeatmap {
  divisions: number;
  cells: CompactionHeatCell[];
  meanRisk: number;
  highRiskCells: number;
  attentionCells: number;
  rebarAffectedCells: number;
  method: 'tolue-local-compaction-heatmap-v2';
  heuristic: true;
  noteFa: string;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function distanceToNearestBarAxis(position: [number, number, number], network: RebarNetworkInput) {
  const spacingX = Math.max(0.02, network.x.centerSpacingMm / 1000);
  const spacingY = Math.max(0.02, network.y.centerSpacingMm / 1000);
  const cover = Math.max(0, Math.min(0.45, network.coverMm / 1000));
  const usable = Math.max(0.1, 1 - cover * 2);
  const nearestPeriodic = (coordinate: number, spacing: number) => {
    const shifted = coordinate + usable / 2;
    const modulo = ((shifted % spacing) + spacing) % spacing;
    return Math.min(modulo, spacing - modulo);
  };
  const dx = nearestPeriodic(position[0], spacingX);
  const dy = nearestPeriodic(position[1], spacingY);
  return Math.min(dx, dy);
}

function localRebarRisk(position: [number, number, number], network: RebarNetworkInput) {
  const minDiameterM = Math.min(network.x.barDiameterMm, network.y.barDiameterMm) / 1000;
  const nearest = distanceToNearestBarAxis(position, network);
  const clearX = Math.max(1, network.x.centerSpacingMm - network.x.barDiameterMm);
  const clearY = Math.max(1, network.y.centerSpacingMm - network.y.barDiameterMm);
  const governing = Math.min(clearX, clearY, network.layers > 1 ? Math.max(1, network.clearLayerSpacingMm) : Number.POSITIVE_INFINITY);
  const geometricTightness = clamp((120 - governing) * 0.72);
  const nearBar = clamp((minDiameterM * 2.4 - nearest) / Math.max(0.001, minDiameterM * 2.4) * 100);
  const layerPenalty = clamp(Math.max(0, network.layers - 1) * 11);
  return clamp(nearBar * 0.55 + geometricTightness * 0.3 + layerPenalty * 0.15);
}

export function evaluateLocalCompactionHeatmap(
  analysis: MixAnalysis,
  packing: PackingResult,
  compaction: CompactionState,
  divisions = 5,
  rebarNetwork: RebarNetworkInput = defaultRebarNetwork,
): LocalCompactionHeatmap {
  const n = Math.max(3, Math.min(8, Math.round(divisions)));
  const totalCells = n * n * n;
  const buckets = Array.from({ length: totalCells }, () => ({ particleCount: 0, coarseCount: 0, radiusSum: 0 }));

  const cellIndex = (coordinate: number) => Math.max(0, Math.min(n - 1, Math.floor((coordinate + 0.5) * n)));
  const flat = (x: number, y: number, z: number) => x + y * n + z * n * n;

  for (const particle of packing.particles) {
    const x = cellIndex(particle.position[0]);
    const y = cellIndex(particle.position[1]);
    const z = cellIndex(particle.position[2]);
    const bucket = buckets[flat(x, y, z)];
    bucket.particleCount += 1;
    bucket.radiusSum += particle.radius;
    if (particle.materialKey === 'aggregate12to25') bucket.coarseCount += 1;
  }

  const averageCount = packing.particles.length / Math.max(1, totalCells);
  const averageRadiusSum = buckets.reduce((sum, item) => sum + item.radiusSum, 0) / Math.max(1, totalCells);
  const globalVoid = clamp(packing.voidFraction * 100);
  const pasteSupport = clamp((analysis.pasteVolumeM3 / Math.max(0.001, analysis.pasteVolumeM3 + packing.voidFraction)) * 100);
  const executionPenalty = clamp((1 - compaction.progress) * 35);

  const cells: CompactionHeatCell[] = [];
  for (let z = 0; z < n; z += 1) {
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const bucket = buckets[flat(x, y, z)];
        const position: [number, number, number] = [(x + 0.5) / n - 0.5, (y + 0.5) / n - 0.5, (z + 0.5) / n - 0.5];
        const countRatio = bucket.particleCount / Math.max(0.25, averageCount);
        const solidRatio = bucket.radiusSum / Math.max(0.001, averageRadiusSum);
        const underFilled = clamp((1 - Math.min(1, countRatio * 0.55 + solidRatio * 0.45)) * 100);
        const coarseFraction = bucket.particleCount ? bucket.coarseCount / bucket.particleCount : 0;
        const segregationRisk = clamp(Math.max(0, coarseFraction - 0.34) * 150);
        const localVoidRisk = clamp(underFilled * 0.62 + globalVoid * 0.23 + (100 - pasteSupport) * 0.15);
        const rebarCongestionRisk = localRebarRisk(position, rebarNetwork);
        const riskScore = clamp(localVoidRisk * 0.50 + segregationRisk * 0.14 + executionPenalty * 0.16 + rebarCongestionRisk * 0.20);
        const level: HeatmapRiskLevel = riskScore >= 68 ? 'high' : riskScore >= 42 ? 'attention' : 'low';
        cells.push({
          key: `${x}-${y}-${z}`,
          grid: [x, y, z],
          position,
          particleCount: bucket.particleCount,
          coarseCount: bucket.coarseCount,
          localSolidProxy: clamp(solidRatio * 100),
          localVoidRisk,
          segregationRisk,
          executionPenalty,
          rebarCongestionRisk,
          riskScore,
          level,
        });
      }
    }
  }

  return {
    divisions: n,
    cells,
    meanRisk: cells.reduce((sum, cell) => sum + cell.riskScore, 0) / Math.max(1, cells.length),
    highRiskCells: cells.filter((cell) => cell.level === 'high').length,
    attentionCells: cells.filter((cell) => cell.level === 'attention').length,
    rebarAffectedCells: cells.filter((cell) => cell.rebarCongestionRisk >= 35).length,
    method: 'tolue-local-compaction-heatmap-v2',
    heuristic: true,
    noteFa: 'این نقشه ریسک داخلی، توزیع ذرات نماینده، فضای خالی، پیشرفت تراکم و محدودیت هندسی شبکه آرماتور را ترکیب می‌کند؛ مدل DEM، تحلیل سازه‌ای یا پیش‌بینی قطعی کرموشدگی نیست.',
  };
}
