import { describe, expect, it } from 'vitest';
import { defaultMix } from '../domain/mixDesign';
import type { RebarNetworkInput } from '../domain/rebarAnalysis';
import { analyzeMix } from './analyzeMix';
import { analyzeCombinedGradation } from './combinedGradation';
import { defaultCompactionPlan, evaluateCompactionPlan } from './compactionPlan';
import { finalAssessmentLevel } from './finalAssessment';
import { evaluateLocalRebarRisk } from './localRebarRisk';
import { generatePacking } from './packing';

describe('TOLUE RC engineering boundary validation', () => {
  const analysis = analyzeMix(defaultMix);
  const representativeNetwork: RebarNetworkInput = {
    x: { barDiameterMm: 16, centerSpacingMm: 180 },
    y: { barDiameterMm: 16, centerSpacingMm: 180 },
    coverMm: 40,
    layers: 2,
    clearLayerSpacingMm: 120,
    interiorVerticalSpacingMm: 180,
  };

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

  it('keeps local rebar/Dmax screening deterministic and internally consistent', () => {
    const result = evaluateLocalRebarRisk(representativeNetwork, 25);
    expect(result.cells.length).toBeGreaterThan(0);
    expect(result.criticalCells + result.attentionCells + result.lowRiskCells).toBe(result.cells.length);
    expect(result.governingOpeningMm).toBeGreaterThan(0);
    expect(result.governingRatio).toBeGreaterThan(0);
    expect(result.worstCells.length).toBeLessThanOrEqual(5);
    expect(result.heuristic).toBe(true);
  });

  it('escalates local cage risk when Dmax grows against the same opening', () => {
    const small = evaluateLocalRebarRisk(representativeNetwork, 12.5);
    const large = evaluateLocalRebarRisk(representativeNetwork, 80);
    expect(large.governingRatio).toBeLessThan(small.governingRatio);
    expect(large.criticalCells).toBeGreaterThanOrEqual(small.criticalCells);
  });

  it('keeps the compaction-plan result finite, bounded and coverage-balanced', () => {
    const packing = generatePacking(defaultMix, analysis, 20260905);
    const result = evaluateCompactionPlan(defaultCompactionPlan, representativeNetwork, packing);
    expect(result.insertions.length).toBeGreaterThan(0);
    expect(result.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(result.coveragePercent).toBeLessThanOrEqual(100);
    expect(result.deadZonePercent).toBeGreaterThanOrEqual(0);
    expect(result.deadZonePercent).toBeLessThanOrEqual(100);
    expect(result.coveragePercent + result.deadZonePercent).toBeCloseTo(100, 1);
    expect(result.accessRiskPercent).toBeGreaterThanOrEqual(0);
    expect(result.accessRiskPercent).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('penalizes a physically inaccessible poker diameter in the compaction plan', () => {
    const packing = generatePacking(defaultMix, analysis, 20260905);
    const accessible = evaluateCompactionPlan({ ...defaultCompactionPlan, pokerDiameterMm: 38 }, representativeNetwork, packing);
    const blockedNetwork: RebarNetworkInput = {
      ...representativeNetwork,
      x: { barDiameterMm: 25, centerSpacingMm: 60 },
      y: { barDiameterMm: 25, centerSpacingMm: 60 },
      clearLayerSpacingMm: 35,
    };
    const blocked = evaluateCompactionPlan({ ...defaultCompactionPlan, pokerDiameterMm: 65 }, blockedNetwork, packing);
    expect(blocked.accessRiskPercent).toBeGreaterThan(accessible.accessRiskPercent);
    expect(blocked.score).toBeLessThanOrEqual(accessible.score);
  });
});
