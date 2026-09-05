import type { GradationCurve, MixAnalysis, MixDesign } from '../domain/mixDesign';

export type ASTMComplianceStatus = 'compliant' | 'noncompliant' | 'insufficient';
export type ASTMCoarseSizeNo = '5' | '56' | '57' | '6' | '67' | '68' | '7' | '78' | '8' | '89' | '9';

export interface ASTMSieveLimit {
  sieveMm: number;
  minPassing: number;
  maxPassing: number;
}

export interface ASTMSieveCheck extends ASTMSieveLimit {
  measuredPassing: number | null;
  status: ASTMComplianceStatus;
}

export interface ASTMGradationCheck {
  id: string;
  labelFa: string;
  designation: string;
  status: ASTMComplianceStatus;
  checks: ASTMSieveCheck[];
  failed: number;
  missing: number;
  meanDeviation: number;
}

export interface ASTMC33Compliance {
  standard: 'ASTM C33/C33M-24a';
  testMethod: 'ASTM C136/C136M-25';
  status: ASTMComplianceStatus;
  fine: ASTMGradationCheck;
  coarse: ASTMGradationCheck;
  selectedCoarseSizeNo: ASTMCoarseSizeNo;
  suggestedCoarseSizeNo: ASTMCoarseSizeNo;
  noteFa: string;
}

export const ASTM_C33_FINE_GRADING: ASTMSieveLimit[] = [
  { sieveMm: 9.5, minPassing: 100, maxPassing: 100 },
  { sieveMm: 4.75, minPassing: 95, maxPassing: 100 },
  { sieveMm: 2.36, minPassing: 80, maxPassing: 100 },
  { sieveMm: 1.18, minPassing: 50, maxPassing: 85 },
  { sieveMm: 0.6, minPassing: 25, maxPassing: 60 },
  { sieveMm: 0.3, minPassing: 5, maxPassing: 30 },
  { sieveMm: 0.15, minPassing: 0, maxPassing: 10 },
];

