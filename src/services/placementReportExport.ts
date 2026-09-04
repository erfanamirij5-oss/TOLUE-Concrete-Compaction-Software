import type { ConcreteProject } from '../domain/project';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { PRODUCT_IDENTITY } from '../domain/project';
import { defaultRebarNetwork, type RebarNetworkInput } from '../domain/rebarAnalysis';
import type { DiagnosticSummary } from '../engineering/diagnostics';
import type { PackingResult } from '../engineering/packing';
import { evaluateCompaction } from '../engineering/compaction';
import { evaluateCoupledPlacement } from '../engineering/coupledPlacement';
import { evaluateProjectAssessment } from '../engineering/projectAssessment';

export interface PlacementReportContext {
  project: ConcreteProject;
  mix: MixDesign;
  analysis: MixAnalysis;
  packing: PackingResult;
  diagnostics: DiagnosticSummary;
}

function downloadBlob(name:string,blob:Blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function safeName(value:string){return value.replace(/[^a-zA-Z0-9-_]+/g,'-').replace(/-+/g,'-');}

export function exportPlacementAssessmentReport(context:PlacementReportContext,network:RebarNetworkInput=defaultRebarNetwork){
  const compaction=evaluateCompaction(context.packing,1);
  const result=evaluateCoupledPlacement(context.mix,context.analysis,context.packing,compaction,network);
  const notes=[...result.strengthsFa.map(x=>`<li class="ok">${x}</li>`),...result.warningsFa.map(x=>`<li class="warn">${x}</li>`)].join('');
  const html=`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${context.project.metadata.projectNumber} - ${context.mix.name} - آرماتور</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:36px;color:#10243b}header{border-bottom:5px solid #f28b2d;padding-bottom:16px}.hero{display:grid;grid-template-columns:190px 1fr;gap:18px;background:#071f38;color:#fff;border-radius:12px;padding:18px;margin:22px 0}.score{text-align:center;border:2px solid #f28b2d;border-radius:12px;padding:14px}.score b{display:block;font-size:52px}.score strong{color:#f7a14e}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.metric{border:1px solid #d6dee6;border-top:3px solid #f28b2d;padding:10px}.metric b{display:block;font-size:18px;margin-top:5px}.ok{color:#b9f0d1}.warn{color:#ffd0a8}.scenario{background:#f7f9fb;border-right:4px solid #f28b2d;padding:12px;margin-top:20px}footer{margin-top:30px;border-top:1px solid #ccd7e0;padding-top:12px;color:#50697d;font-size:12px}</style></head><body><header><h1>TOLUE Concrete Compaction</h1><h3>ارزیابی قابلیت بتن‌ریزی و تراکم در شبکه آرماتور</h3><div>${context.project.metadata.projectNumber} • ${context.project.metadata.name} • ${context.mix.name}</div></header><section class="hero"><div class="score"><span>نمره قابلیت اجرا</span><b>${result.score}</b><strong>${result.rankFa} • ${result.labelFa}</strong></div><div><h3>جمع‌بندی سناریوی آرماتور</h3><ul>${notes||'<li>مورد برجسته‌ای ثبت نشده است.</li>'}</ul><small>${result.method} — Heuristic داخلی TOLUE</small></div></section><div class="metrics"><div class="metric">تراکم مؤثر<b>${result.effectiveCompactionScore}/100</b></div><div class="metric">ایمنی در برابر Bridge<b>${result.bridgeSafetyScore}/100</b></div><div class="metric">ایمنی تراکم موضعی<b>${result.localCompactionSafetyScore}/100</b></div><div class="metric">عبور سنگدانه<b>${result.aggregatePassingScore}/100</b></div><div class="metric">دسترسی ویبراتور<b>${result.vibratorAccessibilityScore}/100</b></div><div class="metric">گلوگاه مؤثر<b>${result.governingOpeningMm} mm</b></div></div><div class="scenario"><b>سناریوی آرماتور:</b> X: Ø${network.x.barDiameterMm} @ ${network.x.centerSpacingMm} mm • Y: Ø${network.y.barDiameterMm} @ ${network.y.centerSpacingMm} mm • ${network.layers} لایه • فاصله خالص لایه ${network.clearLayerSpacingMm} mm • کاور ${network.coverMm} mm • سر ویبراتور ${network.vibratorHeadDiameterMm} mm<br/><b>Bridge:</b> ریسک ${result.bridgeRiskScore}/100 • ذرات حساس ${result.bridgeCandidateSharePercent}% • بحرانی ${result.bridgeCriticalSharePercent}% • سلول‌های متاثر از آرماتور ${result.rebarAffectedCells}</div><p>این گزارش تحلیل قابلیت اجرا/عبور و تراکم است و طراحی سازه‌ای آرماتور، پذیرش استاندارد یا پیش‌بینی قطعی کرموشدگی محسوب نمی‌شود.</p><footer>طراح: ${PRODUCT_IDENTITY.designer} • ${PRODUCT_IDENTITY.phone} • ${PRODUCT_IDENTITY.email} • ${PRODUCT_IDENTITY.website}<br/>تولید گزارش: ${new Date().toLocaleString('fa-IR')}</footer></body></html>`;
  downloadBlob(`${context.project.metadata.projectNumber}-${safeName(context.mix.name)}-Rebar-Placement-Assessment.html`,new Blob([html],{type:'text/html;charset=utf-8'}));
}

export function exportProjectPlacementAssessmentCsv(project:ConcreteProject,network:RebarNetworkInput=defaultRebarNetwork){
  const result=evaluateProjectAssessment(project,20260905,network);
  const rows=[['رتبه','نام طرح','نمره بتن','سطح بتن','نمره اجرا در آرماتور','سطح اجرا','تراکم موثر','Bridge Safety','Local Safety','Aggregate Passing','Vibrator Access','گلوگاه mm']];
  [...result.mixes].sort((a,b)=>b.placementAssessment.score-a.placementAssessment.score).forEach((item,index)=>rows.push([String(index+1),item.mixName,String(item.score),item.rankFa,String(item.placementAssessment.score),item.placementAssessment.rankFa,String(item.placementAssessment.effectiveCompactionScore),String(item.placementAssessment.bridgeSafetyScore),String(item.placementAssessment.localCompactionSafetyScore),String(item.placementAssessment.aggregatePassingScore),String(item.placementAssessment.vibratorAccessibilityScore),String(item.placementAssessment.governingOpeningMm)]));
  const csv='\ufeff'+rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadBlob(`${project.metadata.projectNumber}-Rebar-Placement-Ranking.csv`,new Blob([csv],{type:'text/csv;charset=utf-8'}));
}

export function exportProjectPlacementAssessmentReport(project:ConcreteProject,network:RebarNetworkInput=defaultRebarNetwork){
  const result=evaluateProjectAssessment(project,20260905,network);
  const sorted=[...result.mixes].sort((a,b)=>b.placementAssessment.score-a.placementAssessment.score);
  const rows=sorted.map((item,index)=>`<tr class="${index===0?'best':''}"><td>${index+1}</td><td>${item.mixName}</td><td>${item.score}</td><td>${item.rankFa}</td><td><b>${item.placementAssessment.score}</b></td><td>${item.placementAssessment.rankFa}</td><td>${item.placementAssessment.bridgeSafetyScore}</td><td>${item.placementAssessment.localCompactionSafetyScore}</td><td>${item.placementAssessment.vibratorAccessibilityScore}</td></tr>`).join('');
  const html=`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${project.metadata.projectNumber} - رتبه‌بندی آرماتور</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:36px;color:#10243b}header{border-bottom:5px solid #f28b2d;padding-bottom:16px}.summary{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:22px 0}.summary div{background:#071f38;color:#fff;padding:14px;border-radius:10px}.summary b{display:block;font-size:26px;color:#f7a14e;margin-top:5px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #d4dee7;padding:9px;text-align:center}th{background:#0d3152;color:#fff}.best{background:#edf9f2}.notice{margin-top:20px;border-right:4px solid #f28b2d;background:#f7f9fb;padding:12px}footer{margin-top:30px;border-top:1px solid #ccd7e0;padding-top:12px;color:#50697d;font-size:12px}</style></head><body><header><h1>رتبه‌بندی قابلیت اجرا در شبکه آرماتور</h1><h3>TOLUE Concrete Compaction</h3><div>${project.metadata.projectNumber} • ${project.metadata.name}</div></header><section class="summary"><div>میانگین نمره بتن<b>${result.averageScore}/100</b></div><div>میانگین قابلیت اجرا در آرماتور<b>${result.averagePlacementScore}/100</b></div></section><table><thead><tr><th>رتبه اجرا</th><th>طرح</th><th>نمره بتن</th><th>سطح بتن</th><th>نمره اجرا</th><th>سطح اجرا</th><th>Bridge Safety</th><th>Local Safety</th><th>Vibrator</th></tr></thead><tbody>${rows}</tbody></table><div class="notice">سناریوی مشترک: X Ø${network.x.barDiameterMm}@${network.x.centerSpacingMm}، Y Ø${network.y.barDiameterMm}@${network.y.centerSpacingMm}، ${network.layers} لایه، فاصله خالص لایه ${network.clearLayerSpacingMm} mm، کاور ${network.coverMm} mm. همه طرح‌ها با Seed یکسان مقایسه شده‌اند.<br/>${result.noteFa}</div><footer>طراح: ${PRODUCT_IDENTITY.designer} • ${PRODUCT_IDENTITY.phone} • ${PRODUCT_IDENTITY.email} • ${PRODUCT_IDENTITY.website}</footer></body></html>`;
  downloadBlob(`${project.metadata.projectNumber}-Rebar-Placement-Assessment.html`,new Blob([html],{type:'text/html;charset=utf-8'}));
}
