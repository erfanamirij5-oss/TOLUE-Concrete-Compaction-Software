import type { ConcreteProject } from '../domain/project';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { defaultRebarNetwork } from '../domain/rebarAnalysis';
import type { DiagnosticSummary } from '../engineering/diagnostics';
import type { PackingResult } from '../engineering/packing';
import { evaluateCompaction } from '../engineering/compaction';
import { evaluateCoupledPlacement } from '../engineering/coupledPlacement';
import { evaluateFinalAssessment } from '../engineering/finalAssessment';
import { evaluateReferenceCompliance } from '../engineering/referenceCompliance';
import { downloadSnapshot, exportAIAnalysisPackage, exportEngineeringReport, exportProjectAssessmentCsv, exportProjectAssessmentReport } from '../services/reportExport';
import { exportPlacementAssessmentReport, exportProjectPlacementAssessmentCsv, exportProjectPlacementAssessmentReport } from '../services/placementReportExport';
import { ACIStandardsPanel } from './ACIStandardsPanel';
import { ASTMStandardsPanel } from './ASTMStandardsPanel';

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
  const placement=evaluateCoupledPlacement(props.mix,props.analysis,props.packing,completed,defaultRebarNetwork);
  return <div className="editor-overlay report-panel" dir="rtl">
    <div className="editor-header"><div><b>خروجی، گزارش و کنترل استاندارد</b><span>ACI 318-25، ASTM C33/C33M، گزارش تکی، رتبه‌بندی پروژه، سناریوی آرماتور و بسته تحلیل AI</span></div><button onClick={props.onClose}>×</button></div>
    <div className="report-summary-grid">
      <div><span>پروژه</span><b>{props.project.metadata.projectNumber}</b><small>{props.project.metadata.name}</small></div>
      <div><span>طرح فعال</span><b>{props.mix.name}</b><small>{props.project.mixes.length} طرح در پروژه</small></div>
      <div><span>امتیاز خود بتن</span><b>{final.score}/100</b><small>{final.rankFa} • {final.labelFa}</small></div>
      <div><span>قابلیت اجرا در آرماتور</span><b>{placement.score}/100</b><small>{placement.rankFa} • {placement.labelFa}</small></div>
    </div>
    <ACIStandardsPanel analysis={props.analysis}/>
    <ASTMStandardsPanel mix={props.mix} analysis={props.analysis}/>
    <div className="report-export-cards">
      <article><b>گزارش تکی طرح بتن</b><p>گزارش کامل همین طرح شامل نمره نهایی از ۱۰۰، سطح A تا E، دانه‌بندی، بسته‌بندی، تراکم مؤثر، هشدارها، جدول مصالح و تصویر سه‌بعدی.</p><button className="primary-action" onClick={() => exportEngineeringReport(context)}>خروجی گزارش تکی بتن</button></article>
      <article><b>گزارش تکی قابلیت اجرا در آرماتور</b><p>نمره مستقل ۰ تا ۱۰۰ برای عبور و تراکم در شبکه آرماتور، شامل Effective Compaction، Bridge Safety، Heatmap موضعی، عبور سنگدانه و دسترسی ویبراتور.</p><button className="primary-action" onClick={() => exportPlacementAssessmentReport(context)}>خروجی گزارش آرماتور</button></article>
      <article><b>گزارش تجمیعی همه طرح‌ها</b><p>تمام طرح‌های پروژه با Seed یکسان ارزیابی و بر اساس کیفیت خود بتن از بهترین تا ضعیف‌ترین رتبه‌بندی می‌شوند.</p><button className="primary-action" onClick={() => exportProjectAssessmentReport(props.project)}>رتبه‌بندی طرح‌های بتن</button><button onClick={() => exportProjectAssessmentCsv(props.project)}>CSV طرح‌های بتن</button></article>
      <article><b>رتبه‌بندی در سناریوی آرماتور</b><p>همه طرح‌ها در یک شبکه آرماتور یکسان مقایسه می‌شوند تا مشخص شود کدام طرح برای بتن‌ریزی و تراکم در آن گلوگاه مناسب‌تر است.</p><button className="primary-action" onClick={() => exportProjectPlacementAssessmentReport(props.project)}>رتبه‌بندی اجرای آرماتور</button><button onClick={() => exportProjectPlacementAssessmentCsv(props.project)}>CSV اجرای آرماتور</button></article>
      <article><b>تصویر سه‌بعدی / مقطع</b><p>نمای فعلی Three.js را به PNG تبدیل می‌کند. در حالت مقایسه، هر نمونه به‌صورت تصویر جداگانه خروجی می‌شود.</p><button onClick={() => downloadSnapshot(`${props.project.metadata.projectNumber}-${props.mix.name}`)}>خروجی PNG</button></article>
      <article><b>بسته تحلیل هوش مصنوعی</b><p>فایل JSON شامل ورودی کامل طرح، نمره نهایی، شاخص‌های مهندسی، هشدارها، هویت محصول، Prompt و تصاویر فعلی ایجاد می‌شود.</p><button onClick={() => exportAIAnalysisPackage(context)}>خروجی بسته AI</button></article>
    </div>
    <div className="ai-review-warning">کنترل ACI 318-25 و ASTM C33/C33M از شاخص‌های Heuristic داخلی TOLUE جدا هستند. در هر موردی که داده استاندارد لازم کامل نباشد، نرم‌افزار وضعیت «داده ناکافی» نشان می‌دهد و انطباق را تأیید نمی‌کند.</div>
  </div>;
}
