export type GradationEnvelopePreset = 'aci-normal' | 'high-strength' | 'pumpable' | 'self-consolidating' | 'custom';

export interface GradationEnvelopePoint { sieveMm:number; lower:number; upper:number; }
export interface GradationEnvelope { id:GradationEnvelopePreset; labelFa:string; descriptionFa:string; points:GradationEnvelopePoint[]; referenceFa:string; }

// TOLUE engineering screening envelopes. The default ACI mode uses the Power-45 / combined-grading
// concepts described by ACI PRC-211.10-24 as a visualization baseline; it is not a code acceptance limit.
const baseSieves=[25,19,12.5,9.5,4.75,2.36,1.18,0.6,0.3,0.15,0.075];
function power45(s:number,d=25){return Math.max(0,Math.min(100,100*Math.pow(Math.min(s,d)/d,0.45)));}
function band(width:number,shift=0):GradationEnvelopePoint[]{return baseSieves.map(s=>{const c=Math.max(0,Math.min(100,power45(s)+shift));return{sieveMm:s,lower:Math.max(0,c-width),upper:Math.min(100,c+width)};});}

export const GRADATION_ENVELOPES:Record<GradationEnvelopePreset,GradationEnvelope>={
 'aci-normal':{id:'aci-normal',labelFa:'ACI — بتن معمولی',descriptionFa:'بازه راهنمای TOLUE پیرامون منحنی Power 0.45 برای ارزیابی دانه‌بندی مرکب بتن معمولی.',points:band(10),referenceFa:'ACI PRC-211.10-24 — Combined aggregate grading / Power 45 (راهنما، نه حد پذیرش آیین‌نامه‌ای)'},
 'high-strength':{id:'high-strength',labelFa:'بتن پرمقاومت',descriptionFa:'پروفایل تحلیلی TOLUE برای بررسی گرایش به سنگدانه ریزتر و قابلیت تراکم در بتن پرمقاومت.',points:band(9,4),referenceFa:'TOLUE engineering screening profile; verify project requirements and aggregate standards.'},
 'pumpable':{id:'pumpable',labelFa:'بتن پمپی',descriptionFa:'پروفایل تحلیلی با تأکید بیشتر بر پیوستگی بخش میانی و ریزدانه برای قابلیت پمپاژ.',points:band(8,7),referenceFa:'TOLUE engineering screening profile; verify pump, materials and project specification.'},
 'self-consolidating':{id:'self-consolidating',labelFa:'بتن خودتراکم SCC',descriptionFa:'پروفایل تحلیلی اولیه برای مشاهده دانه‌بندی مرکب در مخلوط‌های با روانی بسیار بالا؛ جایگزین طراحی SCC نیست.',points:band(8,10),referenceFa:'TOLUE engineering screening profile; SCC requires dedicated fresh-property verification.'},
 'custom':{id:'custom',labelFa:'بازه سفارشی',descriptionFa:'حد بالا و پایین قابل ویرایش توسط کاربر.',points:band(10),referenceFa:'User-defined engineering envelope.'},
};

export function interpolateEnvelope(points:GradationEnvelopePoint[],sieveMm:number){const sorted=[...points].sort((a,b)=>b.sieveMm-a.sieveMm);if(!sorted.length)return null;if(sieveMm>=sorted[0].sieveMm)return sorted[0];if(sieveMm<=sorted[sorted.length-1].sieveMm)return sorted[sorted.length-1];for(let i=0;i<sorted.length-1;i++){const a=sorted[i],b=sorted[i+1];if(sieveMm<=a.sieveMm&&sieveMm>=b.sieveMm){const t=(Math.log(sieveMm)-Math.log(b.sieveMm))/Math.max(1e-9,Math.log(a.sieveMm)-Math.log(b.sieveMm));return{sieveMm,lower:b.lower+(a.lower-b.lower)*t,upper:b.upper+(a.upper-b.upper)*t};}}return null;}
