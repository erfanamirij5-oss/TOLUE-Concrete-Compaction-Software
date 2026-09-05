import type { GradationCurve, MixAnalysis, MixDesign } from '../domain/mixDesign';

export type ASTMComplianceStatus = 'compliant' | 'noncompliant' | 'insufficient';

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
  id: 'fine-aggregate' | 'coarse-size-57';
  labelFa: string;
  designation: string;
  status: ASTMComplianceStatus;
  checks: ASTMSieveCheck[];
  failed: number;
  missing: number;
}

export interface ASTMC33Compliance {
  standard: 'ASTM C33/C33M-24a';
  testMethod: 'ASTM C136/C136M';
  status: ASTMComplianceStatus;
  fine: ASTMGradationCheck;
  coarse: ASTMGradationCheck;
  noteFa: string;
}

// Numeric grading envelopes reproduced as machine-readable engineering limits.
// C33 includes additional quality/deleterious-material requirements that are not claimed here.
export const ASTM_C33_FINE_GRADING: ASTMSieveLimit[] = [
  { sieveMm: 9.5, minPassing: 100, maxPassing: 100 },
  { sieveMm: 4.75, minPassing: 95, maxPassing: 100 },
  { sieveMm: 2.36, minPassing: 80, maxPassing: 100 },
  { sieveMm: 1.18, minPassing: 50, maxPassing: 85 },
  { sieveMm: 0.6, minPassing: 25, maxPassing: 60 },
  { sieveMm: 0.3, minPassing: 5, maxPassing: 30 },
  { sieveMm: 0.15, minPassing: 0, maxPassing: 10 },
];

export const ASTM_C33_SIZE_57_GRADING: ASTMSieveLimit[] = [
  { sieveMm: 25, minPassing: 100, maxPassing: 100 },
  { sieveMm: 19, minPassing: 95, maxPassing: 100 },
  { sieveMm: 12.5, minPassing: 25, maxPassing: 60 },
  { sieveMm: 4.75, minPassing: 0, maxPassing: 10 },
  { sieveMm: 2.36, minPassing: 0, maxPassing: 5 },
];

function sorted(curve: GradationCurve) {
  return [...curve.points].filter(p => p.sieveMm > 0 && Number.isFinite(p.passingPercent)).sort((a,b)=>b.sieveMm-a.sieveMm);
}

function passingAt(curve: GradationCurve, sieveMm: number): number | null {
  const pts=sorted(curve);
  if(!pts.length) return null;
  const exact=pts.find(p=>Math.abs(p.sieveMm-sieveMm)<0.001);
  if(exact) return exact.passingPercent;
  if(sieveMm>pts[0].sieveMm || sieveMm<pts[pts.length-1].sieveMm) return null;
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

function checkCurve(id: ASTMGradationCheck['id'], labelFa:string, designation:string, curve:GradationCurve | null | undefined, limits:ASTMSieveLimit[]):ASTMGradationCheck {
  const checks=limits.map(limit=>{
    const measuredPassing=curve?passingAt(curve,limit.sieveMm):null;
    const status:ASTMComplianceStatus=measuredPassing===null?'insufficient':measuredPassing>=limit.minPassing-0.01&&measuredPassing<=limit.maxPassing+0.01?'compliant':'noncompliant';
    return {...limit,measuredPassing:measuredPassing===null?null:Number(measuredPassing.toFixed(1)),status};
  });
  const failed=checks.filter(c=>c.status==='noncompliant').length;
  const missing=checks.filter(c=>c.status==='insufficient').length;
  const status:ASTMComplianceStatus=failed?'noncompliant':missing?'insufficient':'compliant';
  return {id,labelFa,designation,status,checks,failed,missing};
}

export function evaluateASTMC33Compliance(mix:MixDesign,analysis:MixAnalysis):ASTMC33Compliance {
  const fineCurve=mix.gradations.find(g=>g.materialKey==='sand');
  const coarseCurve=combineCoarse(mix,analysis);
  const fine=checkCurve('fine-aggregate','ماسه بتن','Fine Aggregate',fineCurve,ASTM_C33_FINE_GRADING);
  const coarse=checkCurve('coarse-size-57','سنگدانه درشت مرکب','Size No. 57',coarseCurve,ASTM_C33_SIZE_57_GRADING);
  const status:ASTMComplianceStatus=fine.status==='noncompliant'||coarse.status==='noncompliant'?'noncompliant':fine.status==='insufficient'||coarse.status==='insufficient'?'insufficient':'compliant';
  return {
    standard:'ASTM C33/C33M-24a',
    testMethod:'ASTM C136/C136M',
    status,
    fine,
    coarse,
    noteFa:'این کنترل فقط انطباق دانه‌بندی را بررسی می‌کند. الزامات کیفیت، مواد زیان‌آور، واکنش‌زایی، دوام و مقدار عبوری 75 میکرون باید با داده‌های آزمون مربوطه جداگانه کنترل شوند.',
  };
}
