import type { MixAnalysis } from '../domain/mixDesign';
import { ACI_318_25_AIR, ACI_318_25_EXPOSURE, type ACIExposureClass } from './aci318_25';

export type StandardCheckStatus = 'pass'|'fail'|'insufficient';

export interface ACIStandardInput {
  classes: ACIExposureClass[];
  fcMpa?: number;
  nominalMaxAggregateMm?: number;
  measuredAirPercent?: number;
  chloridePercentByCementitious?: number;
  prestressed?: boolean;
}

export interface ACIStandardCheck {
  key:string;
  labelFa:string;
  status:StandardCheckStatus;
  actualFa:string;
  requiredFa:string;
  sourceFa:string;
}

export interface ACIComplianceResult {
  status:StandardCheckStatus;
  labelFa:string;
  checks:ACIStandardCheck[];
  governingMaxWcm:number|null;
  governingMinFcMpa:number;
  selectedClasses:ACIExposureClass[];
  method:'aci-318-25-ch19';
}

function airRequirement(classes:ACIExposureClass[], nominalMaxMm?:number){
  const freeze=classes.includes('F3')||classes.includes('F2')?'F2F3':classes.includes('F1')?'F1':null;
  if(!freeze) return null;
  if(nominalMaxMm===undefined) return undefined;
  const row=[...ACI_318_25_AIR].sort((a,b)=>Math.abs(a.nominalMaxMm-nominalMaxMm)-Math.abs(b.nominalMaxMm-nominalMaxMm))[0];
  return row[freeze];
}

export function evaluateACI31825Compliance(analysis:MixAnalysis,input:ACIStandardInput):ACIComplianceResult {
  const rules=input.classes.map(c=>ACI_318_25_EXPOSURE[c]);
  const maxWcms=rules.map(r=>r.maxWcm).filter((v):v is number=>v!==null);
  const governingMaxWcm=maxWcms.length?Math.min(...maxWcms):null;
  const governingMinFcMpa=rules.length?Math.max(...rules.map(r=>r.minFcMpa)):17;
  const checks:ACIStandardCheck[]=[];

  if(governingMaxWcm!==null){
    checks.push({key:'wcm',labelFa:'نسبت آب به مواد سیمانی',status:analysis.wCm<=governingMaxWcm?'pass':'fail',actualFa:analysis.wCm.toFixed(3),requiredFa:`≤ ${governingMaxWcm.toFixed(2)}`,sourceFa:'ACI 318-25 Table 19.3.2.1'});
  }

  checks.push({key:'fc',labelFa:'مقاومت فشاری مشخصه',status:input.fcMpa===undefined?'insufficient':input.fcMpa>=governingMinFcMpa?'pass':'fail',actualFa:input.fcMpa===undefined?'ثبت نشده':`${input.fcMpa.toFixed(1)} MPa`,requiredFa:`≥ ${governingMinFcMpa} MPa`,sourceFa:'ACI 318-25 Table 19.3.2.1'});

  const requiredAir=airRequirement(input.classes,input.nominalMaxAggregateMm);
  if(requiredAir!==null){
    checks.push({key:'air',labelFa:'هوای کل برای دوام یخ‌زدگی',status:requiredAir===undefined||input.measuredAirPercent===undefined?'insufficient':input.measuredAirPercent>=requiredAir?'pass':'fail',actualFa:input.measuredAirPercent===undefined?'ثبت نشده':`${input.measuredAirPercent.toFixed(1)}%`,requiredFa:requiredAir===undefined?'نیازمند اندازه اسمی حداکثر سنگدانه':`هدف ≥ ${requiredAir.toFixed(1)}%`,sourceFa:'ACI 318-25 Table 19.3.3.1'});
  }

  const corrosion=rules.filter(r=>r.category==='C').sort((a,b)=>['C0','C1','C2'].indexOf(b.code)-['C0','C1','C2'].indexOf(a.code))[0];
  if(corrosion){
    const limit=input.prestressed?corrosion.chloridePrestressedPercent:corrosion.chlorideNonPrestressedPercent;
    if(limit!==undefined){
      checks.push({key:'chloride',labelFa:'کلرید محلول ناشی از اجزای مخلوط',status:input.chloridePercentByCementitious===undefined?'insufficient':input.chloridePercentByCementitious<=limit?'pass':'fail',actualFa:input.chloridePercentByCementitious===undefined?'ثبت نشده':`${input.chloridePercentByCementitious.toFixed(3)}%`,requiredFa:`≤ ${limit.toFixed(2)}% جرم مواد سیمانی`,sourceFa:'ACI 318-25 Table 19.3.2.1'});
    }
  }

  const status:StandardCheckStatus=checks.some(c=>c.status==='fail')?'fail':checks.some(c=>c.status==='insufficient')?'insufficient':'pass';
  return {status,labelFa:status==='pass'?'مطابق ACI 318-25':status==='fail'?'نامطابق با ACI 318-25':'داده ناکافی برای اعلام انطباق',checks,governingMaxWcm,governingMinFcMpa,selectedClasses:input.classes,method:'aci-318-25-ch19'};
}
