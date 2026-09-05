import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { evaluateACI31825Compliance } from './aciCompliance';
import { evaluateASTMC33Compliance } from './astmC33_24a';
import { loadStandardsSettings } from './standardsSettings';

export type UnifiedStandardStatus='compliant'|'noncompliant'|'insufficient';

export function evaluateSelectedStandards(mix:MixDesign,analysis:MixAnalysis){
  const settings=loadStandardsSettings();
  const aci=evaluateACI31825Compliance(analysis,{
    classes:settings.aci.classes,
    fcMpa:settings.aci.fcMpa,
    nominalMaxAggregateMm:settings.aci.nominalMaxAggregateMm,
    measuredAirPercent:settings.aci.measuredAirPercent ?? mix.targetAirPercent,
    chloridePercentByCementitious:settings.aci.chloridePercentByCementitious,
    prestressed:settings.aci.prestressed,
  });
  const astm=evaluateASTMC33Compliance(mix,analysis,settings.astm.coarseSizeNo);
  const status:UnifiedStandardStatus=aci.status==='fail'||astm.status==='noncompliant'
    ?'noncompliant'
    :aci.status==='insufficient'||astm.status==='insufficient'
      ?'insufficient'
      :'compliant';
  return {settings,aci,astm,status};
}

export function standardStatusFa(status:UnifiedStandardStatus){
  return status==='compliant'?'مطابق الزامات کنترل‌شده':status==='noncompliant'?'نامطابق':'داده ناکافی';
}
