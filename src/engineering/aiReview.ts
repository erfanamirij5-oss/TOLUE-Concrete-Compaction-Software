import type { ConcreteProject } from '../domain/project';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { RebarNetworkInput } from '../domain/rebarAnalysis';
import type { DiagnosticSummary } from './diagnostics';
import type { PackingResult } from './packing';
import type { CompactionState } from './compaction';
import { analyzeRebarBridgeRisk } from './rebarBridgeRisk';

export interface AIReviewPayload { prompt:string; compactData:string; ready:boolean; summary:{packing:string;voids:string;closure:string;score:string;bridge:string;dmax:string}; dossier:{riskLevel:'کم'|'متوسط'|'زیاد';priority:string;trialMix:string[]}; }

const faSeverity=(value:string)=>value==='critical'?'بحرانی':value==='warning'?'هشدار':value==='positive'?'مثبت':'مشاهده';
const fmt=(value:number,digits=2)=>Number.isFinite(value)?value.toFixed(digits):'—';
const defaultRebar:RebarNetworkInput={memberType:'wall',x:{barDiameterMm:16,centerSpacingMm:150},y:{barDiameterMm:16,centerSpacingMm:150},layers:2,clearLayerSpacingMm:120,coverMm:40,memberThicknessMm:250,vibratorHeadDiameterMm:38,internalGrid:true,interiorVerticalSpacingMm:300,internalTies:true};

