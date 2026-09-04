import type { AggregateMaterialKey, MixDesign } from '../domain/mixDesign';

export interface ReferenceBandPoint { sieveMm: number; minPassing: number; maxPassing: number; }
export interface MaterialReferenceProfile { materialKey: AggregateMaterialKey; labelFa: string; points: ReferenceBandPoint[]; }
export interface ComplianceIssue { materialKey: AggregateMaterialKey; sieveMm: number; passingPercent: number; minPassing: number; maxPassing: number; deviation: number; severity: 'warning' | 'critical'; }
export interface ComplianceSummary { profileName: string; officialStandardSelected: boolean; issues: ComplianceIssue[]; affectedMaterials: AggregateMaterialKey[]; score: number; critical: number; warnings: number; }

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

export function evaluateReferenceCompliance(mix: MixDesign): ComplianceSummary {
  const issues: ComplianceIssue[] = [];
  for (const profile of INTERNAL_REFERENCE_PROFILE) {
    const curve = mix.gradations.find((item) => item.materialKey === profile.materialKey);
    if (!curve) continue;
    for (const band of profile.points) {
      const point = curve.points.find((item) => close(item.sieveMm, band.sieveMm));
      if (!point) continue;
      if (point.passingPercent < band.minPassing || point.passingPercent > band.maxPassing) {
        const deviation = point.passingPercent < band.minPassing ? band.minPassing - point.passingPercent : point.passingPercent - band.maxPassing;
        issues.push({ materialKey: profile.materialKey, sieveMm: band.sieveMm, passingPercent: point.passingPercent, minPassing: band.minPassing, maxPassing: band.maxPassing, deviation, severity: deviation >= 15 ? 'critical' : 'warning' });
      }
    }
  }
  const critical = issues.filter((item) => item.severity === 'critical').length;
  const warnings = issues.length - critical;
  return { profileName: 'محدوده مرجع مهندسی داخلی TOLUE', officialStandardSelected: false, issues, affectedMaterials: [...new Set(issues.map((item) => item.materialKey))], score: clamp(100 - critical * 18 - warnings * 7, 0, 100), critical, warnings };
}
