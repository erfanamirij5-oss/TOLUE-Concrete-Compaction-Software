import type { ConcreteProject } from '../domain/project';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { DiagnosticSummary } from '../engineering/diagnostics';
import type { PackingResult } from '../engineering/packing';
import { downloadSnapshot, exportAIAnalysisPackage, exportEngineeringReport } from '../services/reportExport';

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
  return <div className="editor-overlay report-panel">
    <div className="editor-header"><div><b>REPORT & EVIDENCE EXPORT</b><span>Project report, 3D snapshots and AI-ready engineering package</span></div><button onClick={props.onClose}>×</button></div>
    <div className="report-summary-grid">
      <div><span>Project</span><b>{props.project.metadata.projectNumber}</b><small>{props.project.metadata.name}</small></div>
      <div><span>Mix</span><b>{props.mix.name}</b><small>{props.project.mixes.length} mixes in project</small></div>
      <div><span>Diagnostic score</span><b>{props.diagnostics.score}/100</b><small>{props.diagnostics.critical} critical • {props.diagnostics.warnings} warning</small></div>
      <div><span>Packing estimate</span><b>{(props.packing.packingDensity * 100).toFixed(1)}%</b><small>{props.packing.method}</small></div>
    </div>
    <div className="report-export-cards">
      <article><b>ENGINEERING REPORT</b><p>Creates a branded HTML report containing project metadata, mix table, volumetric metrics, diagnostics, model notice and current 3D snapshot. It can be opened in a browser and printed to PDF.</p><button className="primary-action" onClick={() => exportEngineeringReport(context)}>EXPORT REPORT</button></article>
      <article><b>3D / SECTION SNAPSHOT</b><p>Exports the currently visible Three.js canvas as PNG. In Compare Mode both visible specimens are exported as separate snapshots.</p><button onClick={() => downloadSnapshot(`${props.project.metadata.projectNumber}-${props.mix.name}`)}>EXPORT PNG</button></article>
      <article><b>AI ANALYSIS PACKAGE</b><p>Creates one JSON package with complete mix input, derived engineering metrics, diagnostics, macro-prompt, product identity and current rendered snapshot(s).</p><button onClick={() => exportAIAnalysisPackage(context)}>EXPORT AI PACKAGE</button></article>
    </div>
    <div className="ai-review-warning">Engineering report outputs must distinguish measured test results from heuristic/model estimates. Current RSA packing and compaction values are not yet validated DEM or laboratory measurements.</div>
  </div>;
}
