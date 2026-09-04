import type { MixDesign } from '../domain/mixDesign';
import type { RebarAnalysisResult, RebarNetworkInput } from '../domain/rebarAnalysis';

const clamp=(v:number,min=0,max=100)=>Math.min(max,Math.max(min,v));

function estimateAggregateDmaxMm(mix: MixDesign): number {
  const aggregateGradations=mix.gradations.filter(g=>g.materialKey==='aggregate5to12'||g.materialKey==='aggregate12to25');
  const candidates=aggregateGradations.flatMap(g=>g.points).filter(p=>p.passingPercent<99.5).map(p=>p.sieveMm);
  if(candidates.length) return Math.max(...candidates);
  const all=aggregateGradations.flatMap(g=>g.points).map(p=>p.sieveMm);
  return all.length?Math.max(...all):25;
}

export function analyzeRebarPlacement(mix: MixDesign,input: RebarNetworkInput): RebarAnalysisResult {
  const clearX=Math.max(0,input.x.centerSpacingMm-input.x.barDiameterMm);
  const clearY=Math.max(0,input.y.centerSpacingMm-input.y.barDiameterMm);
  const governing=Math.min(clearX,clearY,input.layers>1?input.clearLayerSpacingMm:Number.POSITIVE_INFINITY);
  const dmax=Math.max(1,estimateAggregateDmaxMm(mix));
  const ratio=governing/dmax;

  // Internal TOLUE engineering heuristic v1. Not a standards acceptance check.
  const aggregatePassingIndex=clamp((ratio-1)*42+38);
  const barAreaX=Math.PI*Math.pow(input.x.barDiameterMm/2,2)/Math.max(1,input.x.centerSpacingMm);
  const barAreaY=Math.PI*Math.pow(input.y.barDiameterMm/2,2)/Math.max(1,input.y.centerSpacingMm);
  const layerPenalty=Math.max(0,input.layers-1)*11;
  const geometricCongestion=clamp(100-(barAreaX+barAreaY)*1.45-layerPenalty);
  const congestionIndex=Math.round(geometricCongestion);

  const vibratorClearance=Math.min(governing,Math.max(0,input.memberThicknessMm-2*input.coverMm));
  const vibratorRatio=vibratorClearance/Math.max(1,input.vibratorHeadDiameterMm);
  const vibratorAccessibilityIndex=Math.round(clamp((vibratorRatio-.8)*62+40));

  const score=Math.round(clamp(aggregatePassingIndex*.5+congestionIndex*.28+vibratorAccessibilityIndex*.22));
  const level=score>=75?'good':score>=50?'attention':'critical';
  const labelFa=level==='good'?'مناسب':level==='attention'?'نیازمند بررسی':'ریسک بالا';
  const notesFa:string[]=[];
  if(ratio<1.25) notesFa.push('گلوگاه شبکه به اندازه سنگدانه درشت نزدیک است و ریسک پل‌زدگی یا گیرکردن ذرات افزایش می‌یابد.');
  else if(ratio<1.8) notesFa.push('عبور سنگدانه ممکن است، اما شبکه نسبتاً متراکم است و کنترل اجرا اهمیت دارد.');
  else notesFa.push('از نظر هندسی فضای عبور مناسبی نسبت به اندازه سنگدانه تخمین زده شد.');
  if(vibratorAccessibilityIndex<50) notesFa.push('فضای مؤثر برای ورود یا حرکت سر ویبراتور محدود ارزیابی شد.');
  if(input.layers>2) notesFa.push('تعداد لایه‌های آرماتور می‌تواند مسیر عبور بتن را پیچیده‌تر و احتمال حبس هوا را بیشتر کند.');
  notesFa.push('این نتیجه فعلاً مدل مهندسی داخلی TOLUE است و جایگزین کنترل ضوابط رسمی پروژه یا استاندارد انتخاب‌شده نیست.');

  return {
    clearOpeningXmm:Number(clearX.toFixed(1)),
    clearOpeningYmm:Number(clearY.toFixed(1)),
    governingClearOpeningMm:Number(governing.toFixed(1)),
    estimatedAggregateDmaxMm:Number(dmax.toFixed(1)),
    openingToAggregateRatio:Number(ratio.toFixed(2)),
    aggregatePassingIndex:Math.round(aggregatePassingIndex),
    congestionIndex,
    vibratorAccessibilityIndex,
    reinforcedPlacementScore:score,
    level,
    labelFa,
    notesFa,
    method:'tcc-rebar-heuristic-v1',
  };
}
