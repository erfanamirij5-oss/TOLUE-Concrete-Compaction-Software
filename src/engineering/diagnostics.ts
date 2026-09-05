import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { PackingResult } from './packing';
import { analyzeGradation } from './gradation';

export type DiagnosticSeverity = 'info' | 'warning' | 'critical';

export interface DiagnosticItem {
  id: string;
  severity: DiagnosticSeverity;
  title: string;
  observation: string;
  consequence: string;
  cause: string;
  recommendation: string;
  evidence: string[];
}

export interface DiagnosticSummary {
  score: number;
  critical: number;
  warnings: number;
  items: DiagnosticItem[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function diagnoseMix(mix: MixDesign, analysis: MixAnalysis, packing: PackingResult): DiagnosticSummary {
  const items: DiagnosticItem[] = [];
  const gradations = mix.gradations.map((curve) => ({ curve, result: analyzeGradation(curve) }));
  const sand = analysis.materials.find((m) => m.key === 'sand');
  const totalAgg = Math.max(0.0001, analysis.aggregateVolumeM3);
  const fineFraction = (sand?.absoluteVolumeM3 ?? 0) / totalAgg;
  const pasteFraction = analysis.pasteVolumeM3;

  if (packing.packingDensity < 0.58) {
    items.push({
      id: 'packing-low', severity: packing.packingDensity < 0.55 ? 'critical' : 'warning', title: 'تراکم بسته‌بندی پایین',
      observation: `چگالی بسته‌بندی برآوردشده ${(packing.packingDensity * 100).toFixed(1)}٪ است.`,
      consequence: 'فضای خالی بیشتر بین ذرات می‌تواند نیاز به خمیر، پتانسیل جمع‌شدگی و حساسیت به جداشدگی را افزایش دهد.',
      cause: 'ترکیب فعلی دانه‌بندی و نسبت ریزدانه به درشت‌دانه در مدل بسته‌بندی نسخه فعلی، فضای خالی را به‌صورت مؤثر پر نمی‌کند.',
      recommendation: 'پیوستگی دانه‌بندی ترکیبی را اصلاح و سهم سنگدانه‌های ریز، میانی و درشت را پیش از افزایش خمیر بازتنظیم کنید.',
      evidence: [`فضای خالی ${(packing.voidFraction * 100).toFixed(1)}٪`, `پیوستگی دانه‌بندی ${(packing.continuityScore * 100).toFixed(0)}٪`],
    });
  }

  if (analysis.wCm > 0.50) {
    items.push({
      id: 'wcm-high', severity: analysis.wCm > 0.58 ? 'critical' : 'warning', title: 'نسبت آب به مواد سیمانی بالا',
      observation: `نسبت آب به مواد سیمانی برابر ${analysis.wCm.toFixed(3)} است.`,
      consequence: 'ممکن است مقاومت و دوام را کاهش داده و خطر آب‌انداختگی را افزایش دهد؛ نتیجه نهایی به سیستم چسباننده و شرایط محیطی وابسته است.',
      cause: 'مقدار آب نسبت به مجموع سیمان و میکروسیلیس زیاد است.',
      recommendation: 'آب آزاد را کاهش دهید یا تنها پس از کنترل کارایی و نیاز افزودنی، مقدار مؤثر مواد سیمانی را اصلاح کنید.',
      evidence: [`نسبت آب به مواد سیمانی ${analysis.wCm.toFixed(3)}`],
    });
  }

  if (pasteFraction < 0.24) {
    items.push({
      id: 'paste-low', severity: pasteFraction < 0.21 ? 'critical' : 'warning', title: 'حجم خمیر پایین',
      observation: `حجم خمیر ${pasteFraction.toFixed(3)} مترمکعب در مترمکعب است.`,
      consequence: 'خمیر ناکافی می‌تواند پوشش سنگدانه، چسبندگی، پمپ‌پذیری و قابلیت تراکم را کاهش دهد.',
      cause: 'حجم مطلق سیمان، آب و افزودنی مایع نسبت به نیاز اسکلت سنگدانه پایین است.',
      recommendation: 'ابتدا بسته‌بندی سنگدانه را بهبود دهید؛ اگر کارایی همچنان ناکافی بود، حجم خمیر را هدفمند افزایش دهید و صرفاً آب اضافه نکنید.',
      evidence: [`خمیر ${(pasteFraction * 100).toFixed(1)}٪`, `بسته‌بندی ${(packing.packingDensity * 100).toFixed(1)}٪`],
    });
  } else if (pasteFraction > 0.36) {
    items.push({
      id: 'paste-high', severity: 'warning', title: 'حجم خمیر بالا',
      observation: `حجم خمیر ${pasteFraction.toFixed(3)} مترمکعب در مترمکعب است.`,
      consequence: 'خمیر بیش‌ازحد می‌تواند جمع‌شدگی، گرمازایی و هزینه را بدون بهبود کارایی اسکلت سنگدانه افزایش دهد.',
      cause: 'نیاز خمیر نسبت به وضعیت برآوردشده بسته‌بندی سنگدانه زیاد به نظر می‌رسد.',
      recommendation: 'بررسی کنید آیا با اصلاح دانه‌بندی ترکیبی می‌توان ضمن حفظ کارایی، نیاز خمیر را کاهش داد.',
      evidence: [`خمیر ${(pasteFraction * 100).toFixed(1)}٪`],
    });
  }

  if (fineFraction < 0.32 || fineFraction > 0.52) {
    const low = fineFraction < 0.32;
    items.push({
      id: 'fine-balance', severity: 'warning', title: low ? 'سهم سنگدانه ریز پایین' : 'سهم سنگدانه ریز بالا',
      observation: `سنگدانه ریز ${(fineFraction * 100).toFixed(1)}٪ از حجم مطلق کل سنگدانه را تشکیل می‌دهد.`,
      consequence: low ? 'ممکن است انسجام کاهش یابد و حساسیت به جداشدگی افزایش پیدا کند.' : 'ممکن است سطح ویژه، نیاز آب و افزودنی و ویسکوزیته افزایش پیدا کند.',
      cause: 'تعادل ریزدانه به کل سنگدانه خارج از محدوده کاری Heuristic فعلی است.',
      recommendation: low ? 'سهم ریزدانه یا پیوستگی بخش میانی دانه‌بندی را افزایش دهید.' : 'ریزدانه اضافی را کاهش دهید یا سهم درشت‌دانه را با حفظ پیوستگی دانه‌بندی افزایش دهید.',
      evidence: [`سهم سنگدانه ریز ${(fineFraction * 100).toFixed(1)}٪`],
    });
  }

  const invalidGradation = gradations.find((g) => !g.result.valid);
  if (invalidGradation) {
    items.push({
      id: 'gradation-invalid', severity: 'critical', title: 'ورودی دانه‌بندی نامعتبر',
      observation: `${invalidGradation.curve.label} دارای داده ناسازگار الک یا درصد عبوری است.`,
      consequence: 'تا زمان اصلاح PSD، بسته‌بندی و تشخیص‌های مشتق‌شده قابل اتکا نیستند.',
      cause: invalidGradation.result.errors.join(' '),
      recommendation: 'ترتیب الک‌ها و درصدهای عبوری را پیش از پذیرش نتیجه شبیه‌سازی اصلاح کنید.',
      evidence: invalidGradation.result.errors,
    });
  } else if (packing.continuityScore < 0.55) {
    items.push({
      id: 'gradation-gap', severity: 'warning', title: 'پیوستگی ضعیف دانه‌بندی',
      observation: `امتیاز پیوستگی PSD برابر ${(packing.continuityScore * 100).toFixed(0)}٪ است.`,
      consequence: 'دانه‌بندی مستعد گپ می‌تواند فضای خالی را افزایش داده و مخلوط را نسبت به حجم خمیر و انرژی تراکم حساس‌تر کند.',
      cause: 'یک یا چند PSD سنگدانه در Heuristic فعلی گستره محدود اندازه ذرات دارند.',
      recommendation: 'سهم سنگدانه‌ها را برای ایجاد منحنی ترکیبی نرم‌تر و کاهش جهش‌های درصد مانده بازتنظیم کنید.',
      evidence: gradations.map((g) => `${g.curve.label}: D50 ${g.result.d50?.toFixed(2) ?? '—'} mm`),
    });
  }

  if (Math.abs(analysis.volumeClosureErrorPercent) > 3) {
    items.push({
      id: 'volume-closure', severity: Math.abs(analysis.volumeClosureErrorPercent) > 6 ? 'critical' : 'warning', title: 'خطای بسته‌شدن حجم مطلق',
      observation: `خطای بسته‌شدن حجم ${analysis.volumeClosureErrorPercent.toFixed(1)}٪ است.`,
      consequence: 'مقادیر بچ واردشده با یک مترمکعب تطابق کافی ندارند و مقایسه‌های حجمی بعدی منحرف می‌شوند.',
      cause: 'جرم‌ها، چگالی‌ها و هوای هدف فعلی معادله حجم مطلق را به ۱٫۰۰۰ مترمکعب نمی‌رسانند.',
      recommendation: 'چگالی مصالح، مبنای رطوبت و آب آزاد و جرم بچ را بررسی و سپس مقادیر را برای بسته‌شدن معادله حجم مطلق تنظیم کنید.',
      evidence: [`خطای بسته‌شدن ${analysis.volumeClosureErrorPercent.toFixed(1)}٪`],
    });
  }

  if (analysis.wCm > 0.50 && fineFraction < 0.35) {
    items.push({
      id: 'bleeding-segregation', severity: 'warning', title: 'حساسیت به آب‌انداختگی و جداشدگی',
      observation: 'نسبت آب به مواد سیمانی بالا همزمان با سهم نسبتاً پایین سنگدانه ریز مشاهده شده است.',
      consequence: 'این ترکیب می‌تواند پایداری ماتریس را کاهش داده و مهاجرت آب آزاد یا نشست ذرات درشت را افزایش دهد.',
      cause: 'نیاز آب و دانه‌بندی اسکلت برای حفظ انسجام متعادل نیستند.',
      recommendation: 'ریزدانه و دانه‌بندی را اصلاح کنید و با افزایش بازده افزودنی، آب آزاد را قبل از افزایش غیرهدفمند سیمان کاهش دهید.',
      evidence: [`نسبت آب به مواد سیمانی ${analysis.wCm.toFixed(3)}`, `سنگدانه ریز ${(fineFraction * 100).toFixed(1)}٪ از حجم سنگدانه`],
    });
  }

  const critical = items.filter((i) => i.severity === 'critical').length;
  const warnings = items.filter((i) => i.severity === 'warning').length;
  const penalty = critical * 22 + warnings * 9;
  const score = clamp(Math.round(100 - penalty), 0, 100);
  return { score, critical, warnings, items };
}
