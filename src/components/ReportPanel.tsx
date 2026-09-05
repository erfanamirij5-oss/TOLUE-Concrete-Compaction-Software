import { useEffect, useState } from 'react';
import type { ConcreteProject } from '../domain/project';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { DiagnosticSummary } from '../engineering/diagnostics';
import type { PackingResult } from '../engineering/packing';
import { evaluateCompaction } from '../engineering/compaction';
import { evaluateFinalAssessment } from '../engineering/finalAssessment';
import { evaluateReferenceCompliance } from '../engineering/referenceCompliance';
import { evaluateSelectedStandards } from '../standards/standardReport';
import { captureViewportSnapshots } from '../services/reportExport';
import { printFormalEngineeringReport } from '../services/formalPdfReport';
import { saveEngineeringHtml, saveEngineeringJson, saveProjectCsv, saveViewportPng } from '../services/exportCenter';
import { ACIStandardsPanel } from './ACIStandardsPanel';
import { ASTMStandardsPanel } from './ASTMStandardsPanel';

interface Props { project: ConcreteProject; mix: MixDesign; analysis: MixAnalysis; packing: PackingResult; diagnostics: DiagnosticSummary; onClose: () => void; }
type Tab = 'overview' | 'standards' | 'diagnostics';

export function ReportPanel(props: Props) {
  const context = { project:props.project, mix:props.mix, analysis:props.analysis, packing:props.packing, diagnostics:props.diagnostics };
  const completed = evaluateCompaction(props.packing, 1);
  const final = evaluateFinalAssessment(props.mix, props.analysis, props.packing, props.diagnostics, evaluateReferenceCompliance(props.mix), completed);
  const standards = evaluateSelectedStandards(props.mix, props.analysis);
  const [tab,setTab] = useState<Tab>('overview');
  const [preview,setPreview] = useState('');
  const [busy,setBusy] = useState('');
  const [notice,setNotice] = useState('');
  useEffect(()=>{ setPreview(captureViewportSnapshots()[0] ?? ''); },[]);
  const run = async (label:string, action:()=>Promise<unknown>|unknown) => { try { setBusy(label); setNotice(''); await action(); setNotice(`${label} انجام شد.`); } catch(e) { setNotice(`خطا در ${label}: ${e instanceof Error ? e.message : String(e)}`); } finally { setBusy(''); } };
  return <div className="export-center" dir="rtl">
    <header className="export-center-head"><div><span>مرکز گزارش و خروجی مهندسی</span><h2>{props.project.metadata.projectNumber} <i>•</i> {props.mix.name}</h2><small>رندر سه‌بعدی + نتایج تحلیل + کنترل استاندارد + خروجی Native ویندوز</small></div><button className="export-close" onClick={props.onClose} aria-label="بستن">×</button></header>
    <nav className="export-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>داشبورد خروجی</button><button className={tab==='standards'?'active':''} onClick={()=>setTab('standards')}>کنترل استاندارد</button><button className={tab==='diagnostics'?'active':''} onClick={()=>setTab('diagnostics')}>نتایج تشخیص</button></nav>
    <main className="export-center-body">
      {tab==='overview' && <>
        <section className="export-hero"><div className="export-render"><div className="export-section-title"><b>نمای سه‌بعدی مهندسی</b><span>تصویر خالص Viewport بدون منوها و پنل‌های نرم‌افزار</span></div><div className="export-render-frame">{preview?<img src={preview} alt="رندر سه‌بعدی طرح"/>:<div className="export-empty">نمای سه‌بعدی در دسترس نیست</div>}</div></div><aside className="export-score"><span>امتیاز نهایی TOLUE</span><strong>{final.score}</strong><b>{final.rankFa} • {final.labelFa}</b><div><span>ACI 318-25</span><b>{standards.aci.labelFa}</b></div><div><span>ASTM C33</span><b>{standards.astm.status==='compliant'?'مطابق':standards.astm.status==='noncompliant'?'نامطابق':'داده ناکافی'}</b></div></aside></section>
        <section className="export-metrics"><div><span>تراکم مؤثر</span><b>{final.effectiveCompactionScore}/100</b></div><div><span>دانه‌بندی</span><b>{final.gradationScore}/100</b></div><div><span>بسته‌بندی</span><b>{final.packingScore}/100</b></div><div><span>تشخیص مهندسی</span><b>{final.diagnosticsScore}/100</b></div><div><span>w/cm</span><b>{props.analysis.wCm.toFixed(3)}</b></div><div><span>Packing</span><b>{(props.packing.packingDensity*100).toFixed(1)}%</b></div></section>
        <section className="export-actions"><div className="export-section-title"><b>خروجی‌های پروژه</b><span>هر دکمه پنجره Save As واقعی ویندوز را باز می‌کند.</span></div><div className="export-action-grid"><button className="export-action primary" disabled={!!busy} onClick={()=>run('گزارش رسمی PDF',()=>printFormalEngineeringReport(context))}><b>PDF رسمی A4</b><span>گزارش تحلیلی همراه رندر سه‌بعدی</span></button><button className="export-action" disabled={!!busy} onClick={()=>run('رندر PNG',()=>saveViewportPng(context))}><b>رندر PNG</b><span>فقط نمای سه‌بعدی مهندسی</span></button><button className="export-action" disabled={!!busy} onClick={()=>run('گزارش HTML',()=>saveEngineeringHtml(context))}><b>گزارش HTML</b><span>رندر + امتیازها + تحلیل‌ها</span></button><button className="export-action" disabled={!!busy} onClick={()=>run('CSV پروژه',()=>saveProjectCsv(props.project))}><b>CSV پروژه</b><span>داده طرح‌ها برای Excel</span></button><button className="export-action" disabled={!!busy} onClick={()=>run('بسته تحلیل JSON',()=>saveEngineeringJson(context))}><b>JSON / AI</b><span>بسته داده مهندسی قابل پردازش</span></button></div>{notice&&<div className="export-notice">{notice}</div>}</section>
      </>}
      {tab==='standards' && <section className="export-detail"><ACIStandardsPanel analysis={props.analysis}/><ASTMStandardsPanel mix={props.mix} analysis={props.analysis}/></section>}
      {tab==='diagnostics' && <section className="export-detail"><div className="export-section-title"><b>تشخیص‌های مهندسی</b><span>جمع‌بندی تحلیل طرح فعال</span></div>{props.diagnostics.items.length?props.diagnostics.items.map(d=><article className="export-diagnostic" key={d.id}><b>{d.title}</b><p>{d.observation}</p><small>{d.recommendation}</small></article>):<div className="export-empty">هشدار مهندسی فعالی ثبت نشده است.</div>}</section>}
    </main>
  </div>;
}
