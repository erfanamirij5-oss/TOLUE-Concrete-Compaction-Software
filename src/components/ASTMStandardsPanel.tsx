import { useState } from 'react';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { ASTM_COARSE_SIZE_OPTIONS, evaluateASTMC33Compliance, type ASTMCoarseSizeNo, type ASTMComplianceStatus } from '../standards/astmC33_24a';
import { loadStandardsSettings, saveStandardsSettings } from '../standards/standardsSettings';

const label=(status:ASTMComplianceStatus)=>status==='compliant'?'مطابق':status==='noncompliant'?'نامطابق':'داده ناکافی';
const cls=(status:ASTMComplianceStatus)=>status==='compliant'?'ok':status==='noncompliant'?'risk':'warn';

export function ASTMStandardsPanel({mix,analysis}:{mix:MixDesign;analysis:MixAnalysis}){
  const [coarseSizeNo,setCoarseSizeNoState]=useState<ASTMCoarseSizeNo>(()=>loadStandardsSettings().astm.coarseSizeNo);
  const setCoarseSizeNo=(value:ASTMCoarseSizeNo)=>{
    setCoarseSizeNoState(value);
    const current=loadStandardsSettings();
    saveStandardsSettings({...current,astm:{...current.astm,coarseSizeNo:value}});
  };
  const result=evaluateASTMC33Compliance(mix,analysis,coarseSizeNo);
  return <section className="combined-gradation-panel">
    <div className="combined-head"><div><b>کنترل استاندارد دانه‌بندی ASTM</b><span>{result.standard} • روش آزمون {result.testMethod}</span></div><strong className={cls(result.status)}>{label(result.status)}</strong></div>
    <div className="astm-size-selector">
      <label><span>رده سنگدانه درشت</span><select value={coarseSizeNo} onChange={event=>setCoarseSizeNo(event.target.value as ASTMCoarseSizeNo)}>{ASTM_COARSE_SIZE_OPTIONS.map(size=><option key={size} value={size}>Size No. {size}</option>)}</select></label>
      <div><span>پیشنهاد نزدیک‌ترین پروفایل</span><b>Size No. {result.suggestedCoarseSizeNo}</b><small>پیشنهاد عددی نرم‌افزار است؛ انتخاب نهایی باید طبق مشخصات پروژه انجام شود.</small></div>
    </div>
    <div className="combined-shares">
      {[result.fine,result.coarse].map(group=><div key={group.id}><span>{group.labelFa}</span><b>{label(group.status)}</b><small>{group.designation} • {group.failed} خارج از محدوده • {group.missing} داده مفقود</small></div>)}
    </div>
    <div className="combined-gaps">
      {[result.fine,result.coarse].flatMap(group=>group.checks.filter(check=>check.status!=='compliant').map(check=><div key={`${group.id}-${check.sieveMm}`} className={check.status==='noncompliant'?'critical':''}><span>{group.labelFa} • الک {check.sieveMm} mm</span><strong>{check.measuredPassing===null?'—':`${check.measuredPassing}%`} / {check.minPassing}–{check.maxPassing}%</strong><small>{check.status==='noncompliant'?'درصد عبوری این الک خارج از محدوده رده انتخاب‌شده است.':'برای اعلام انطباق این الک، داده کافی در منحنی ثبت نشده است.'}</small></div>))}
    </div>
    {result.fine.status==='compliant'&&result.coarse.status==='compliant'&&<div className="combined-no-gap">دانه‌بندی ماسه و سنگدانه درشت برای رده انتخاب‌شده در محدوده کنترل‌شده قرار دارد.</div>}
    <div className="combined-warning">{result.noteFa}</div>
  </section>;
}