export function buildAIReviewPrompt(project:ConcreteProject,mix:MixDesign,analysis:MixAnalysis,packing:PackingResult,diagnostics:DiagnosticSummary,compaction?:CompactionState,rebarNetwork:RebarNetworkInput=defaultRebar):AIReviewPayload{
 const ready=(compaction?.progress??0)>=0.999;
 const dmax=Math.max(0,...packing.particles.map(p=>p.diameterMm||0));
 const clearX=Math.max(1,rebarNetwork.x.centerSpacingMm-rebarNetwork.x.barDiameterMm),clearZ=Math.max(1,rebarNetwork.y.centerSpacingMm-rebarNetwork.y.barDiameterMm),clearInternal=Math.max(1,(rebarNetwork.interiorVerticalSpacingMm??300)-Math.max(rebarNetwork.x.barDiameterMm,rebarNetwork.y.barDiameterMm));
 const governing=Math.min(clearX,clearZ,clearInternal,rebarNetwork.layers>1?rebarNetwork.clearLayerSpacingMm:Infinity),openingRatio=dmax>0?governing/dmax:99;
 const bridge=analyzeRebarBridgeRisk(packing,rebarNetwork);
 const riskLevel:'کم'|'متوسط'|'زیاد'=bridge.level==='high'||diagnostics.items.some(i=>i.severity==='critical')?'زیاد':bridge.level==='attention'||diagnostics.items.some(i=>i.severity==='warning')?'متوسط':'کم';
 const priority=bridge.level==='high'?'کنترل گلوگاه آرماتور، Dmax و قابلیت عبور سنگدانه پیش از اصلاح سایر متغیرها':Math.abs(analysis.volumeClosureErrorPercent)>3?'اصلاح بسته‌شدن حجم و کنترل صحت جرم/چگالی مصالح پیش از تفسیر شبیه‌سازی':'بازبینی دانه‌بندی ترکیبی، فضای خالی و نیاز خمیر با Trial Mix کنترل‌شده';
 const trialMix=[`مرحله ۱: متغیر اولویت‌دار — ${priority}.`,`مرحله ۲: فقط یک متغیر مؤثر را تغییر بده و سایر ورودی‌ها را ثابت نگه دار؛ سپس Packing، Void و رفتار بتن تازه را دوباره ثبت کن.`,`مرحله ۳: نتیجه را با طرح پایه مقایسه و فقط در صورت بهبود قابل دفاع وارد مرحله اصلاح بعدی شو.`];
 const materials=mix.materials.map(m=>`• ${m.label}: ${fmt(m.massKgPerM3,1)} kg/m³ | چگالی ورودی: ${fmt(m.densityKgPerM3,0)} kg/m³`).join('\n');
 const gradations=mix.gradations.map(c=>`• ${c.label}: ${c.points.map(p=>`${p.sieveMm} mm = ${p.passingPercent}% عبوری`).join('، ')}`).join('\n')||'• داده دانه‌بندی ثبت نشده است.';
 const diagnosticText=diagnostics.items.map(i=>`• [${faSeverity(i.severity)}] ${i.title}\n  مشاهده: ${i.observation}\n  سازوکار/علت محتمل: ${i.cause}\n  پیشنهاد فعلی نرم‌افزار: ${i.recommendation}`).join('\n')||'• هشدار فعال در موتور تشخیص قاعده‌محور ثبت نشده است.';
 const compactData=[`پروژه: ${project.metadata.projectNumber} | ${project.metadata.name}`,`طرح اختلاط: ${mix.name} | شناسه: ${mix.id}`,`وضعیت شبیه‌سازی: ${ready?'اجرا و تکمیل شده':'هنوز تکمیل نشده'}`,`پیشرفت تراکم: ${fmt((compaction?.progress??0)*100,0)}٪`,`مرحله تراکم: ${compaction?.stage==='compacted'?'متراکم':compaction?.stage==='vibrating'?'در حال ارتعاش/تراکم':'حالت اولیه'}`,`نسبت آب به مواد سیمانی w/cm: ${fmt(analysis.wCm,3)}`,`حجم خمیر: ${fmt(analysis.pasteVolumeM3,4)} m³/m³`,`حجم ملات: ${fmt(analysis.mortarVolumeM3,4)} m³/m³`,`حجم سنگدانه: ${fmt(analysis.aggregateVolumeM3,4)} m³/m³`,`هوای هدف: ${fmt(mix.targetAirPercent,1)}٪`,`تراکم دانه‌ای برآوردی: ${fmt(packing.packingDensity*100,2)}٪`,`فضای خالی برآوردی: ${fmt(packing.voidFraction*100,2)}٪`,`نسبت فضای خالی: ${fmt(packing.voidRatio,4)}`,`خطای بسته‌شدن حجم: ${fmt(analysis.volumeClosureErrorPercent,2)}٪`,`امتیاز تشخیص مهندسی: ${diagnostics.score}/100`,`تعداد ذرات نماینده در مدل: ${packing.particles.length}`,`Dmax نماینده مدل: ${fmt(dmax,1)} mm`,`گلوگاه حاکم شبکه آرماتور: ${fmt(governing,1)} mm`,`نسبت گلوگاه به Dmax: ${fmt(openingRatio,2)}`,`ریسک پل‌زدگی TOLUE: ${bridge.level} | امتیاز ${bridge.score}/100 | سهم حساس ${bridge.candidateSharePercent}٪ | سهم بحرانی ${bridge.criticalSharePercent}٪`,`قفس داخلی: ${rebarNetwork.internalGrid!==false?'فعال':'غیرفعال'} | فاصله شبکه داخلی ${fmt(rebarNetwork.interiorVerticalSpacingMm??300,0)} mm | لایه‌ها ${rebarNetwork.layers}`,`سطح ریسک پرونده Copilot: ${riskLevel}`,`اقدام اولویت اول: ${priority}`].join('\n');
 const prompt=ready?`تو «Engineering Copilot ارشد TOLUE Concrete Compaction» هستی؛ سامانه تخصصی تحلیل طرح اختلاط، دانه‌بندی، تراکم، عبور سنگدانه و ساختار آرماتور، طراحی‌شده توسط مهندس عرفان امیری. پاسخ باید کاملاً فارسی، فنی، عدد‌محور و تصمیم‌یار باشد.

## پرونده مهندسی خودکار TOLUE
${compactData}

## ترکیب مصالح
${materials}

## داده دانه‌بندی
${gradations}

## تشخیص‌های موتور داخلی
${diagnosticText}

## قواعد Copilot
- داده ورودی، کمیت محاسباتی، خروجی شبیه‌سازی، فرض مهندسی و توصیه را جدا نگه دار.
- Packing، Compaction، Heatmap و Bridge Risk این نسخه مدل‌های مهندسی/نماینده TOLUE هستند؛ آنها را DEM، CFD، نتیجه آزمایشگاهی یا معیار پذیرش آیین‌نامه‌ای معرفی نکن.
- هیچ حد استانداردی را اختراع نکن. نبود معیار پروژه یا داده آزمایشگاهی را صریح گزارش کن.
- تناقض‌ها را فعالانه پیدا کن: بسته‌شدن حجم، w/cm، خمیر/ملات، PSD، Dmax، گلوگاه آرماتور، ریسک پل‌زدگی و تشخیص‌های داخلی را با هم Cross-check کن.
- تشخیص داخلی نرم‌افزار را مستقل نقد کن؛ صرفاً تکرار نکن.
- برای هر مسئله زنجیره «شاهد عددی → سازوکار محتمل → پیامد → اصلاح → Trade-off → آزمون تأیید» ارائه کن.
- اصلاحات را مرحله‌ای کن و چند متغیر را هم‌زمان تغییر نده.
- اگر تصویر سه‌بعدی/Heatmap/مقطع پیوست شده، آن را شواهد بصری مستقل بدان و با داده عددی ادغام کورکورانه نکن.

## برنامه Trial Mix پیشنهادی اولیه TOLUE
${trialMix.map(x=>`- ${x}`).join('\n')}

## قالب اجباری پاسخ
### ۱. حکم مهندسی Copilot
یکی از «مناسب برای ادامه آزمون / نیازمند اصلاح طرح / داده ناکافی برای تصمیم» + سطح اطمینان.
### ۲. سه یافته تعیین‌کننده
جدول «یافته | شاهد عددی | اهمیت | اطمینان».
### ۳. کنترل کیفیت و تناقض داده‌ها
ورودی‌های معتبر، مشکوک، مفقود و هر تناقض بین محاسبات و شبیه‌سازی.
### ۴. تحلیل حجمی و طرح اختلاط
w/cm، هوا، خمیر، ملات، سنگدانه و بسته‌شدن حجم.
### ۵. دانه‌بندی، Packing و Void
PSD، گپ‌ها، Dmax، تراکم دانه‌ای و نیاز احتمالی خمیر.
### ۶. آرماتور، عبور سنگدانه و تراکم موضعی
گلوگاه/Dmax، Bridge Risk، قفس داخلی و اثر محتمل بر دسترسی و تراکم؛ محدودیت مدل را ذکر کن.
### ۷. رفتار بتن تازه
کارایی، چسبندگی، جداشدگی، آب‌انداختگی، پمپاژ و پرداخت‌پذیری فقط در حد داده موجود.
### ۸. مقاومت، دوام و جمع‌شدگی
فقط استنباط قابل دفاع؛ نیاز به آزمون را مشخص کن.
### ۹. ماتریس ریسک
«موضوع | سطح | شاهد | پیامد | اقدام».
### ۱۰. اصلاحات اولویت‌بندی‌شده
حداکثر ۵ اقدام با Trade-off و شاخصی که باید بعد از اصلاح بهتر شود.
### ۱۱. برنامه Trial Mix
ترتیب آزمایش، متغیر ثابت/متغیر تغییر، خروجی مورد پایش و معیار توقف/ادامه.
### ۱۲. داده‌های لازم برای تصمیم بهتر
فهرست کوتاه داده یا آزمون مفقود.

در تمام پاسخ از اعداد همین پرونده استفاده کن؛ هرجا قطعیت کافی نیست سطح اطمینان «بالا/متوسط/پایین» بده.`:'';
 return{prompt,compactData,ready,summary:{packing:`${fmt(packing.packingDensity*100,1)}٪`,voids:`${fmt(packing.voidFraction*100,1)}٪`,closure:`${fmt(analysis.volumeClosureErrorPercent,2)}٪`,score:`${diagnostics.score}/100`,bridge:`${bridge.score}/100`,dmax:`${fmt(dmax,1)} mm`},dossier:{riskLevel,priority,trialMix}};
}
