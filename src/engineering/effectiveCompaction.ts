import type { MixAnalysis } from '../domain/mixDesign';
import type { CompactionState } from './compaction';
import type { CombinedGradationResult } from './combinedGradation';
import type { PackingResult } from './packing';

export type EffectiveCompactionLevel = 'useful' | 'conditional' | 'ineffective';

export interface EffectiveCompactionResult {
  score: number;
  level: EffectiveCompactionLevel;
  labelFa: string;
  designPotentialScore: number;
  executionRealizationScore: number;
  packingQualityScore: number;
  gradationSupportScore: number;
  voidFillingSupportScore: number;
  pasteSupportScore: number;
  gapPenalty: number;
  reasonsFa: string[];
  cautionsFa: string[];
  method: 'tolue-effective-compaction-v1';
  officialStandardSelected: false;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export function evaluateEffectiveCompaction(
  analysis: MixAnalysis,
  packing: PackingResult,
  combined: CombinedGradationResult,
  compaction?: CompactionState,
): EffectiveCompactionResult {
  // Internal engineering heuristic. These limits are model-shaping ranges, not code acceptance criteria.
  const packingQualityScore = clamp(((packing.packingDensity - 0.52) / 0.18) * 100);
  const gradationSupportScore = combined.valid ? combined.continuityScore : 25;
  const gapPenalty = clamp(combined.gaps.reduce((sum, gap) => sum + (gap.severity === 'critical' ? 15 : 7), 0), 0, 45);

  const voidFractionPercent = packing.voidFraction * 100;
  const voidFillingSupportScore = clamp(100 - Math.max(0, voidFractionPercent - 30) * 3.2 - gapPenalty * 0.55);

  const pastePercent = analysis.pasteVolumeM3 * 100;
  const pasteCenter = 29;
  const pasteDistance = Math.abs(pastePercent - pasteCenter);
  const pasteSupportScore = clamp(100 - pasteDistance * 5.2);

  const closurePenalty = clamp(Math.abs(analysis.volumeClosureErrorPercent) * 8, 0, 35);
  const designPotentialScore = clamp(
    packingQualityScore * 0.34 +
    gradationSupportScore * 0.28 +
    voidFillingSupportScore * 0.20 +
    pasteSupportScore * 0.18 -
    gapPenalty * 0.35 -
    closurePenalty * 0.25,
  );

  const executionRealizationScore = compaction
    ? clamp(35 + compaction.progress * 65)
    : 100;

  const score = clamp(designPotentialScore * 0.78 + executionRealizationScore * 0.22);
  const level: EffectiveCompactionLevel = score >= 76 && designPotentialScore >= 70
    ? 'useful'
    : score >= 52 && designPotentialScore >= 45
      ? 'conditional'
      : 'ineffective';

  const labelFa = level === 'useful'
    ? 'تراکم مفید و قابل استفاده'
    : level === 'conditional'
      ? 'تراکم مشروط؛ نیازمند بررسی'
      : 'تراکم غیرمؤثر یا پرریسک';

  const reasonsFa: string[] = [];
  const cautionsFa: string[] = [];

  if (packingQualityScore >= 72) reasonsFa.push('چگالی بسته‌بندی برآوردی، پتانسیل مناسبی برای آرایش متراکم سنگدانه‌ها نشان می‌دهد.');
  else cautionsFa.push('چگالی بسته‌بندی برآوردی به‌تنهایی برای ایجاد ساختار متراکم قوی نیست.');

  if (gradationSupportScore >= 75) reasonsFa.push('دانه‌بندی مرکب از نظر پیوستگی، از تراکم مؤثر پشتیبانی می‌کند.');
  else cautionsFa.push('پیوستگی دانه‌بندی مرکب ضعیف یا متوسط است و می‌تواند بخشی از مزیت تراکم را خنثی کند.');

  if (combined.gaps.length > 0) cautionsFa.push(`${combined.gaps.length} گپ احتمالی در دانه‌بندی مرکب شناسایی شده است.`);
  if (voidFillingSupportScore >= 70) reasonsFa.push('تعادل فضای خالی و توزیع اندازه‌ها برای پرشدن بین ذرات قابل قبول ارزیابی شده است.');
  else cautionsFa.push('فضای خالی برآوردی یا گپ‌های اندازه‌ای می‌توانند از پرشدن مؤثر بین ذرات جلوگیری کنند.');

  if (pasteSupportScore >= 70) reasonsFa.push('حجم خمیر نسبت به ساختار حجمی طرح در محدوده مناسب مدل داخلی قرار دارد.');
  else cautionsFa.push('حجم خمیر نسبت به ساختار حجمی طرح از مرکز مناسب مدل داخلی فاصله دارد؛ تراکم عددی ممکن است به معنی تراکم اجرایی پایدار نباشد.');

  if (compaction && compaction.progress < 0.95) cautionsFa.push('اجرای تراکم هنوز کامل نشده است؛ امتیاز نهایی با پیشرفت Run تغییر می‌کند.');

  return {
    score: Math.round(score),
    level,
    labelFa,
    designPotentialScore: Math.round(designPotentialScore),
    executionRealizationScore: Math.round(executionRealizationScore),
    packingQualityScore: Math.round(packingQualityScore),
    gradationSupportScore: Math.round(gradationSupportScore),
    voidFillingSupportScore: Math.round(voidFillingSupportScore),
    pasteSupportScore: Math.round(pasteSupportScore),
    gapPenalty: Math.round(gapPenalty),
    reasonsFa,
    cautionsFa,
    method: 'tolue-effective-compaction-v1',
    officialStandardSelected: false,
  };
}
