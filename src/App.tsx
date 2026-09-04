import { useMemo, useState } from 'react';
import { ConcreteCube } from './components/ConcreteCube';
import { GradationEditor } from './components/GradationEditor';
import { MixDesignEditor } from './components/MixDesignEditor';
import { analyzeMix } from './engineering/analyzeMix';
import { analyzeGradation } from './engineering/gradation';
import { generatePacking } from './engineering/packing';
import { defaultMix, type MixDesign } from './domain/mixDesign';

type EditorMode = 'mix' | 'gradation' | null;

export function App() {
  const [mix, setMix] = useState<MixDesign>(defaultMix);
  const [editorMode, setEditorMode] = useState<EditorMode>('mix');
  const [packingSeed, setPackingSeed] = useState(20260905);
  const analysis = useMemo(() => analyzeMix(mix), [mix]);
  const gradationAnalyses = useMemo(() => mix.gradations.map(analyzeGradation), [mix.gradations]);
  const gradationsValid = gradationAnalyses.every((item) => item.valid);
  const packing = useMemo(() => generatePacking(mix, analysis, packingSeed), [mix, analysis, packingSeed]);

  const metrics = [
    ['Packing density', `${(packing.packingDensity * 100).toFixed(1)} %`],
    ['Void ratio e', packing.voidRatio.toFixed(3)],
    ['Void fraction', `${(packing.voidFraction * 100).toFixed(1)} %`],
    ['Placement efficiency', `${(packing.placementEfficiency * 100).toFixed(1)} %`],
    ['Paste volume', `${analysis.pasteVolumeM3.toFixed(3)} m³`],
    ['w/cm', analysis.wCm.toFixed(3)],
  ];

  const volumeOk = Math.abs(analysis.volumeClosureErrorPercent) <= 3;
  const packingClass = packing.packingDensity >= 0.64 ? 'DENSE' : packing.packingDensity >= 0.59 ? 'MODERATE' : 'LOOSE';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">TOLUE <span>CONCRETE COMPACTION</span></div>
          <div className="subtitle">3D Packing & Mix Engineering Workspace</div>
        </div>
        <div className="project-chip">PROJECT / TCC-001</div>
      </header>

      <section className="workspace">
        <aside className="panel left-panel">
          <div className="panel-title">PROJECT EXPLORER</div>
          <button className="primary" onClick={() => setEditorMode('mix')}>+ Edit Mix Design</button>
          <div className="tree active">◇ {mix.name}</div>
          <div className="tree">▦ Materials</div>
          <button className="tree tree-button" onClick={() => setEditorMode('gradation')}>◫ Gradation <span className={gradationsValid ? 'tree-ok' : 'tree-warn'}>{gradationsValid ? '✓' : '!'}</span></button>
          <div className="tree">⬡ Packing Simulation</div>
          <div className="tree">⇄ Comparison</div>
          <div className="tree">▤ Reports</div>
        </aside>

        <section className="viewport">
          <div className="viewport-toolbar">
            <span>3D SPECIMEN • PACKING ENGINE V1</span>
            <div>
              <button onClick={() => setEditorMode(editorMode === 'mix' ? null : 'mix')}>Mix Input</button>
              <button onClick={() => setEditorMode(editorMode === 'gradation' ? null : 'gradation')}>Gradation</button>
              <button>Orbit</button><button>Section</button><button>Ghost</button><button>Snapshot</button>
            </div>
          </div>
          <ConcreteCube analysis={analysis} packing={packing} />
          {editorMode === 'mix' && <MixDesignEditor mix={mix} onChange={setMix} />}
          {editorMode === 'gradation' && <GradationEditor mix={mix} onChange={setMix} onClose={() => setEditorMode(null)} />}
        </section>

        <aside className="panel right-panel">
          <div className="panel-title">ENGINEERING INSPECTOR</div>
          <div className="status-card">
            <span>Packing state</span>
            <strong className={packing.packingDensity >= 0.59 ? 'ok' : 'warn'}>{packingClass}</strong>
          </div>
          <div className="status-card gradation-status">
            <span>Gradation / volume</span>
            <strong className={gradationsValid && volumeOk ? 'ok' : 'warn'}>{gradationsValid && volumeOk ? 'READY' : 'REVIEW INPUT'}</strong>
          </div>
          <div className="metric-grid">
            {metrics.map(([name, value]) => <div className="metric" key={name}><span>{name}</span><b>{value}</b></div>)}
          </div>

          <div className="panel-title secondary">PACKING DIAGNOSTICS</div>
          <div className="volume-list">
            <div className="volume-row"><span>Placed particles</span><b>{packing.particles.length}</b></div>
            <div className="volume-row"><span>Rejected placements</span><b>{packing.rejectedPlacements}</b></div>
            <div className="volume-row"><span>PSD continuity score</span><b>{(packing.continuityScore * 100).toFixed(0)} %</b></div>
            <div className="volume-row"><span>Simulation seed</span><b>{packingSeed}</b></div>
            <div className="volume-row"><span>Method</span><b>RSA v1</b></div>
          </div>

          <button className="run" disabled={!gradationsValid} onClick={() => setPackingSeed((seed) => seed + 1)}>REGENERATE PACKING</button>
        </aside>
      </section>

      <footer className="statusbar">
        <span>TOLUE Concrete Compaction v0.1.0-alpha</span>
        <span>PACKING MODEL: STOCHASTIC RSA V1 • PSD + VOLUME DRIVEN</span>
      </footer>
    </main>
  );
}
