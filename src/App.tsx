import { useMemo, useState } from 'react';
import { ConcreteCube } from './components/ConcreteCube';
import { MixDesignEditor } from './components/MixDesignEditor';
import { analyzeMix } from './engineering/analyzeMix';
import { defaultMix, type MixDesign } from './domain/mixDesign';

export function App() {
  const [mix, setMix] = useState<MixDesign>(defaultMix);
  const [editorOpen, setEditorOpen] = useState(true);
  const analysis = useMemo(() => analyzeMix(mix), [mix]);

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
          <button className="primary" onClick={() => setEditorOpen(true)}>+ Edit Mix Design</button>
          <div className="tree active">◇ {mix.name}</div>
          <div className="tree">▦ Materials</div>
          <div className="tree">◫ Gradation</div>
          <div className="tree">⬡ Simulation</div>
          <div className="tree">⇄ Comparison</div>
          <div className="tree">▤ Reports</div>
        </aside>

        <section className="viewport">
          <div className="viewport-toolbar">
            <span>3D SPECIMEN</span>
            <div>
              <button onClick={() => setEditorOpen((value) => !value)}>{editorOpen ? 'Hide Input' : 'Mix Input'}</button>
              <button>Orbit</button><button>Section</button><button>Ghost</button><button>Snapshot</button>
            </div>
          </div>
          <ConcreteCube analysis={analysis} />
          {editorOpen && <MixDesignEditor mix={mix} onChange={setMix} />}
        </section>

        <aside className="panel right-panel">
          <div className="panel-title">ENGINEERING INSPECTOR</div>
          <div className="status-card">
            <span>Volume closure</span>
            <strong className={volumeOk ? 'ok' : 'warn'}>{volumeOk ? 'ACCEPTABLE' : 'REVIEW MIX'}</strong>
          </div>
          <div className="metric-grid">
            {metrics.map(([name, value]) => <div className="metric" key={name}><span>{name}</span><b>{value}</b></div>)}
          </div>

          <div className="panel-title secondary">ABSOLUTE VOLUMES</div>
          <div className="volume-list">
            {analysis.materials.map((material) => (
              <div className="volume-row" key={material.key}>
                <span><i style={{ background: material.color }} />{material.label}</span>
                <b>{material.absoluteVolumeM3.toFixed(3)} m³</b>
              </div>
            ))}
          </div>

          <button className="run">RUN PACKING ANALYSIS</button>
        </aside>
      </section>

      <footer className="statusbar">
        <span>TOLUE Concrete Compaction v0.1.0-alpha</span>
        <span>SPECIMEN: 1.000 × 1.000 × 1.000 m • LIVE ABSOLUTE-VOLUME MODEL</span>
      </footer>
    </main>
  );
}