// Machine-readable standard-size grading envelopes used for concrete coarse aggregate selection.
// Size-number designations are cross-referenced with the ASTM D448 / AASHTO M43 standard-size system.
export const ASTM_C33_COARSE_PROFILES: Record<ASTMCoarseSizeNo, ASTMSieveLimit[]> = {
  '5': [
    { sieveMm: 37.5, minPassing: 100, maxPassing: 100 },
    { sieveMm: 25, minPassing: 90, maxPassing: 100 },
    { sieveMm: 19, minPassing: 20, maxPassing: 55 },
    { sieveMm: 12.5, minPassing: 0, maxPassing: 10 },
    { sieveMm: 9.5, minPassing: 0, maxPassing: 5 },
  ],
  '56': [
    { sieveMm: 37.5, minPassing: 100, maxPassing: 100 },
    { sieveMm: 25, minPassing: 90, maxPassing: 100 },
    { sieveMm: 19, minPassing: 40, maxPassing: 85 },
    { sieveMm: 12.5, minPassing: 10, maxPassing: 40 },
    { sieveMm: 9.5, minPassing: 0, maxPassing: 15 },
    { sieveMm: 4.75, minPassing: 0, maxPassing: 5 },
  ],
  '57': [
    { sieveMm: 37.5, minPassing: 100, maxPassing: 100 },
    { sieveMm: 25, minPassing: 95, maxPassing: 100 },
    { sieveMm: 12.5, minPassing: 25, maxPassing: 60 },
    { sieveMm: 4.75, minPassing: 0, maxPassing: 10 },
    { sieveMm: 2.36, minPassing: 0, maxPassing: 5 },
  ],
  '6': [
    { sieveMm: 25, minPassing: 100, maxPassing: 100 },
    { sieveMm: 19, minPassing: 90, maxPassing: 100 },
    { sieveMm: 12.5, minPassing: 20, maxPassing: 55 },
    { sieveMm: 9.5, minPassing: 0, maxPassing: 15 },
    { sieveMm: 4.75, minPassing: 0, maxPassing: 5 },
  ],
  '67': [
    { sieveMm: 25, minPassing: 100, maxPassing: 100 },
    { sieveMm: 19, minPassing: 90, maxPassing: 100 },
    { sieveMm: 9.5, minPassing: 20, maxPassing: 55 },
    { sieveMm: 4.75, minPassing: 0, maxPassing: 10 },
    { sieveMm: 2.36, minPassing: 0, maxPassing: 5 },
  ],
  '68': [
    { sieveMm: 25, minPassing: 100, maxPassing: 100 },
    { sieveMm: 19, minPassing: 90, maxPassing: 100 },
    { sieveMm: 9.5, minPassing: 30, maxPassing: 65 },
    { sieveMm: 4.75, minPassing: 5, maxPassing: 25 },
    { sieveMm: 2.36, minPassing: 0, maxPassing: 10 },
    { sieveMm: 1.18, minPassing: 0, maxPassing: 5 },
  ],
  '7': [
    { sieveMm: 19, minPassing: 100, maxPassing: 100 },
    { sieveMm: 12.5, minPassing: 90, maxPassing: 100 },
    { sieveMm: 9.5, minPassing: 40, maxPassing: 70 },
    { sieveMm: 4.75, minPassing: 0, maxPassing: 15 },
    { sieveMm: 2.36, minPassing: 0, maxPassing: 5 },
  ],
  '78': [
    { sieveMm: 19, minPassing: 100, maxPassing: 100 },
    { sieveMm: 12.5, minPassing: 90, maxPassing: 100 },
    { sieveMm: 9.5, minPassing: 40, maxPassing: 75 },
    { sieveMm: 4.75, minPassing: 5, maxPassing: 25 },
    { sieveMm: 2.36, minPassing: 0, maxPassing: 10 },
    { sieveMm: 1.18, minPassing: 0, maxPassing: 5 },
  ],
  '8': [
    { sieveMm: 12.5, minPassing: 100, maxPassing: 100 },
    { sieveMm: 9.5, minPassing: 85, maxPassing: 100 },
    { sieveMm: 4.75, minPassing: 10, maxPassing: 30 },
    { sieveMm: 2.36, minPassing: 0, maxPassing: 10 },
    { sieveMm: 1.18, minPassing: 0, maxPassing: 5 },
  ],
  '89': [
    { sieveMm: 12.5, minPassing: 100, maxPassing: 100 },
    { sieveMm: 9.5, minPassing: 90, maxPassing: 100 },
    { sieveMm: 4.75, minPassing: 20, maxPassing: 55 },
    { sieveMm: 2.36, minPassing: 5, maxPassing: 30 },
    { sieveMm: 1.18, minPassing: 0, maxPassing: 10 },
    { sieveMm: 0.3, minPassing: 0, maxPassing: 5 },
  ],
  '9': [
    { sieveMm: 9.5, minPassing: 100, maxPassing: 100 },
    { sieveMm: 4.75, minPassing: 85, maxPassing: 100 },
    { sieveMm: 2.36, minPassing: 10, maxPassing: 40 },
    { sieveMm: 1.18, minPassing: 0, maxPassing: 10 },
    { sieveMm: 0.3, minPassing: 0, maxPassing: 5 },
  ],
};

export const ASTM_COARSE_SIZE_OPTIONS = (Object.keys(ASTM_C33_COARSE_PROFILES) as ASTMCoarseSizeNo[]);

function sorted(curve: GradationCurve) {
  return [...curve.points].filter(p => p.sieveMm > 0 && Number.isFinite(p.passingPercent)).sort((a,b)=>b.sieveMm-a.sieveMm);
}

function passingAt(curve: GradationCurve, sieveMm: number): number | null {
  const pts=sorted(curve);
  if(!pts.length) return null;
  const exact=pts.find(p=>Math.abs(p.sieveMm-sieveMm)<0.001);
  if(exact) return exact.passingPercent;
  if(sieveMm>pts[0].sieveMm) return pts[0].passingPercent>=99.5?100:null;
  if(sieveMm<pts[pts.length-1].sieveMm) return null;
  for(let i=0;i<pts.length-1;i+=1){
    const upper=pts[i], lower=pts[i+1];
    if(sieveMm<=upper.sieveMm && sieveMm>=lower.sieveMm){
      const t=(Math.log(sieveMm)-Math.log(lower.sieveMm))/Math.max(1e-9,Math.log(upper.sieveMm)-Math.log(lower.sieveMm));
      return lower.passingPercent+(upper.passingPercent-lower.passingPercent)*t;
    }
  }
  return null;
}

