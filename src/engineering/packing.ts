import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { analyzeGradation, sampleDiameterMm } from './gradation';

export interface PackedParticle {
  key: string;
  materialKey: string;
  color: string;
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

function seededRandom(seedValue = 20260905) {
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

export function generatePacking(mix: MixDesign, analysis: MixAnalysis): PackingResult {
  const random = seededRandom();
  const phases = analysis.materials.filter((m) => ['fine', 'intermediate', 'coarse'].includes(m.phase));
  const desired: PackedParticle[] = [];

  phases.forEach((phase, phaseIndex) => {
    const curve = mix.gradations.find((g) => g.materialKey === phase.key);
    const baseCount = phase.phase === 'coarse' ? 75 : phase.phase === 'intermediate' ? 135 : 260;
    const count = Math.max(8, Math.round(baseCount * clamp(phase.absoluteVolumeM3 / 0.22, 0.35, 1.65)));
    for (let i = 0; i < count; i += 1) {
      const diameterMm = curve ? sampleDiameterMm(curve, random()) : phase.phase === 'coarse' ? 19 : phase.phase === 'intermediate' ? 9 : 1.2;
      const radius = clamp(diameterMm / 390, 0.005, 0.058);
      desired.push({
        key: `${phaseIndex}-${i}`,
        materialKey: phase.key,
        color: phase.color,
        radius,
        position: [0, 0, 0],
        rotation: [random() * Math.PI, random() * Math.PI, random() * Math.PI],
        scale: [0.76 + random() * 0.45, 0.76 + random() * 0.42, 0.76 + random() * 0.42],
      });
    }
  });

  desired.sort((a, b) => b.radius - a.radius);
  const particles: PackedParticle[] = [];
  let rejectedPlacements = 0;

  for (const candidate of desired) {
    const margin = candidate.radius * 1.1;
    let placed = false;
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const position: [number, number, number] = [
        -0.5 + margin + random() * (1 - 2 * margin),
        -0.5 + margin + random() * (1 - 2 * margin),
        -0.5 + margin + random() * (1 - 2 * margin),
      ];
      const collision = particles.some((other) => {
        const dx = position[0] - other.position[0];
        const dy = position[1] - other.position[1];
        const dz = position[2] - other.position[2];
        const minimum = (candidate.radius + other.radius) * 0.82;
        return dx * dx + dy * dy + dz * dz < minimum * minimum;
      });
      if (!collision) {
        candidate.position = position;
        particles.push(candidate);
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
