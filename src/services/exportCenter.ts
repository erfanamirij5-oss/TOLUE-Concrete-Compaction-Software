import { PRODUCT_IDENTITY, type ConcreteProject } from '../domain/project';
import { evaluateCompaction } from '../engineering/compaction';
import { evaluateFinalAssessment } from '../engineering/finalAssessment';
import { evaluateReferenceCompliance } from '../engineering/referenceCompliance';
import { evaluateSelectedStandards } from '../standards/standardReport';
import { captureViewportSnapshots, type ReportContext } from './reportExport';
import { dataUrlToBytes, saveBytesNative, saveTextNative } from './nativeExport';

const safe = (v: string) => v.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-');
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));

function finalData(context: ReportContext) {
  const compliance = evaluateReferenceCompliance(context.mix);
  const completed = evaluateCompaction(context.packing, 1);
  const final = evaluateFinalAssessment(context.mix, context.analysis, context.packing, context.diagnostics, compliance, completed);
  const standards = evaluateSelectedStandards(context.mix, context.analysis);
  return { final, standards };
}

export async function saveViewportPng(context: ReportContext) {
  const shot = captureViewportSnapshots()[0];
  if (!shot) throw new Error('نمای سه‌بعدی برای خروجی در دسترس نیست.');
  return saveBytesNative(`${context.project.metadata.projectNumber}-${safe(context.mix.name)}-3D.png`, dataUrlToBytes(shot), 'png');
}

export async function saveEngineeringJson(context: ReportContext) {
  const { final, standards } = finalData(context);
  const payload = { format:'TOLUE-ENGINEERING-PACKAGE-v4', generatedAt:new Date().toISOString(), identity:PRODUCT_IDENTITY, project:context.project.metadata, mix:context.mix, finalAssessment:final, standards, analysis:context.analysis, packing:context.packing, diagnostics:context.diagnostics };
  return saveTextNative(`${context.project.metadata.projectNumber}-${safe(context.mix.name)}-Analysis.json`, JSON.stringify(payload, null, 2), 'json');
}

export async function saveProjectCsv(project: ConcreteProject) {
  const rows = [['طرح','سیمان kg/m3','آب kg/m3','هوای هدف %']];
  project.mixes.forEach(m => rows.push([m.name, String(m.materials.find(x=>x.key==='cement')?.massKgPerM3 ?? ''), String(m.materials.find(x=>x.key==='water')?.massKgPerM3 ?? ''), String(m.targetAirPercent)]));
  const csv = '\ufeff' + rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  return saveTextNative(`${project.metadata.projectNumber}-Mixes.csv`, csv, 'csv');
}

export async function saveEngineeringHtml(context: ReportContext) {
  const { final, standards } = finalData(context);
  const shot = captureViewportSnapshots()[0] ?? '';
  const diagnostics = context.diagnostics.items.map(d=>`<article><b>${esc(d.title)}</b><p>${esc(d.observation)}</p><small>${esc(d.recommendation)}</small></article>`).join('') || '<p>هشدار فعالی ثبت نشده است.</p>';
  const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>TOLUE — ${esc(context.mix.name)}</title><style>body{font-family:Tahoma,Arial,sans-serif;background:#f3f6f8;color:#10243b;margin:0;padding:28px}.sheet{max-width:1100px;margin:auto;background:#fff;padding:28px;border-radius:16px}header{display:flex;justify-content:space-between;border-bottom:4px solid #f28b2d;padding-bottom:16px}.hero{display:grid;grid-template-columns:1.5fr .7fr;gap:18px;margin:20px 0}.render{background:#071525;border-radius:12px;padding:10px}.render img{width:100%;height:430px;object-fit:contain}.score{background:#071525;color:#fff;border-radius:12px;padding:20px}.score strong{font-size:64px;display:block;color:#f28b2d}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metrics div,article{border:1px solid #d7e0e7;border-top:3px solid #f28b2d;padding:12px;border-radius:8px}.metrics b{display:block;font-size:20px;margin-top:5px}h2{color:#154d78;margin-top:28px}small{color:#667d90}footer{border-top:1px solid #d7e0e7;margin-top:24px;padding-top:12px}</style></head><body><main class="sheet"><header><div><h1>TOLUE Concrete Compaction</h1><div>گزارش مهندسی تحلیل سه‌بعدی، طرح اختلاط و تراکم</div></div><div><b>${esc(context.project.metadata.projectNumber)}</b><br>${esc(context.mix.name)}</div></header><section class="hero"><div class="render">${shot?`<img src="${shot}" alt="نمای سه‌بعدی">`:'نمای سه‌بعدی در دسترس نبود'}</div><div class="score">امتیاز نهایی<strong>${final.score}</strong>${esc(final.rankFa)} • ${esc(final.labelFa)}<hr>ACI: ${esc(standards.aci.labelFa)}<br>ASTM: ${standards.astm.status==='compliant'?'مطابق':standards.astm.status==='noncompliant'?'نامطابق':'داده ناکافی'}</div></section><section class="metrics"><div>تراکم مؤثر<b>${final.effectiveCompactionScore}/100</b></div><div>دانه‌بندی<b>${final.gradationScore}/100</b></div><div>بسته‌بندی<b>${final.packingScore}/100</b></div><div>تشخیص مهندسی<b>${final.diagnosticsScore}/100</b></div><div>w/cm<b>${context.analysis.wCm.toFixed(3)}</b></div><div>Packing<b>${(context.packing.packingDensity*100).toFixed(1)}%</b></div><div>Void Ratio<b>${context.packing.voidRatio.toFixed(3)}</b></div><div>Closure Error<b>${context.analysis.volumeClosureErrorPercent.toFixed(2)}%</b></div></section><h2>نتایج تحلیل و تشخیص مهندسی</h2>${diagnostics}<footer>طراح: ${esc(PRODUCT_IDENTITY.designer)} • ${esc(PRODUCT_IDENTITY.phone)} • ${esc(PRODUCT_IDENTITY.email)} • ${esc(PRODUCT_IDENTITY.website)}</footer></main></body></html>`;
  return saveTextNative(`${context.project.metadata.projectNumber}-${safe(context.mix.name)}-Engineering-Report.html`, html, 'html');
}