function combineCoarse(mix: MixDesign, analysis: MixAnalysis): GradationCurve | null {
  const keys=['aggregate5to12','aggregate12to25'] as const;
  const curves=keys.map(key=>mix.gradations.find(g=>g.materialKey===key));
  if(curves.some(c=>!c)) return null;
  const volumes=keys.map(key=>analysis.materials.find(m=>m.key===key)?.absoluteVolumeM3 ?? 0);
  const total=volumes.reduce((a,b)=>a+b,0);
  if(total<=0) return null;
  const sieves=[...new Set(curves.flatMap(c=>c!.points.map(p=>p.sieveMm)))].sort((a,b)=>b-a);
  return {
    materialKey:'aggregate12to25',
    label:'Combined coarse aggregate',
    points:sieves.map(sieveMm=>{
      let sum=0, represented=0;
      curves.forEach((curve,index)=>{
        const p=passingAt(curve!,sieveMm);
        if(p===null) return;
        const w=volumes[index]/total;
        sum+=p*w; represented+=w;
      });
      return {sieveMm,passingPercent:represented>0?sum/represented:0};
    }),
  };
}

function checkCurve(id:string,labelFa:string,designation:string,curve:GradationCurve | null | undefined,limits:ASTMSieveLimit[]):ASTMGradationCheck {
  const checks=limits.map(limit=>{
    const measuredPassing=curve?passingAt(curve,limit.sieveMm):null;
    const status:ASTMComplianceStatus=measuredPassing===null?'insufficient':measuredPassing>=limit.minPassing-0.01&&measuredPassing<=limit.maxPassing+0.01?'compliant':'noncompliant';
    return {...limit,measuredPassing:measuredPassing===null?null:Number(measuredPassing.toFixed(1)),status};
  });
  const failed=checks.filter(c=>c.status==='noncompliant').length;
  const missing=checks.filter(c=>c.status==='insufficient').length;
  const deviations=checks.filter(c=>c.measuredPassing!==null).map(c=>c.measuredPassing!<c.minPassing?c.minPassing-c.measuredPassing!:c.measuredPassing!>c.maxPassing?c.measuredPassing!-c.maxPassing:0);
  const meanDeviation=deviations.length?deviations.reduce((a,b)=>a+b,0)/deviations.length:100;
  const status:ASTMComplianceStatus=failed?'noncompliant':missing?'insufficient':'compliant';
  return {id,labelFa,designation,status,checks,failed,missing,meanDeviation:Number(meanDeviation.toFixed(2))};
}

export function suggestASTMCoarseSize(mix:MixDesign,analysis:MixAnalysis):ASTMCoarseSizeNo {
  const coarse=combineCoarse(mix,analysis);
  if(!coarse) return '57';
  return ASTM_COARSE_SIZE_OPTIONS
    .map(sizeNo=>checkCurve(`coarse-size-${sizeNo}`,'سنگدانه درشت مرکب',`Size No. ${sizeNo}`,coarse,ASTM_C33_COARSE_PROFILES[sizeNo]))
    .sort((a,b)=>a.failed-b.failed || a.missing-b.missing || a.meanDeviation-b.meanDeviation)[0].designation.replace('Size No. ','') as ASTMCoarseSizeNo;
}

export function evaluateASTMC33Compliance(mix:MixDesign,analysis:MixAnalysis,coarseSizeNo:ASTMCoarseSizeNo='57'):ASTMC33Compliance {
  const fineCurve=mix.gradations.find(g=>g.materialKey==='sand');
  const coarseCurve=combineCoarse(mix,analysis);
  const fine=checkCurve('fine-aggregate','ماسه بتن','Fine Aggregate',fineCurve,ASTM_C33_FINE_GRADING);
  const coarse=checkCurve(`coarse-size-${coarseSizeNo}`,'سنگدانه درشت مرکب',`Size No. ${coarseSizeNo}`,coarseCurve,ASTM_C33_COARSE_PROFILES[coarseSizeNo]);
  const status:ASTMComplianceStatus=fine.status==='noncompliant'||coarse.status==='noncompliant'?'noncompliant':fine.status==='insufficient'||coarse.status==='insufficient'?'insufficient':'compliant';
  return {
    standard:'ASTM C33/C33M-24a',
    testMethod:'ASTM C136/C136M-25',
    status,
    fine,
    coarse,
    selectedCoarseSizeNo:coarseSizeNo,
    suggestedCoarseSizeNo:suggestASTMCoarseSize(mix,analysis),
    noteFa:'این کنترل، انطباق دانه‌بندی با رده انتخاب‌شده را بررسی می‌کند. انتخاب Size No. باید مطابق مشخصات پروژه انجام شود؛ پیشنهاد نرم‌افزار فقط نزدیک‌ترین پروفایل عددی است و جایگزین انتخاب مهندس نیست. الزامات کیفیت، مواد زیان‌آور، واکنش‌زایی، دوام و مقدار عبوری 75 میکرون باید با آزمون‌های مربوطه جداگانه کنترل شوند.',
  };
}
