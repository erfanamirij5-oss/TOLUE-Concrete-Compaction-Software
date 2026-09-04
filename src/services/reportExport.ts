import { PRODUCT_IDENTITY, type ConcreteProject } from '../domain/project';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { DiagnosticSummary } from '../engineering/diagnostics';
import type { PackingResult } from '../engineering/packing';
import { buildAIReviewPrompt } from '../engineering/aiReview';

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
  const payload = {
    format: 'TOLUE-AI-ENGINEERING-PACKAGE-v1',
    generatedAt: new Date().toISOString(),
    identity: PRODUCT_IDENTITY,
    project: context.project.metadata,
    mix: context.mix,
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
    engineeringNotice: 'Packing and compaction outputs are model estimates unless independently calibrated and validated against laboratory or DEM results.'
  };
  downloadBlob(`${context.project.metadata.projectNumber}-${safeName(context.mix.name)}-AI-Package.json`, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
}

export function exportEngineeringReport(context: ReportContext) {
  const snapshots = captureViewportSnapshots();
  const materialRows = context.mix.materials.map((m) => `<tr><td>${m.label}</td><td>${m.massKgPerM3.toFixed(1)}</td><td>${m.densityKgPerM3.toFixed(0)}</td></tr>`).join('');
  const diagnostics = context.diagnostics.items.length ? context.diagnostics.items.map((d) => `<article><b>${d.severity.toUpperCase()} — ${d.title}</b><p>${d.observation}</p><p><strong>Consequence:</strong> ${d.consequence}</p><p><strong>Recommended action:</strong> ${d.recommendation}</p></article>`).join('') : '<p>No active heuristic warnings.</p>';
  const images = snapshots.map((src, i) => `<figure><img src="${src}"/><figcaption>3D engineering snapshot ${i + 1}</figcaption></figure>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${context.project.metadata.projectNumber} - ${context.mix.name}</title><style>body{font-family:Arial,sans-serif;margin:36px;color:#10243b}header{border-bottom:5px solid #f28b2d;padding-bottom:16px}h1{color:#071f38;margin:0}h2{color:#154d78;margin-top:28px}small{color:#5f7283}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d6dee6;padding:8px;text-align:left}th{background:#0d3152;color:white}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metric{border:1px solid #d5dee7;border-top:3px solid #f28b2d;padding:10px}.metric b{display:block;font-size:18px;margin-top:5px}article{border-left:4px solid #f28b2d;padding:8px 12px;margin:10px 0;background:#f7f9fb}img{width:100%;max-height:520px;object-fit:contain;background:#07111f}footer{border-top:1px solid #ccd7e0;margin-top:30px;padding-top:12px;font-size:12px;color:#50697d}@media print{body{margin:15mm}.metric{break-inside:avoid}article{break-inside:avoid}}</style></head><body><header><h1>TOLUE Concrete Compaction</h1><h3>Engineering Mix & Packing Report</h3><div>${context.project.metadata.projectNumber} • ${context.project.metadata.name}</div><small>${context.project.metadata.client || 'Client not specified'} • ${context.project.metadata.location || 'Location not specified'}</small></header><h2>${context.mix.name}</h2><div class="metrics"><div class="metric">w/cm<b>${context.analysis.wCm.toFixed(3)}</b></div><div class="metric">Packing density estimate<b>${(context.packing.packingDensity * 100).toFixed(1)}%</b></div><div class="metric">Void ratio<b>${context.packing.voidRatio.toFixed(3)}</b></div><div class="metric">Diagnostic score<b>${context.diagnostics.score}/100</b></div><div class="metric">Paste volume<b>${context.analysis.pasteVolumeM3.toFixed(3)} m³</b></div><div class="metric">Mortar volume<b>${context.analysis.mortarVolumeM3.toFixed(3)} m³</b></div><div class="metric">Aggregate volume<b>${context.analysis.aggregateVolumeM3.toFixed(3)} m³</b></div><div class="metric">Closure error<b>${context.analysis.volumeClosureErrorPercent.toFixed(2)}%</b></div></div><h2>Mix Design</h2><table><thead><tr><th>Material</th><th>kg/m³</th><th>Density kg/m³</th></tr></thead><tbody>${materialRows}</tbody></table><h2>Engineering Diagnostics</h2>${diagnostics}<h2>3D Evidence</h2>${images || '<p>No canvas snapshot was available at export time.</p>'}<h2>Model Notice</h2><p>RSA packing and compaction values in this version are engineering model estimates and must not be represented as validated laboratory, CPM or DEM outputs without calibration and verification.</p><footer>Designed by ${PRODUCT_IDENTITY.designer} • ${PRODUCT_IDENTITY.phone} • ${PRODUCT_IDENTITY.email} • ${PRODUCT_IDENTITY.website}<br/>Generated ${new Date().toLocaleString()}</footer></body></html>`;
  downloadBlob(`${context.project.metadata.projectNumber}-${safeName(context.mix.name)}-Engineering-Report.html`, new Blob([html], { type: 'text/html;charset=utf-8' }));
}
