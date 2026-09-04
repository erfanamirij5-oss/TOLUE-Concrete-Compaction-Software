import { useMemo, useState } from 'react';
import { ConcreteCube } from './components/ConcreteCube';
import { GradationEditor } from './components/GradationEditor';
import { MixDesignEditor } from './components/MixDesignEditor';
import { analyzeMix } from './engineering/analyzeMix';
import { analyzeGradation } from './engineering/gradation';
import { defaultMix, type MixDesign } from './domain/mixDesign';

type EditorMode = 'mix' | 'gradation' | null;

export function App() {
  const [mix, setMix] = useState<MixDesign>(defaultMix);
  const [editorMode, setEditorMode] = useState<EditorMode>('mix');
  const analysis = useMemo(() => analyzeMix(mix), [mix]);
  const gradationAnalyses = useMemo(() => mix.gradations.map(analyzeGradation), [mix.gradations]);
  const gradationsValid = gradationAnalyses.every((item) => item.valid);

  const metrics = [
    ['Total material volume', `${analysis.totalSolidAndLiquidVolumeM3.toFixed(3)} m³`],
    ['Paste volume', `${analysis.pasteVolumeM3.toFixed(3)} m³`],
    ['Aggregate volume', `${analysis.aggregateVolumeM3.toFixed(3)} m³`],
    ['w/cm', analysis.wCm.toFixed(3)],
    ['Designed air', `${(analysis.designedAirVolumeM3 * 100).toFixed(1)} %`],
    ['Closure error', `${analysis.volumeClosureErrorPercent.toFixed(1)} %`],
  ];

  const volumeOk = Math.abs(analysis.volumeClosureErrorPercent) <= 3;

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
          <div className="tree">⬡ Simulation</div>
          <div className="tree">⇄ Comparison</div>
          <div className="tree">▤ Reports</div>
        </aside>

        <section className="viewport">
          <div className="viewport-toolbar">
            <span>3D SPECIMEN • PSD DRIVEN</span>
            <div>
              <button onClick={() => setEditorMode(editorMode === 'mix' ? null : 'mix')}>Mix Input</button>
              <button onClick={() => setEditorMode(editorMode === 'gradation' ? null : 'gradation')}>Gradation</button>
              <button>Orbit</button><button>Section</button><button>Ghost</button><button>Snapshot</button>
            </div>
          </div>
          <ConcreteCube analysis={analysis} mix={mix} />
          {editorMode === 'mix' && <MixDesignEditor mix={mix} onChange={setMix} />}
          {editorMode === 'gradation' && <GradationEditor mix={mix} onChange={setMix} onClose={() => setEditorMode(null)} />}
        </section>

        <aside className="panel right-panel">
          <div className="panel-title">ENGINEERING INSPECTOR</div>
          <div className="status-card">
            <span>Volume closure</span>
            <strong className={volumeOk ? 'ok' : 'warn'}>{volumeOk ? 'ACCEPTABLE' : 'REVIEW MIX'}</strong>
          </div>
          <div className="status-card gradation-status">
            <span>Gradation data</span>
            <strong className={gradationsValid ? 'ok' : 'warn'}>{gradationsValid ? 'VALID' : 'REVIEW PSD'}</strong>
          </div>
          <div className="metric-grid">
            {metrics.map(([name, value]) => <div className="metric" key={name}><span>{name}</span><b>{value}</b></div>)}
          </div>

          <div className="panel-title secondary">GRADATION SUMMARY</div>
          <div className="volume-list">
            {mix.gradations.map((curve) => {
              const result = analyzeGradation(curve);
              return <div className="volume-row" key={curve.materialKey}><span>{curve.label}</span><b>D50 {result.d50 ? result.d50.toFixed(1) : '—'} mm</b></div>;
            })}
          </div>

          <button className="run" disabled={!gradationsValid}>RUN PACKING ANALYSIS</button>
        </aside>
      </section>

      <footer className="statusbar">
        <span>TOLUE Concrete Compaction v0.1.0-alpha</span>
        <span>SPECIMEN: 1.000 × 1.000 × 1.000 m • MASS + DENSITY + GRADATION MODEL</span>
      </footer>
    </main>
  );
}
