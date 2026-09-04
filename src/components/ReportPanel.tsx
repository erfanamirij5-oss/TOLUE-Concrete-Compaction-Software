import type { ConcreteProject } from '../domain/project';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { DiagnosticSummary } from '../engineering/diagnostics';
import type { PackingResult } from '../engineering/packing';
import { evaluateCompaction } from '../engineering/compaction';
import { evaluateFinalAssessment } from '../engineering/finalAssessment';
import { evaluateReferenceCompliance } from '../engineering/referenceCompliance';
import { downloadSnapshot, exportAIAnalysisPackage, exportEngineeringReport, exportProjectAssessmentCsv, exportProjectAssessmentReport } from '../services/reportExport';

interface Props {
  project: ConcreteProject;
  mix: MixDesign;
  analysis: MixAnalysis;
  packing: PackingResult;
  diagnostics: DiagnosticSummary;
  onClose: () => void;
}

export function ReportPanel(props: Props) {
  const context = { project: props.project, mix: props.mix, analysis: props.analysis, packing: props.packing, diagnostics: props.diagnostics };
  const compliance=evaluateReferenceCompliance(props.mix);
  const completed=evaluateCompaction(props.packing,1);
  const final=evaluateFinalAssessment(props.mix,props.analysis,props.packing,props.diagnostics,compliance,completed);
  return <div className="editor-overlay report-panel" dir="rtl">
    <div className="editor-header"><div><b>خروجی و گزارش مهندسی</b><span>گزارش تکی، رتبه‌بندی همه طرح‌ها، تصویر سه‌بعدی و بسته تحلیل AI</span></div><button onClick={props.onClose}>×</button></div>
    <div className="report-summary-grid">
      <div><span>پروژه</span><b>{props.project.metadata.projectNumber}</b><small>{props.project.metadata.name}</small></div>
      <div><span>طرح فعال</span><b>{props.mix.name}</b><small>{props.project.mixes.length} طرح در پروژه</small></div>
      <div><span>امتیاز نهایی</span><b>{final.score}/100</b><small>{final.rankFa} • {final.labelFa}</small></div>
      <div><span>تراکم مؤثر</span><b>{final.effectiveCompactionScore}/100</b><small>مدل مهندسی داخلی TOLUE</small></div>
    </div>
    <div className="report-export-cards">
      <article><b>گزارش تکی طرح</b><p>گزارش کامل همین طرح شامل نمره نهایی از ۱۰۰، سطح A تا E، دانه‌بندی، بسته‌بندی، تراکم مؤثر، هشدارها، جدول مصالح و تصویر سه‌بعدی.</p><button className="primary-action" onClick={() => exportEngineeringReport(context)}>خروجی گزارش تکی</button></article>
      <article><b>گزارش تجمیعی همه طرح‌ها</b><p>تمام طرح‌های پروژه با Seed و سناریوی یکسان ارزیابی و از بهترین تا ضعیف‌ترین رتبه‌بندی می‌شوند؛ میانگین پروژه و بهترین/ضعیف‌ترین طرح نیز مشخص می‌شود.</p><button className="primary-action" onClick={() => exportProjectAssessmentReport(props.project)}>خروجی رتبه‌بندی پروژه</button><button onClick={() => exportProjectAssessmentCsv(props.project)}>خروجی CSV برای Excel</button></article>
      <article><b>تصویر سه‌بعدی / مقطع</b><p>نمای فعلی Three.js را به PNG تبدیل می‌کند. در حالت مقایسه، هر نمونه به‌صورت تصویر جداگانه خروجی می‌شود.</p><button onClick={() => downloadSnapshot(`${props.project.metadata.projectNumber}-${props.mix.name}`)}>خروجی PNG</button></article>
      <article><b>بسته تحلیل هوش مصنوعی</b><p>فایل JSON شامل ورودی کامل طرح، نمره نهایی، شاخص‌های مهندسی، هشدارها، هویت محصول، Prompt و تصاویر فعلی ایجاد می‌شود.</p><button onClick={() => exportAIAnalysisPackage(context)}>خروجی بسته AI</button></article>
    </div>
    <div className="ai-review-warning">نمره نهایی و سطح‌بندی فعلی، شاخص مهندسی داخلی TOLUE است. خروجی باید مقادیر مدل/Heuristic را از نتایج واقعی آزمایشگاهی و کنترل استاندارد رسمی جدا نگه دارد.</div>
  </div>;
}
