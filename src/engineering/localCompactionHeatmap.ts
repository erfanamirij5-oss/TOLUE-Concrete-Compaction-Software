import type { MixAnalysis } from '../domain/mixDesign';
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
  riskScore: number;
  level: HeatmapRiskLevel;
}

export interface LocalCompactionHeatmap {
  divisions: number;
  cells: CompactionHeatCell[];
  meanRisk: number;
  highRiskCells: number;
  attentionCells: number;
  method: 'tolue-local-compaction-heatmap-v1';
  heuristic: true;
  noteFa: string;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export function evaluateLocalCompactionHeatmap(
  analysis: MixAnalysis,
  packing: PackingResult,
  compaction: CompactionState,
  divisions = 5,
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
        const countRatio = bucket.particleCount / Math.max(0.25, averageCount);
        const solidRatio = bucket.radiusSum / Math.max(0.001, averageRadiusSum);
        const underFilled = clamp((1 - Math.min(1, (countRatio * 0.55 + solidRatio * 0.45))) * 100);
        const coarseFraction = bucket.particleCount ? bucket.coarseCount / bucket.particleCount : 0;
        const segregationRisk = clamp(Math.max(0, coarseFraction - 0.34) * 150);
        const localVoidRisk = clamp(underFilled * 0.62 + globalVoid * 0.23 + (100 - pasteSupport) * 0.15);
        const riskScore = clamp(localVoidRisk * 0.62 + segregationRisk * 0.18 + executionPenalty * 0.20);
        const level: HeatmapRiskLevel = riskScore >= 68 ? 'high' : riskScore >= 42 ? 'attention' : 'low';
        cells.push({
          key: `${x}-${y}-${z}`,
          grid: [x, y, z],
          position: [(x + 0.5) / n - 0.5, (y + 0.5) / n - 0.5, (z + 0.5) / n - 0.5],
          particleCount: bucket.particleCount,
          coarseCount: bucket.coarseCount,
          localSolidProxy: clamp(solidRatio * 100),
          localVoidRisk,
          segregationRisk,
          executionPenalty,
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
    method: 'tolue-local-compaction-heatmap-v1',
    heuristic: true,
    noteFa: 'این نقشه ریسک یک مدل مهندسی داخلی بر پایه توزیع ذرات نماینده، فضای خالی و پیشرفت تراکم است؛ مدل DEM یا پیش‌بینی آزمایشگاهی حفره‌های واقعی نیست.',
  };
}
