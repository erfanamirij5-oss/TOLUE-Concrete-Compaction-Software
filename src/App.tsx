import { ConcreteCube } from './components/ConcreteCube';

const metrics = [
  ['Packing index', '—'],
  ['Paste volume', '—'],
  ['Air / voids', '—'],
  ['w/cm', '—'],
];

export function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand">TOLUE <span>CONCRETE COMPACTION</span></div>
          <div className="subtitle">3D Packing & Mix Engineering Workspace</div>
        </div>
        <div className="project-chip">PROJECT / UNTITLED</div>
      </header>

      <section className="workspace">
        <aside className="panel left-panel">
          <div className="panel-title">PROJECT EXPLORER</div>
          <button className="primary">+ New Mix Design</button>
          <div className="tree active">◇ Mix 01 / Baseline</div>
          <div className="tree">▦ Materials</div>
          <div className="tree">◫ Gradation</div>
          <div className="tree">⬡ Simulation</div>
          <div className="tree">⇄ Comparison</div>
          <div className="tree">▤ Reports</div>
        </aside>

        <section className="viewport">
          <div className="viewport-toolbar">
            <span>3D SPECIMEN</span>
            <div><button>Orbit</button><button>Section</button><button>Ghost</button><button>Snapshot</button></div>
          </div>
          <ConcreteCube />
        </section>

        <aside className="panel right-panel">
          <div className="panel-title">ENGINEERING INSPECTOR</div>
          <div className="status-card">
            <span>Simulation status</span>
            <strong>INPUT REQUIRED</strong>
          </div>
          <div className="metric-grid">
            {metrics.map(([name, value]) => <div className="metric" key={name}><span>{name}</span><b>{value}</b></div>)}
          </div>
          <div className="panel-title secondary">PHASE VISIBILITY</div>
          {['Coarse aggregate', 'Intermediate aggregate', 'Fine aggregate', 'Binder / paste', 'Air voids'].map((item) => (
            <label className="phase-row" key={item}><input type="checkbox" defaultChecked /> <span>{item}</span></label>
          ))}
          <button className="run">RUN PACKING ANALYSIS</button>
        </aside>
      </section>

      <footer className="statusbar"><span>TOLUE Concrete Compaction v0.1.0-alpha</span><span>SPECIMEN: 1.000 × 1.000 × 1.000 m</span></footer>
    </main>
  );
}
