import { PRODUCT_IDENTITY, type ConcreteProject } from '../domain/project';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { DiagnosticSummary } from '../engineering/diagnostics';
import type { PackingResult } from '../engineering/packing';
import { analyzeMix } from '../engineering/analyzeMix';
import { buildAIReviewPrompt } from '../engineering/aiReview';
import { evaluateCompaction } from '../engineering/compaction';
import { evaluateFinalAssessment } from '../engineering/finalAssessment';
import { evaluateProjectAssessment } from '../engineering/projectAssessment';
import { evaluateReferenceCompliance } from '../engineering/referenceCompliance';
import { evaluateSelectedStandards, standardStatusFa } from '../standards/standardReport';

export interface ReportContext {
  project: ConcreteProject;
  mix: MixDesign;
  analysis: MixAnalysis;
  packing: PackingResult;
  diagnostics: DiagnosticSummary;
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-');
}

function finalForContext(context: ReportContext) {
  const compliance = evaluateReferenceCompliance(context.mix);
  const completedCompaction = evaluateCompaction(context.packing, 1);
  return evaluateFinalAssessment(context.mix, context.analysis, context.packing, context.diagnostics, compliance, completedCompaction);
}

function statusClass(status:string){
  return status==='compliant'||status==='pass'?'pass':status==='noncompliant'||status==='fail'?'fail':'insufficient';
}

function standardsHtml(mix:MixDesign,analysis:MixAnalysis){
  const standards=evaluateSelectedStandards(mix,analysis);
  const aciRows=standards.aci.checks.map(check=>`<tr><td>${check.labelFa}</td><td>${check.actualFa}</td><td>${check.requiredFa}</td><td class="${statusClass(check.status)}">${check.status==='pass'?'مطابق':check.status==='fail'?'نامطابق':'داده ناکافی'}</td><td>${check.sourceFa}</td></tr>`).join('');
  const astmRows=[standards.astm.fine,standards.astm.coarse].flatMap(group=>group.checks.map(check=>`<tr><td>${group.labelFa} — ${check.sieveMm} mm</td><td>${check.measuredPassing===null?'—':`${check.measuredPassing}%`}</td><td>${check.minPassing}–${check.maxPassing}%</td><td class="${statusClass(check.status)}">${check.status==='compliant'?'مطابق':check.status==='noncompliant'?'نامطابق':'داده ناکافی'}</td><td>${group.designation}</td></tr>`)).join('');
  return `<section class="standard-section"><div class="standard-head"><div><h2>کنترل استاندارد</h2><small>نتیجه استاندارد مستقل از امتیاز Heuristic نرم‌افزار است.</small></div><strong class="${statusClass(standards.status)}">${standardStatusFa(standards.status)}</strong></div><div class="standard-cards"><div><span>ACI 318-25</span><b class="${statusClass(standards.aci.status)}">${standards.aci.labelFa}</b><small>کلاس‌ها: ${standards.aci.selectedClasses.join(' / ')}</small></div><div><span>ASTM C33/C33M-24a</span><b class="${statusClass(standards.astm.status)}">${standards.astm.status==='compliant'?'مطابق':standards.astm.status==='noncompliant'?'نامطابق':'داده ناکافی'}</b><small>Coarse Size No. ${standards.settings.astm.coarseSizeNo} • ${standards.astm.testMethod}</small></div></div><h3>ACI 318-25 — فصل 19</h3><table><thead><tr><th>کنترل</th><th>مقدار طرح</th><th>الزام</th><th>وضعیت</th><th>مرجع</th></tr></thead><tbody>${aciRows}</tbody></table><h3>ASTM C33/C33M-24a — دانه‌بندی</h3><table><thead><tr><th>کنترل</th><th>عبوری</th><th>محدوده</th><th>وضعیت</th><th>رده</th></tr></thead><tbody>${astmRows}</tbody></table><p class="standard-note">${standards.astm.noteFa}</p></section>`;
}

export function captureViewportSnapshots(): string[] {
  return Array.from(document.querySelectorAll<HTMLCanvasElement>('.viewport canvas'))
    .map((canvas) => {
      try { return canvas.toDataURL('image/png'); } catch { return ''; }
    })
    .filter(Boolean);
}

