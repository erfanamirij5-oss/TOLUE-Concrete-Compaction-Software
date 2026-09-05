import { describe, expect, it } from 'vitest';
import { defaultMix } from '../domain/mixDesign';
import { analyzeMix } from './analyzeMix';
import { analyzeCombinedGradation } from './combinedGradation';
import { finalAssessmentLevel } from './finalAssessment';
import { generatePacking } from './packing';

describe('TOLUE RC engineering boundary validation', () => {
  const analysis = analyzeMix(defaultMix);

  it('keeps the default mix volumetric closure inside the critical gate boundary', () => {
    expect(Math.abs(analysis.volumeClosureErrorPercent)).toBeLessThanOrEqual(6);
  });

  it('keeps seeded packing deterministic for identical inputs', () => {
    const a = generatePacking(defaultMix, analysis, 20260905);
    const b = generatePacking(defaultMix, analysis, 20260905);
    expect(a.packingDensity).toBe(b.packingDensity);
    expect(a.rejectedPlacements).toBe(b.rejectedPlacements);
    expect(a.particles.length).toBe(b.particles.length);
    expect(a.particles.slice(0, 12).map(p => [p.diameterMm, ...p.position])).toEqual(
      b.particles.slice(0, 12).map(p => [p.diameterMm, ...p.position]),
    );
  });

  it('maps final assessment level boundaries exactly', () => {
    expect(finalAssessmentLevel(90).level).toBe('excellent');
    expect(finalAssessmentLevel(89).level).toBe('good');
    expect(finalAssessmentLevel(78).level).toBe('good');
    expect(finalAssessmentLevel(77).level).toBe('conditional');
    expect(finalAssessmentLevel(62).level).toBe('conditional');
    expect(finalAssessmentLevel(61).level).toBe('weak');
    expect(finalAssessmentLevel(45).level).toBe('weak');
    expect(finalAssessmentLevel(44).level).toBe('critical');
  });

  it('detects a critical combined-gradation gap at the heuristic boundary', () => {
    const mix = structuredClone(defaultMix);
    for (const curve of mix.gradations) {
      curve.points = [
        { sieveMm: 10, passingPercent: 100 },
        { sieveMm: 5, passingPercent: 99 },
      ];
    }
    const result = analyzeCombinedGradation(mix, analyzeMix(mix));
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0].severity).toBe('critical');
    expect(result.gaps[0].sizeRatio).toBeGreaterThanOrEqual(1.85);
    expect(result.gaps[0].retainedPercent).toBeLessThan(2);
  });

  it('detects an attention combined-gradation gap without escalating it to critical', () => {
    const mix = structuredClone(defaultMix);
    for (const curve of mix.gradations) {
      curve.points = [
        { sieveMm: 8, passingPercent: 100 },
        { sieveMm: 5, passingPercent: 97 },
      ];
    }
    const result = analyzeCombinedGradation(mix, analyzeMix(mix));
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0].severity).toBe('attention');
    expect(result.gaps[0].sizeRatio).toBeGreaterThanOrEqual(1.55);
    expect(result.gaps[0].sizeRatio).toBeLessThan(1.85);
    expect(result.gaps[0].retainedPercent).toBeLessThan(4);
  });
});
