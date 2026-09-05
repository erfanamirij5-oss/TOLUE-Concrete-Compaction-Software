import { describe, expect, it } from 'vitest';
import { defaultMix } from '../domain/mixDesign';
import { analyzeMix } from '../engineering/analyzeMix';
import { evaluateACI31825Compliance } from './aciCompliance';
import { ASTM_COARSE_SIZE_OPTIONS, evaluateASTMC33Compliance } from './astmC33_24a';

describe('TOLUE standards validation gate', () => {
  const analysis = analyzeMix(defaultMix);

  it('keeps the baseline mix water-cementitious ratio deterministic', () => {
    expect(analysis.wCm).toBeCloseTo(165 / 385, 6);
  });

  it('passes benign ACI exposure inputs when all required data are supplied', () => {
    const result = evaluateACI31825Compliance(analysis, {
      classes: ['F0', 'S0', 'W0', 'C0'],
      fcMpa: 30,
      nominalMaxAggregateMm: 25,
      measuredAirPercent: 2,
      chloridePercentByCementitious: 0.05,
      prestressed: false,
    });
    expect(result.status).toBe('pass');
  });

  it('reports ACI insufficient when required strength or chloride data are missing', () => {
    const result = evaluateACI31825Compliance(analysis, {
      classes: ['F0', 'S0', 'W0', 'C2'],
      nominalMaxAggregateMm: 25,
      measuredAirPercent: 2,
      prestressed: false,
    });
    expect(result.checks.find(check => check.key === 'fc')?.status).toBe('insufficient');
    expect(result.checks.find(check => check.key === 'chloride')?.status).toBe('insufficient');
    expect(result.status).toBe('insufficient');
  });

  it('fails severe ACI F3 when w/cm exceeds the governing limit', () => {
    const result = evaluateACI31825Compliance(analysis, {
      classes: ['F3', 'S0', 'W0', 'C0'],
      fcMpa: 40,
      nominalMaxAggregateMm: 25,
      measuredAirPercent: 6.5,
      chloridePercentByCementitious: 0.05,
      prestressed: false,
    });
    expect(result.governingMaxWcm).toBe(0.4);
    expect(result.checks.find(check => check.key === 'wcm')?.status).toBe('fail');
    expect(result.status).toBe('fail');
  });

  it('supports every configured ASTM coarse aggregate size profile', () => {
    for (const sizeNo of ASTM_COARSE_SIZE_OPTIONS) {
      const result = evaluateASTMC33Compliance(defaultMix, analysis, sizeNo);
      expect(result.selectedCoarseSizeNo).toBe(sizeNo);
      expect(result.coarse.checks.length).toBeGreaterThan(0);
      expect(['compliant', 'noncompliant', 'insufficient']).toContain(result.status);
    }
  });

  it('never reports ASTM compliance when required sieve data are missing', () => {
    const incomplete = structuredClone(defaultMix);
    const sand = incomplete.gradations.find(curve => curve.materialKey === 'sand');
    if (sand) sand.points = [];
    const result = evaluateASTMC33Compliance(incomplete, analyzeMix(incomplete), '57');
    expect(result.fine.status).toBe('insufficient');
    expect(result.status).not.toBe('compliant');
  });
});
