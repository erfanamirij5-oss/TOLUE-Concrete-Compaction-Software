import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { analyzeGradation, sampleDiameterMm } from './gradation';

export interface PackedParticle {
  key: string;
  materialKey: string;
  color: string;
  diameterMm: number;
  radius: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface PackingResult {
  particles: PackedParticle[];
  packingDensity: number;
  voidRatio: number;
  voidFraction: number;
  placementEfficiency: number;
  rejectedPlacements: number;
  continuityScore: number;
  method: 'stochastic-rsa-v1';
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function seededRandom(seedValue: number) {
  let seed = seedValue >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function gradationContinuity(mix: MixDesign) {
  const aggregateCurves = mix.gradations.map(analyzeGradation).filter((g) => g.valid);
  if (!aggregateCurves.length) return 0.5;
  const scores = aggregateCurves.map((g) => {
    if (!g.d10 || !g.d60) return 0.5;
    const spread = Math.log10(Math.max(1.01, g.d60 / g.d10));
    return clamp(0.45 + spread * 0.24, 0.35, 0.92);
  });
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

function cellKey(position: [number, number, number], cellSize: number) {
  return `${Math.floor((position[0] + 0.5) / cellSize)}:${Math.floor((position[1] + 0.5) / cellSize)}:${Math.floor((position[2] + 0.5) / cellSize)}`;
}

export function generatePacking(mix: MixDesign, analysis: MixAnalysis, seed = 20260905): PackingResult {
  const random = seededRandom(seed);
  const phases = analysis.materials.filter((m) => ['fine', 'intermediate', 'coarse'].includes(m.phase));
  const desired: PackedParticle[] = [];

  phases.forEach((phase, phaseIndex) => {
    const curve = mix.gradations.find((g) => g.materialKey === phase.key);
    const baseCount = phase.phase === 'coarse' ? 520 : phase.phase === 'intermediate' ? 760 : 1450;
    const count = Math.max(30, Math.round(baseCount * clamp(phase.absoluteVolumeM3 / 0.22, 0.42, 1.55)));
    for (let i = 0; i < count; i += 1) {
      const diameterMm = curve ? sampleDiameterMm(curve, random()) : phase.phase === 'coarse' ? 19 : phase.phase === 'intermediate' ? 9 : 1.2;
      // Visual radius is close to physical scale in the 1 m specimen, with a small lower bound so fines remain visible.
      const radius = clamp(diameterMm / 1550, 0.0018, 0.0185);
      const elongation = 0.90 + random() * 0.20;
      desired.push({
        key: `${phaseIndex}-${i}`,
        materialKey: phase.key,
        color: phase.color,
        diameterMm,
        radius,
        position: [0, 0, 0],
        rotation: [random() * Math.PI, random() * Math.PI, random() * Math.PI],
        scale: [elongation, 0.92 + random() * 0.16, 0.92 + random() * 0.16],
      });
    }
  });

  desired.sort((a, b) => b.radius - a.radius);
  const particles: PackedParticle[] = [];
  let rejectedPlacements = 0;
  const cellSize = 0.042;
  const grid = new Map<string, PackedParticle[]>();

  const neighbors = (position: [number, number, number]) => {
    const cx = Math.floor((position[0] + 0.5) / cellSize);
    const cy = Math.floor((position[1] + 0.5) / cellSize);
    const cz = Math.floor((position[2] + 0.5) / cellSize);
    const found: PackedParticle[] = [];
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
      const bucket = grid.get(`${cx + dx}:${cy + dy}:${cz + dz}`);
      if (bucket) found.push(...bucket);
    }
    return found;
  };

  for (const candidate of desired) {
    const margin = candidate.radius * 1.04;
    let placed = false;
    for (let attempt = 0; attempt < 48; attempt += 1) {
      // Bias targets slightly toward the lower half to create a more natural packed bed before vibration.
      const ry = Math.pow(random(), 1.12);
      const position: [number, number, number] = [
        -0.5 + margin + random() * (1 - 2 * margin),
        -0.5 + margin + ry * (1 - 2 * margin),
        -0.5 + margin + random() * (1 - 2 * margin),
      ];
      const collision = neighbors(position).some((other) => {
        const dx = position[0] - other.position[0];
        const dy = position[1] - other.position[1];
        const dz = position[2] - other.position[2];
        const minimum = (candidate.radius + other.radius) * 0.94;
        return dx * dx + dy * dy + dz * dz < minimum * minimum;
      });
      if (!collision) {
        candidate.position = position;
        particles.push(candidate);
        const key = cellKey(position, cellSize);
        const bucket = grid.get(key);
        if (bucket) bucket.push(candidate); else grid.set(key, [candidate]);
        placed = true;
        break;
      }
    }
    if (!placed) rejectedPlacements += 1;
  }

  const placementEfficiency = desired.length ? particles.length / desired.length : 0;
  const continuityScore = gradationContinuity(mix);
  const fineAggregate = analysis.materials.find((m) => m.phase === 'fine')?.absoluteVolumeM3 ?? 0;
  const aggregateVolume = Math.max(0.001, analysis.aggregateVolumeM3);
  const fineFraction = fineAggregate / aggregateVolume;
  const balanceScore = 1 - clamp(Math.abs(fineFraction - 0.42) / 0.42, 0, 1);

  const packingDensity = clamp(0.54 + continuityScore * 0.075 + balanceScore * 0.055 + placementEfficiency * 0.025, 0.52, 0.72);
  const voidFraction = 1 - packingDensity;
  const voidRatio = voidFraction / packingDensity;

  return {
    particles,
    packingDensity,
    voidRatio,
    voidFraction,
    placementEfficiency,
    rejectedPlacements,
    continuityScore,
    method: 'stochastic-rsa-v1',
  };
}
