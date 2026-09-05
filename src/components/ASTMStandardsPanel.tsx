import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { evaluateASTMC33Compliance, type ASTMComplianceStatus } from '../standards/astmC33_24a';

const label=(status:ASTMComplianceStatus)=>status==='compliant'?'مطابق':status==='noncompliant'?'نامطابق':'داده ناکافی';
const cls=(status:ASTMComplianceStatus)=>status==='compliant'?'ok':status==='noncompliant'?'risk':'warn';

export function ASTMStandardsPanel({mix,analysis}:{mix:MixDesign;analysis:MixAnalysis}){
  const result=evaluateASTMC33Compliance(mix,analysis);
  return <section className="combined-gradation-panel">
    <div className="combined-head"><div><b>کنترل استاندارد دانه‌بندی ASTM</b><span>{result.standard} • روش آزمون {result.testMethod}</span></div><strong className={cls(result.status)}>{label(result.status)}</strong></div>
    <div className="combined-shares">
      {[result.fine,result.coarse].map(group=><div key={group.id}><span>{group.labelFa}</span><b>{label(group.status)}</b><small>{group.designation} • {group.failed} خارج از محدوده • {group.missing} داده مفقود</small></div>)}
    </div>
    <div className="combined-gaps">
      {[result.fine,result.coarse].flatMap(group=>group.checks.filter(check=>check.status!=='compliant').map(check=><div key={`${group.id}-${check.sieveMm}`} className={check.status==='noncompliant'?'critical':''}><span>{group.labelFa} • الک {check.sieveMm} mm</span><strong>{check.measuredPassing===null?'—':`${check.measuredPassing}%`} / {check.minPassing}–{check.maxPassing}%</strong><small>{check.status==='noncompliant'?'درصد عبوری این الک خارج از محدوده دانه‌بندی انتخاب‌شده ASTM C33 است.':'برای اعلام انطباق این الک، داده کافی در منحنی ثبت نشده است.'}</small></div>))}
    </div>
    <div className="combined-warning">{result.noteFa}</div>
  </section>;
}
