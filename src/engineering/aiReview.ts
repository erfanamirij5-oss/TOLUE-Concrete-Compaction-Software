import type { ConcreteProject } from '../domain/project';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { DiagnosticSummary } from './diagnostics';
import type { PackingResult } from './packing';

export interface AIReviewPayload {
  prompt: string;
  compactData: string;
}

export function buildAIReviewPrompt(project: ConcreteProject, mix: MixDesign, analysis: MixAnalysis, packing: PackingResult, diagnostics: DiagnosticSummary): AIReviewPayload {
  const materialTable = mix.materials.map((m) => `${m.label}: ${m.massKgPerM3} kg/m³; density ${m.densityKgPerM3} kg/m³`).join('\n');
  const gradationTable = mix.gradations.map((curve) => `${curve.label}: ${curve.points.map((p) => `${p.sieveMm}mm=${p.passingPercent}%`).join(', ')}`).join('\n');
  const diagnosticText = diagnostics.items.map((item) => `- [${item.severity}] ${item.title}: ${item.observation} | cause: ${item.cause} | recommendation: ${item.recommendation}`).join('\n') || '- No active heuristic warnings.';

  const compactData = [
    `Project: ${project.metadata.projectNumber} | ${project.metadata.name}`,
    `Mix: ${mix.name} (${mix.id})`,
    `w/cm: ${analysis.wCm.toFixed(3)}`,
    `Paste volume: ${analysis.pasteVolumeM3.toFixed(4)} m³/m³`,
    `Mortar volume: ${analysis.mortarVolumeM3.toFixed(4)} m³/m³`,
    `Aggregate volume: ${analysis.aggregateVolumeM3.toFixed(4)} m³/m³`,
    `Packing density estimate: ${(packing.packingDensity * 100).toFixed(2)}%`,
    `Void fraction estimate: ${(packing.voidFraction * 100).toFixed(2)}%`,
    `Void ratio: ${packing.voidRatio.toFixed(4)}`,
    `Volume closure error: ${analysis.volumeClosureErrorPercent.toFixed(2)}%`,
    `Diagnostic score: ${diagnostics.score}/100`,
  ].join('\n');

  const prompt = `You are the AI engineering review module of TOLUE Concrete Compaction, a professional concrete mix, aggregate packing and compaction analysis application designed by Engineer Erfan Amiri.\n\nROLE\nAct as a senior concrete materials engineer. Analyze only from the supplied project data, uploaded images, test results and explicitly stated standards. Separate measured facts, model estimates, assumptions and recommendations. Never present heuristic packing outputs as validated laboratory or DEM results.\n\nREVIEW OBJECTIVES\n1. Check absolute-volume consistency, w/cm, paste/mortar/aggregate balance and air assumptions.\n2. Interpret aggregate gradation and identify gaps, excessive fines/coarse fractions and likely packing inefficiencies.\n3. Review packing density/void estimates and explain engineering implications without overstating model certainty.\n4. Assess likely workability, cohesiveness, bleeding, segregation, pumpability, finishability, shrinkage and durability risks.\n5. If images are attached, inspect visible particle distribution, segregation, voids, paste zones, surface defects or section characteristics and explicitly distinguish visual evidence from numerical evidence.\n6. Rank findings by severity: Critical / Warning / Observation / Positive.\n7. For every problem provide: evidence, likely mechanism, consequence, recommended change, expected trade-off and what test should verify it.\n8. Do not change multiple mix variables blindly. Propose controlled engineering trials and indicate which variable should be changed first.\n9. Where a standard limit is needed but no standard/exposure class is supplied, state that a standards-based acceptance decision cannot yet be made.\n10. End with a concise engineering decision: Accept for further testing / Revise mix / Input data insufficient.\n\nPROJECT\nNumber: ${project.metadata.projectNumber}\nName: ${project.metadata.name}\nClient: ${project.metadata.client || 'Not specified'}\nLocation: ${project.metadata.location || 'Not specified'}\nDescription: ${project.metadata.description || 'Not specified'}\n\nMIX DESIGN\n${materialTable}\nTarget air: ${mix.targetAirPercent}%\n\nGRADATIONS\n${gradationTable}\n\nDERIVED ENGINEERING DATA\n${compactData}\n\nCURRENT RULE-BASED DIAGNOSTICS\n${diagnosticText}\n\nOUTPUT FORMAT\nReturn: Executive Summary; Input Integrity; Volumetric Analysis; Gradation & Packing; Fresh Concrete Risks; Durability/Strength Considerations; Image Review (if images supplied); Prioritized Corrective Actions; Recommended Validation Tests; Final Engineering Decision. Use numerical evidence wherever possible.`;

  return { prompt, compactData };
}
