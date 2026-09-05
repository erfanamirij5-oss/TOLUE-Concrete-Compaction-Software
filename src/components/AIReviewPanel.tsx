import { useMemo,useState } from 'react';
import { PRODUCT_IDENTITY,type ConcreteProject } from '../domain/project';
import type { MixAnalysis,MixDesign } from '../domain/mixDesign';
import type { DiagnosticSummary } from '../engineering/diagnostics';
import type { PackingResult } from '../engineering/packing';
import type { CompactionState } from '../engineering/compaction';
import { buildAIReviewPrompt } from '../engineering/aiReview';

interface Props{project:ConcreteProject;mix:MixDesign;analysis:MixAnalysis;packing:PackingResult;diagnostics:DiagnosticSummary;compaction:CompactionState;onClose:()=>void;}
export function AIReviewPanel(props:Props){
 const payload=useMemo(()=>buildAIReviewPrompt(props.project,props.mix,props.analysis,props.packing,props.diagnostics,props.compaction),[props.project,props.mix,props.analysis,props.packing,props.diagnostics,props.compaction]);
 const[copied,setCopied]=useState<'prompt'|'data'|null>(null);const[expanded,setExpanded]=useState(false);
 const copy=async(kind:'prompt'|'data')=>{await navigator.clipboard.writeText(kind==='prompt'?payload.prompt:payload.compactData);setCopied(kind);window.setTimeout(()=>setCopied(null),1600)};
 return <div className="editor-overlay ai-review-panel" dir="rtl"><div className="editor-header"><div><b>دستیار تحلیل مهندسی هوش مصنوعی</b><span>پرامپت تخصصی فارسی بر پایه داده‌های واقعی پروژه و خروجی شبیه‌سازی</span></div><button onClick={props.onClose}>×</button></div>
 <div className={`ai-ready-banner ${payload.ready?'ready':'waiting'}`}><div><b>{payload.ready?'✓ داده شبیه‌سازی آماده تحلیل است':'◌ ابتدا شبیه‌سازی را تا پایان اجرا کنید'}</b><span>{payload.ready?'پرامپت با نتایج نهایی تراکم، Packing، فضای خالی و تشخیص‌های مهندسی ساخته شده است.':'برای جلوگیری از تحلیل ناقص، تولید و کپی پرامپت نهایی پس از رسیدن پیشرفت تراکم به ۱۰۰٪ فعال می‌شود.'}</span></div><strong>{Math.round(props.compaction.progress*100)}٪</strong></div>
 <div className="ai-kpi-grid"><div><span>تراکم دانه‌ای</span><b>{payload.summary.packing}</b></div><div><span>فضای خالی</span><b>{payload.summary.voids}</b></div><div><span>خطای حجم</span><b>{payload.summary.closure}</b></div><div><span>امتیاز تشخیص</span><b>{payload.summary.score}</b></div></div>
 <div className="ai-review-warning">این بخش ابزار پشتیبان تصمیم مهندسی است. پذیرش نهایی باید بر داده آزمایشگاهی معتبر، الزامات پروژه و استاندارد قابل اعمال متکی باشد؛ خروجی شبیه‌سازی به‌عنوان DEM یا نتیجه آزمایشگاهی تلقی نمی‌شود.</div>
 <section className="ai-workflow"><div className="ai-step done"><i>۱</i><div><b>ورودی طرح</b><span>مصالح، نسبت‌ها و دانه‌بندی</span></div></div><div className={`ai-step ${payload.ready?'done':'active'}`}><i>۲</i><div><b>اجرای شبیه‌سازی</b><span>تراکم و ساختار دانه‌ای</span></div></div><div className={`ai-step ${payload.ready?'active':''}`}><i>۳</i><div><b>تحلیل هوش مصنوعی</b><span>ساخت پرامپت داده‌محور</span></div></div></section>
 <div className="ai-section-head"><div><b>بسته داده مهندسی</b><span>خلاصه‌ای که همراه پرامپت برای مدل هوش مصنوعی ارسال می‌شود</span></div><button onClick={()=>setExpanded(v=>!v)}>{expanded?'نمای خلاصه':'نمای کامل'}</button></div><div className={`ai-data-card ${expanded?'expanded':''}`}><pre>{payload.compactData}</pre></div>
 <label className="ai-prompt-label"><span><b>پرامپت تخصصی TOLUE</b><small>ساختار تحلیل، حدود اعتبار، ماتریس ریسک و برنامه Trial Mix داخل پرامپت تعریف شده است.</small></span><textarea readOnly value={payload.ready?payload.prompt:'پرامپت نهایی پس از تکمیل شبیه‌سازی ساخته و فعال می‌شود.'}/></label>
 <div className="project-actions ai-actions"><button className="primary-action" disabled={!payload.ready} onClick={()=>copy('prompt')}>{copied==='prompt'?'✓ پرامپت کپی شد':'کپی پرامپت کامل'}</button><button disabled={!payload.ready} onClick={()=>copy('data')}>{copied==='data'?'✓ داده‌ها کپی شد':'کپی فقط داده‌ها'}</button></div>
 <p className="ai-image-note"><b>تحلیل تصویری:</b> در صورت نیاز، تصویر نمای سه‌بعدی، مقطع یا عکس آزمایشگاهی را همراه این پرامپت به سرویس هوش مصنوعی بدهید. پرامپت مدل را ملزم می‌کند شواهد بصری را از خروجی عددی جدا گزارش کند.</p><p className="ai-image-note ai-identity">{PRODUCT_IDENTITY.designer} • {PRODUCT_IDENTITY.phone} • {PRODUCT_IDENTITY.email} • {PRODUCT_IDENTITY.website}</p></div>;
}
