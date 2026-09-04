import { useMemo, useState } from 'react';
import type { ConcreteProject } from '../domain/project';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { DiagnosticSummary } from '../engineering/diagnostics';
import type { PackingResult } from '../engineering/packing';
import { buildAIReviewPrompt } from '../engineering/aiReview';

interface Props {
  project: ConcreteProject;
  mix: MixDesign;
  analysis: MixAnalysis;
  packing: PackingResult;
  diagnostics: DiagnosticSummary;
  onClose: () => void;
}

export function AIReviewPanel(props: Props) {
  const payload = useMemo(() => buildAIReviewPrompt(props.project, props.mix, props.analysis, props.packing, props.diagnostics), [props.project, props.mix, props.analysis, props.packing, props.diagnostics]);
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(payload.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="editor-overlay ai-review-panel">
      <div className="editor-header">
        <div><b>AI ENGINEERING REVIEW</b><span>Macro-prompt + structured project data for external AI interpretation</span></div>
        <button onClick={props.onClose}>×</button>
      </div>
      <div className="ai-review-warning">AI analysis is advisory. Final engineering acceptance must rely on verified test data, project requirements and applicable standards.</div>
      <div className="ai-data-card"><pre>{payload.compactData}</pre></div>
      <label className="ai-prompt-label"><span>Engineering macro-prompt</span><textarea readOnly value={payload.prompt} /></label>
      <div className="project-actions">
        <button className="primary-action" onClick={copyPrompt}>{copied ? 'COPIED' : 'COPY AI REVIEW PROMPT'}</button>
        <button onClick={() => navigator.clipboard.writeText(payload.compactData)}>COPY DATA ONLY</button>
      </div>
      <p className="ai-image-note">Image workflow: attach the 3D snapshot, section image or laboratory photograph together with this prompt in the selected AI service. The prompt explicitly instructs the model to separate visual evidence from numerical/model evidence.</p>
    </div>
  );
}
