import type { ConcreteProject } from '../domain/project';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { DiagnosticSummary } from './diagnostics';
import type { PackingResult } from './packing';
import type { CompactionState } from './compaction';

export interface AIReviewPayload { prompt:string; compactData:string; ready:boolean; summary:{packing:string;voids:string;closure:string;score:string}; }

const faSeverity=(value:string)=>value==='critical'?'بحرانی':value==='warning'?'هشدار':value==='positive'?'مثبت':'مشاهده';
const fmt=(value:number,digits=2)=>Number.isFinite(value)?value.toFixed(digits):'—';

export function buildAIReviewPrompt(project:ConcreteProject,mix:MixDesign,analysis:MixAnalysis,packing:PackingResult,diagnostics:DiagnosticSummary,compaction?:CompactionState):AIReviewPayload{
 const ready=(compaction?.progress??0)>=0.999;
 const materials=mix.materials.map(m=>`• ${m.label}: ${fmt(m.massKgPerM3,1)} kg/m³ | چگالی ورودی: ${fmt(m.densityKgPerM3,0)} kg/m³`).join('\n');
 const gradations=mix.gradations.map(c=>`• ${c.label}: ${c.points.map(p=>`${p.sieveMm} mm = ${p.passingPercent}% عبوری`).join('، ')}`).join('\n')||'• داده دانه‌بندی ثبت نشده است.';
 const diagnosticText=diagnostics.items.map(i=>`• [${faSeverity(i.severity)}] ${i.title}\n  مشاهده: ${i.observation}\n  سازوکار/علت محتمل: ${i.cause}\n  پیشنهاد فعلی نرم‌افزار: ${i.recommendation}`).join('\n')||'• هشدار فعال در موتور تشخیص قاعده‌محور ثبت نشده است.';
 const compactData=[
  `پروژه: ${project.metadata.projectNumber} | ${project.metadata.name}`,
  `طرح اختلاط: ${mix.name} | شناسه: ${mix.id}`,
  `وضعیت شبیه‌سازی: ${ready?'اجرا و تکمیل شده':'هنوز تکمیل نشده'}`,
  `پیشرفت تراکم: ${fmt((compaction?.progress??0)*100,0)}٪`,
  `مرحله تراکم: ${compaction?.stage==='compacted'?'متراکم':compaction?.stage==='vibrating'?'در حال ارتعاش/تراکم':'حالت اولیه'}`,
  `نسبت آب به مواد سیمانی w/cm: ${fmt(analysis.wCm,3)}`,
  `حجم خمیر: ${fmt(analysis.pasteVolumeM3,4)} m³/m³`,
  `حجم ملات: ${fmt(analysis.mortarVolumeM3,4)} m³/m³`,
  `حجم سنگدانه: ${fmt(analysis.aggregateVolumeM3,4)} m³/m³`,
  `هوای هدف: ${fmt(mix.targetAirPercent,1)}٪`,
  `تراکم دانه‌ای برآوردی: ${fmt(packing.packingDensity*100,2)}٪`,
  `فضای خالی برآوردی: ${fmt(packing.voidFraction*100,2)}٪`,
  `نسبت فضای خالی: ${fmt(packing.voidRatio,4)}`,
  `خطای بسته‌شدن حجم: ${fmt(analysis.volumeClosureErrorPercent,2)}٪`,
  `امتیاز تشخیص مهندسی: ${diagnostics.score}/100`,
  `تعداد ذرات نماینده در مدل: ${packing.particles.length}`,
 ].join('\n');
 const prompt=`تو «دستیار ارشد تحلیل مهندسی TOLUE Concrete Compaction» هستی؛ سامانه تخصصی تحلیل طرح اختلاط، دانه‌بندی، تراکم و ساختار اجزای بتن، طراحی‌شده توسط مهندس عرفان امیری. پاسخ باید کاملاً فارسی، فنی، عدد‌محور، شفاف و قابل استفاده برای مهندس بتن باشد.

## ۱) حدود اعتبار و روش تحلیل
- فقط از داده‌های همین پرونده، نتایج آزمایشگاهی پیوست‌شده، تصاویر پیوست‌شده و استانداردهایی که صریحاً مشخص شده‌اند نتیجه‌گیری کن.
- «داده ورودی»، «کمیت محاسباتی»، «خروجی مدل/شبیه‌سازی»، «فرض مهندسی» و «توصیه» را از یکدیگر جدا کن.
- خروجی Packing و تراکم TOLUE در این نسخه یک مدل مهندسی/سینماتیکی نماینده است؛ آن را DEM، CFD یا نتیجه آزمایشگاهی اعتبارسنجی‌شده معرفی نکن.
- هیچ محدوده پذیرش استانداردی را از خودت نساز. اگر استاندارد، کلاس محیطی یا معیار پروژه برای تصمیم قطعی کافی نیست، صریحاً بنویس «برای پذیرش استانداردی داده کافی نیست».
- همبستگی را به‌جای رابطه علت و معلولی قطعی گزارش نکن. برای هر نتیجه مهم، شواهد عددی را ذکر کن.

## ۲) مأموریت تحلیل
1. صحت ورودی و بسته‌شدن حجم مطلق را بررسی کن؛ w/cm، هوا، خمیر، ملات و سهم سنگدانه را با هم تفسیر کن.
2. منحنی‌های دانه‌بندی را از نظر پیوستگی، گپ، کمبود/افزایش ریزدانه و درشت‌دانه و اثر محتمل بر Packing بررسی کن.
3. تراکم دانه‌ای، Void Fraction و Void Ratio شبیه‌سازی را کنار حجم خمیر و ملات تحلیل کن؛ از نتیجه‌گیری فراتر از مدل خودداری کن.
4. ریسک‌های بتن تازه شامل کارایی، چسبندگی، جداشدگی، آب‌انداختگی، قابلیت پمپاژ، پرداخت‌پذیری و حساسیت به تراکم را رتبه‌بندی کن.
5. اثرات محتمل بر مقاومت، جمع‌شدگی و دوام را فقط در حدی بیان کن که داده‌ها پشتیبانی می‌کنند.
6. تشخیص‌های قاعده‌محور نرم‌افزار را مستقل بازبینی کن؛ صرفاً آنها را تکرار نکن.
7. اگر تصویر سه‌بعدی/مقطع/نمونه آزمایشگاهی پیوست شد، شواهد بصری را در بخش جداگانه تحلیل و از داده عددی تفکیک کن.
8. برای هر مشکل بنویس: «شاهد → سازوکار محتمل → پیامد → اصلاح پیشنهادی → بده‌بستان اصلاح → آزمون تأییدکننده».
9. چند متغیر را هم‌زمان و کورکورانه تغییر نده. یک برنامه Trial Mix مرحله‌ای ارائه کن و متغیر اولویت اول را مشخص کن.
10. در پایان یکی از سه تصمیم را انتخاب کن: «مناسب برای ادامه آزمون»، «نیازمند اصلاح طرح»، «داده ناکافی برای تصمیم».

## ۳) مشخصات پروژه
شماره پروژه: ${project.metadata.projectNumber}
نام پروژه: ${project.metadata.name}
کارفرما: ${project.metadata.client||'ثبت نشده'}
محل: ${project.metadata.location||'ثبت نشده'}
شرح: ${project.metadata.description||'ثبت نشده'}

## ۴) ترکیب مصالح در یک مترمکعب
${materials}
هوای هدف: ${fmt(mix.targetAirPercent,1)}٪

## ۵) داده دانه‌بندی
${gradations}

## ۶) خروجی عددی TOLUE پس از شبیه‌سازی
${compactData}

## ۷) تشخیص‌های فعلی موتور مهندسی
${diagnosticText}

## ۸) قالب اجباری پاسخ
پاسخ را دقیقاً با این ساختار ارائه کن:
### خلاصه تصمیم مهندسی
حداکثر 8 خط؛ مهم‌ترین نتیجه، ریسک غالب و اقدام اولویت اول.
### کنترل کیفیت داده‌های ورودی
موارد معتبر، مشکوک و داده‌های مفقود.
### تحلیل حجمی و نسبت‌های طرح
جدول «پارامتر | مقدار | تفسیر | سطح اطمینان».
### تحلیل دانه‌بندی و Packing
رفتار PSD، تراکم دانه‌ای و فضای خالی همراه با شواهد عددی.
### تحلیل رفتار بتن تازه و تراکم
کارایی، پایداری، جداشدگی، آب‌انداختگی، پمپاژ و حساسیت اجرایی.
### مقاومت، دوام و جمع‌شدگی
فقط استنباط‌های قابل دفاع و محدودیت آنها.
### تحلیل تصویر
فقط در صورت وجود تصویر؛ شواهد بصری را جداگانه بنویس.
### ماتریس ریسک
جدول «موضوع | سطح ریسک: بحرانی/هشدار/مشاهده/مثبت | شاهد | پیامد».
### اصلاحات اولویت‌بندی‌شده
حداکثر 5 اقدام؛ برای هر اقدام اثر مورد انتظار و Trade-off را ذکر کن.
### برنامه Trial Mix و آزمون‌های تأییدی
ترتیب تغییر متغیرها و آزمایش لازم برای راستی‌آزمایی.
### تصمیم نهایی
یکی از سه تصمیم مجاز + دلیل کوتاه.

در سراسر پاسخ از اعداد همین پرونده استفاده کن و هرجا قطعیت کافی نیست، سطح اطمینان را «بالا/متوسط/پایین» مشخص کن.`;
 return{prompt,compactData,ready,summary:{packing:`${fmt(packing.packingDensity*100,1)}٪`,voids:`${fmt(packing.voidFraction*100,1)}٪`,closure:`${fmt(analysis.volumeClosureErrorPercent,2)}٪`,score:`${diagnostics.score}/100`}};
}
