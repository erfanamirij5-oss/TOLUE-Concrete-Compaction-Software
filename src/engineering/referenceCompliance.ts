import type { AggregateMaterialKey, MixDesign } from '../domain/mixDesign';

export interface ReferenceBandPoint { sieveMm: number; minPassing: number; maxPassing: number; }
export interface MaterialReferenceProfile { materialKey: AggregateMaterialKey; labelFa: string; points: ReferenceBandPoint[]; }
export type ComplianceIssueKind = 'out-of-range' | 'missing-sieve';
export interface ComplianceIssue {
  kind: ComplianceIssueKind;
  materialKey: AggregateMaterialKey;
  sieveMm: number;
  passingPercent: number | null;
  minPassing: number;
  maxPassing: number;
  deviation: number;
  severity: 'warning' | 'critical';
  affectedMinMm: number;
  affectedMaxMm: number;
  labelFa: string;
}
export interface ComplianceSummary {
  profileName: string;
  officialStandardSelected: boolean;
  issues: ComplianceIssue[];
  affectedMaterials: AggregateMaterialKey[];
  score: number;
  critical: number;
  warnings: number;
  missingInputs: number;
}

// این پروفایل فقط محدوده مرجع داخلی نرم‌افزار است و تا زمان انتخاب استاندارد رسمی پروژه، معیار پذیرش قراردادی/استانداردی محسوب نمی‌شود.
export const INTERNAL_REFERENCE_PROFILE: MaterialReferenceProfile[] = [
  { materialKey: 'sand', labelFa: 'ماسه ۰ تا ۴٫۷۵ میلی‌متر', points: [
    { sieveMm: 4.75, minPassing: 95, maxPassing: 100 }, { sieveMm: 2.36, minPassing: 80, maxPassing: 100 },
    { sieveMm: 1.18, minPassing: 50, maxPassing: 85 }, { sieveMm: 0.6, minPassing: 25, maxPassing: 60 },
    { sieveMm: 0.3, minPassing: 5, maxPassing: 30 }, { sieveMm: 0.15, minPassing: 0, maxPassing: 10 },
  ]},
  { materialKey: 'aggregate5to12', labelFa: 'سنگدانه ۴٫۷۵ تا ۱۲ میلی‌متر', points: [
    { sieveMm: 12.5, minPassing: 95, maxPassing: 100 }, { sieveMm: 9.5, minPassing: 55, maxPassing: 90 },
    { sieveMm: 4.75, minPassing: 0, maxPassing: 15 }, { sieveMm: 2.36, minPassing: 0, maxPassing: 5 },
  ]},
  { materialKey: 'aggregate12to25', labelFa: 'سنگدانه ۱۲ تا ۲۵ میلی‌متر', points: [
    { sieveMm: 25, minPassing: 95, maxPassing: 100 }, { sieveMm: 19, minPassing: 60, maxPassing: 90 },
    { sieveMm: 12.5, minPassing: 5, maxPassing: 25 }, { sieveMm: 9.5, minPassing: 0, maxPassing: 8 },
  ]},
];

const close = (a: number, b: number) => Math.abs(a - b) < 0.011;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const geometricMid = (a: number, b: number) => Math.sqrt(Math.max(0.0001, a) * Math.max(0.0001, b));

function influenceBand(points: ReferenceBandPoint[], index: number) {
  const current = points[index].sieveMm;
  const upperNeighbour = points[index - 1]?.sieveMm;
  const lowerNeighbour = points[index + 1]?.sieveMm;
  const affectedMaxMm = upperNeighbour ? geometricMid(upperNeighbour, current) : current * 1.18;
  const affectedMinMm = lowerNeighbour ? geometricMid(current, lowerNeighbour) : current * 0.72;
  return { affectedMinMm: Math.min(affectedMinMm, affectedMaxMm), affectedMaxMm: Math.max(affectedMinMm, affectedMaxMm) };
}

export function particleMatchesComplianceIssue(materialKey: string, diameterMm: number, issue: ComplianceIssue) {
  return issue.kind === 'out-of-range' && issue.materialKey === materialKey && diameterMm >= issue.affectedMinMm && diameterMm <= issue.affectedMaxMm;
}

export function evaluateReferenceCompliance(mix: MixDesign): ComplianceSummary {
  const issues: ComplianceIssue[] = [];
  for (const profile of INTERNAL_REFERENCE_PROFILE) {
    const curve = mix.gradations.find((item) => item.materialKey === profile.materialKey);
    if (!curve) continue;
    for (let index = 0; index < profile.points.length; index += 1) {
      const band = profile.points[index];
      const influence = influenceBand(profile.points, index);
      const point = curve.points.find((item) => close(item.sieveMm, band.sieveMm));
      if (!point) {
        issues.push({
          kind: 'missing-sieve', materialKey: profile.materialKey, sieveMm: band.sieveMm, passingPercent: null,
          minPassing: band.minPassing, maxPassing: band.maxPassing, deviation: 0, severity: 'warning',
          ...influence, labelFa: `داده الک ${band.sieveMm} میلی‌متر وارد نشده است`,
        });
        continue;
      }
      if (point.passingPercent < band.minPassing || point.passingPercent > band.maxPassing) {
        const deviation = point.passingPercent < band.minPassing ? band.minPassing - point.passingPercent : point.passingPercent - band.maxPassing;
        issues.push({
          kind: 'out-of-range', materialKey: profile.materialKey, sieveMm: band.sieveMm, passingPercent: point.passingPercent,
          minPassing: band.minPassing, maxPassing: band.maxPassing, deviation, severity: deviation >= 15 ? 'critical' : 'warning',
          ...influence, labelFa: `بازه اثر تقریبی ${influence.affectedMinMm.toFixed(2)} تا ${influence.affectedMaxMm.toFixed(2)} میلی‌متر`,
        });
      }
    }
  }
  const critical = issues.filter((item) => item.severity === 'critical').length;
  const warnings = issues.length - critical;
  const missingInputs = issues.filter((item) => item.kind === 'missing-sieve').length;
  return {
    profileName: 'محدوده مرجع مهندسی داخلی TOLUE', officialStandardSelected: false, issues,
    affectedMaterials: [...new Set(issues.filter((item) => item.kind === 'out-of-range').map((item) => item.materialKey))],
    score: clamp(100 - critical * 18 - warnings * 7, 0, 100), critical, warnings, missingInputs,
  };
}