export function downloadSnapshot(label = '3D-Snapshot') {
  const snapshots = captureViewportSnapshots();
  snapshots.forEach((dataUrl, index) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${safeName(label)}${snapshots.length > 1 ? `-${index + 1}` : ''}.png`;
    a.click();
  });
  return snapshots.length;
}

export function exportAIAnalysisPackage(context: ReportContext) {
  const snapshots = captureViewportSnapshots();
  const ai = buildAIReviewPrompt(context.project, context.mix, context.analysis, context.packing, context.diagnostics);
  const final = finalForContext(context);
  const standards=evaluateSelectedStandards(context.mix,context.analysis);
  const payload = {
    format: 'TOLUE-AI-ENGINEERING-PACKAGE-v3',
    generatedAt: new Date().toISOString(),
    identity: PRODUCT_IDENTITY,
    project: context.project.metadata,
    mix: context.mix,
    finalAssessment: final,
    standards,
    derived: {
      wCm: context.analysis.wCm,
      pasteVolumeM3: context.analysis.pasteVolumeM3,
      mortarVolumeM3: context.analysis.mortarVolumeM3,
      aggregateVolumeM3: context.analysis.aggregateVolumeM3,
      volumeClosureErrorPercent: context.analysis.volumeClosureErrorPercent,
      packingDensityEstimate: context.packing.packingDensity,
      voidFractionEstimate: context.packing.voidFraction,
      voidRatioEstimate: context.packing.voidRatio,
      packingMethod: context.packing.method,
      diagnosticScore: context.diagnostics.score,
    },
    diagnostics: context.diagnostics,
    aiPrompt: ai.prompt,
    snapshots,
    engineeringNotice: 'TOLUE scores are internal engineering heuristics. ACI/ASTM results are separate checks limited to the selected classes, entered data, and implemented clauses.'
  };
  downloadBlob(`${context.project.metadata.projectNumber}-${safeName(context.mix.name)}-AI-Package.json`, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
}

export function exportEngineeringReport(context: ReportContext) {
  const snapshots = captureViewportSnapshots();
  const final = finalForContext(context);
  const materialRows = context.mix.materials.map((m) => `<tr><td>${m.label}</td><td>${m.massKgPerM3.toFixed(1)}</td><td>${m.densityKgPerM3.toFixed(0)}</td></tr>`).join('');
  const diagnostics = context.diagnostics.items.length ? context.diagnostics.items.map((d) => `<article><b>${d.severity.toUpperCase()} — ${d.title}</b><p>${d.observation}</p><p><strong>پیامد:</strong> ${d.consequence}</p><p><strong>اقدام پیشنهادی:</strong> ${d.recommendation}</p></article>`).join('') : '<p>هشدار مهندسی فعالی وجود ندارد.</p>';
  const images = snapshots.map((src, i) => `<figure><img src="${src}"/><figcaption>تصویر سه‌بعدی مهندسی ${i + 1}</figcaption></figure>`).join('');
  const finalNotes=[...final.strengthsFa.map(x=>`<li class="ok-text">${x}</li>`),...final.warningsFa.map(x=>`<li class="warn-text">${x}</li>`)].join('');
  const standardBlock=standardsHtml(context.mix,context.analysis);
  const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${context.project.metadata.projectNumber} - ${context.mix.name}</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:36px;color:#10243b}header{border-bottom:5px solid #f28b2d;padding-bottom:16px}h1{color:#071f38;margin:0}h2{color:#154d78;margin-top:28px}h3{color:#234b69}small{color:#5f7283}table{width:100%;border-collapse:collapse;margin:8px 0 18px}th,td{border:1px solid #d6dee6;padding:8px;text-align:right}th{background:#0d3152;color:white}.final{display:grid;grid-template-columns:180px 1fr;gap:18px;align-items:center;background:#071f38;color:#fff;padding:18px;border-radius:12px;margin:22px 0}.final-score{text-align:center;border:2px solid #f28b2d;border-radius:12px;padding:14px}.final-score b{font-size:48px;display:block}.final-score strong{font-size:18px;color:#f7a14e}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metric{border:1px solid #d5dee7;border-top:3px solid #f28b2d;padding:10px}.metric b{display:block;font-size:18px;margin-top:5px}article{border-right:4px solid #f28b2d;padding:8px 12px;margin:10px 0;background:#f7f9fb}img{width:100%;max-height:520px;object-fit:contain;background:#07111f}.ok-text{color:#b9f0d1}.warn-text{color:#ffd0a8}.standard-section{margin-top:28px;border:1px solid #cbd7e1;border-radius:12px;padding:16px}.standard-head{display:flex;align-items:center;justify-content:space-between}.standard-head h2{margin:0}.standard-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}.standard-cards>div{border:1px solid #d6dee6;padding:12px;border-radius:8px}.standard-cards span,.standard-cards small{display:block}.standard-cards b{display:block;font-size:17px;margin:5px 0}.pass{color:#177a4c}.fail{color:#b71f35}.insufficient{color:#a46713}.standard-note{background:#fff6e9;border-right:4px solid #f28b2d;padding:10px}footer{border-top:1px solid #ccd7e0;margin-top:30px;padding-top:12px;font-size:12px;color:#50697d}@media print{body{margin:15mm}.metric,article,.final,.standard-section{break-inside:avoid}}</style></head><body><header><h1>TOLUE Concrete Compaction</h1><h3>گزارش مهندسی طرح اختلاط، تراکم و انطباق استاندارد</h3><div>${context.project.metadata.projectNumber} • ${context.project.metadata.name}</div><small>${context.project.metadata.client || 'کارفرما ثبت نشده'} • ${context.project.metadata.location || 'محل پروژه ثبت نشده'}</small></header><h2>${context.mix.name}</h2><section class="final"><div class="final-score"><span>امتیاز نهایی TOLUE</span><b>${final.score}</b><strong>${final.rankFa} • ${final.labelFa}</strong></div><div><h3>جمع‌بندی ارزیابی</h3><ul>${finalNotes || '<li>مورد برجسته‌ای ثبت نشده است.</li>'}</ul><small>روش: ${final.method} — امتیاز مهندسی داخلی و مستقل از نتیجه استاندارد.</small></div></section><div class="metrics"><div class="metric">تراکم مؤثر<b>${final.effectiveCompactionScore}/100</b></div><div class="metric">تشخیص مهندسی<b>${final.diagnosticsScore}/100</b></div><div class="metric">دانه‌بندی<b>${final.gradationScore}/100</b></div><div class="metric">بسته‌بندی<b>${final.packingScore}/100</b></div><div class="metric">w/cm<b>${context.analysis.wCm.toFixed(3)}</b></div><div class="metric">چگالی بسته‌بندی<b>${(context.packing.packingDensity * 100).toFixed(1)}%</b></div><div class="metric">نسبت فضای خالی<b>${context.packing.voidRatio.toFixed(3)}</b></div><div class="metric">خطای بسته‌شدن حجم<b>${context.analysis.volumeClosureErrorPercent.toFixed(2)}%</b></div></div>${standardBlock}<h2>طرح اختلاط</h2><table><thead><tr><th>مصالح</th><th>kg/m³</th><th>چگالی kg/m³</th></tr></thead><tbody>${materialRows}</tbody></table><h2>تشخیص‌های مهندسی</h2>${diagnostics}<h2>شواهد سه‌بعدی</h2>${images || '<p>در زمان خروجی، تصویر Canvas در دسترس نبود.</p>'}<h2>محدودیت مدل</h2><p>امتیاز TOLUE، RSA packing، Heatmap، Bridge Risk و تراکم مؤثر مدل‌های مهندسی داخلی هستند. کنترل ACI و ASTM فقط بندها و داده‌های پیاده‌سازی‌شده را بررسی می‌کند و جایگزین بررسی کامل مدارک پروژه یا مسئولیت مهندس طراح نیست.</p><footer>طراح: ${PRODUCT_IDENTITY.designer} • ${PRODUCT_IDENTITY.phone} • ${PRODUCT_IDENTITY.email} • ${PRODUCT_IDENTITY.website}<br/>تولید گزارش: ${new Date().toLocaleString('fa-IR')}</footer></body></html>`;
  downloadBlob(`${context.project.metadata.projectNumber}-${safeName(context.mix.name)}-Engineering-Report.html`, new Blob([html], { type: 'text/html;charset=utf-8' }));
}

export function exportProjectAssessmentCsv(project: ConcreteProject) {
  const result=evaluateProjectAssessment(project);
  const rows=[['رتبه','نام طرح','امتیاز از 100','سطح','ACI 318-25','ASTM C33','وضعیت استاندارد','w/cm','Packing %','Void %','Closure Error %']];
  result.mixes.forEach((item,index)=>{
    const mix=project.mixes.find(m=>m.id===item.mixId);
    if(!mix)return;
    const analysis=analyzeMix(mix);
    const standards=evaluateSelectedStandards(mix,analysis);
    rows.push([String(index+1),item.mixName,String(item.score),`${item.rankFa} - ${item.labelFa}`,standards.aci.labelFa,standards.astm.status==='compliant'?'مطابق':standards.astm.status==='noncompliant'?'نامطابق':'داده ناکافی',standardStatusFa(standards.status),item.wCm.toFixed(3),(item.packingDensity*100).toFixed(1),(item.voidFraction*100).toFixed(1),item.closureErrorPercent.toFixed(2)]);
  });
  const csv='\ufeff'+rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadBlob(`${project.metadata.projectNumber}-All-Mixes-Ranking.csv`,new Blob([csv],{type:'text/csv;charset=utf-8'}));
}

export function exportProjectAssessmentReport(project: ConcreteProject) {
  const result=evaluateProjectAssessment(project);
  const best=result.mixes.find(x=>x.mixId===result.bestMixId);
  const weakest=result.mixes.find(x=>x.mixId===result.weakestMixId);
  const rows=result.mixes.map((item,index)=>{
    const mix=project.mixes.find(m=>m.id===item.mixId);
    if(!mix)return '';
    const standards=evaluateSelectedStandards(mix,analyzeMix(mix));
    return `<tr class="${index===0?'best':''}"><td>${index+1}</td><td>${item.mixName}</td><td><b>${item.score}</b></td><td>${item.rankFa}</td><td>${item.labelFa}</td><td class="${statusClass(standards.aci.status)}">${standards.aci.labelFa}</td><td class="${statusClass(standards.astm.status)}">${standards.astm.status==='compliant'?'مطابق':standards.astm.status==='noncompliant'?'نامطابق':'داده ناکافی'}</td><td class="${statusClass(standards.status)}">${standardStatusFa(standards.status)}</td><td>${item.wCm.toFixed(3)}</td></tr>`;
  }).join('');
  const html=`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${project.metadata.projectNumber} - رتبه‌بندی طرح‌ها</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:36px;color:#10243b}header{border-bottom:5px solid #f28b2d;padding-bottom:16px}h1{margin:0;color:#071f38}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.summary div{background:#071f38;color:#fff;padding:14px;border-radius:10px}.summary b{display:block;font-size:25px;color:#f7a14e;margin-top:5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d4dee7;padding:9px;text-align:center}th{background:#0d3152;color:#fff}.best{background:#edf9f2}.pass{color:#177a4c}.fail{color:#b71f35}.insufficient{color:#a46713}.notice{margin-top:20px;border-right:4px solid #f28b2d;background:#f7f9fb;padding:12px}footer{margin-top:30px;border-top:1px solid #ccd7e0;padding-top:12px;color:#50697d;font-size:12px}</style></head><body><header><h1>رتبه‌بندی تجمیعی طرح‌های اختلاط</h1><h3>TOLUE Concrete Compaction</h3><div>${project.metadata.projectNumber} • ${project.metadata.name}</div></header><section class="summary"><div>میانگین پروژه<b>${result.averageScore}/100</b></div><div>بهترین طرح<b>${best?.mixName ?? '—'} • ${best?.score ?? 0}</b></div><div>ضعیف‌ترین طرح<b>${weakest?.mixName ?? '—'} • ${weakest?.score ?? 0}</b></div></section><table><thead><tr><th>رتبه</th><th>طرح</th><th>نمره TOLUE</th><th>سطح</th><th>وضعیت</th><th>ACI 318-25</th><th>ASTM C33</th><th>جمع‌بندی استاندارد</th><th>w/cm</th></tr></thead><tbody>${rows}</tbody></table><div class="notice">${result.noteFa}<br/>استانداردها با تنظیمات انتخاب‌شده مشترک برای همه طرح‌ها کنترل شده‌اند. نتیجه استاندارد مستقل از رتبه‌بندی امتیازی TOLUE است.</div><footer>طراح: ${PRODUCT_IDENTITY.designer} • ${PRODUCT_IDENTITY.phone} • ${PRODUCT_IDENTITY.email} • ${PRODUCT_IDENTITY.website}<br/>تولید گزارش: ${new Date().toLocaleString('fa-IR')}</footer></body></html>`;
  downloadBlob(`${project.metadata.projectNumber}-All-Mixes-Assessment.html`,new Blob([html],{type:'text/html;charset=utf-8'}));
}
