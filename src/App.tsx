import { useEffect, useMemo, useState } from 'react';
import { CompareMode } from './components/CompareMode';
import { ConcreteCube } from './components/ConcreteCube';
import { GradationEditor } from './components/GradationEditor';
import { MixDesignEditor } from './components/MixDesignEditor';
import { analyzeMix } from './engineering/analyzeMix';
import { analyzeGradation } from './engineering/gradation';
import { generatePacking } from './engineering/packing';
import { evaluateCompaction } from './engineering/compaction';
import { compareMixes, createVariantMix } from './engineering/comparison';
import { defaultMix, type MixDesign } from './domain/mixDesign';
import { defaultViewControls, type SectionAxis, type ViewControls } from './domain/viewControls';

type EditorMode = 'mix' | 'gradation' | null;
type WorkspaceMode = 'single' | 'compare';
type ActiveMix = 'A' | 'B';

export function App() {
  const [mixA, setMixA] = useState<MixDesign>(defaultMix);
  const [mixB, setMixB] = useState<MixDesign>(() => createVariantMix(defaultMix));
  const [activeMix, setActiveMix] = useState<ActiveMix>('A');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('single');
  const [editorMode, setEditorMode] = useState<EditorMode>('mix');
  const [packingSeed, setPackingSeed] = useState(20260905);
  const [compactionProgress, setCompactionProgress] = useState(0);
  const [compacting, setCompacting] = useState(false);
  const [view, setView] = useState<ViewControls>(defaultViewControls);

  const mix = activeMix === 'A' ? mixA : mixB;
  const setMix = activeMix === 'A' ? setMixA : setMixB;

  const analysisA = useMemo(() => analyzeMix(mixA), [mixA]);
  const analysisB = useMemo(() => analyzeMix(mixB), [mixB]);
  const packingA = useMemo(() => generatePacking(mixA, analysisA, packingSeed), [mixA, analysisA, packingSeed]);
  const packingB = useMemo(() => generatePacking(mixB, analysisB, packingSeed + 97), [mixB, analysisB, packingSeed]);
  const compactionA = useMemo(() => evaluateCompaction(packingA, compactionProgress), [packingA, compactionProgress]);
  const compactionB = useMemo(() => evaluateCompaction(packingB, compactionProgress), [packingB, compactionProgress]);
  const comparison = useMemo(() => compareMixes(analysisA, packingA, analysisB, packingB), [analysisA, analysisB, packingA, packingB]);

  const analysis = activeMix === 'A' ? analysisA : analysisB;
  const packing = activeMix === 'A' ? packingA : packingB;
  const compaction = activeMix === 'A' ? compactionA : compactionB;
  const gradationAnalyses = useMemo(() => mix.gradations.map(analyzeGradation), [mix.gradations]);
  const gradationsValid = gradationAnalyses.every((item) => item.valid);

  useEffect(() => {
    if (!compacting) return;
    const timer = window.setInterval(() => {
      setCompactionProgress((current) => {
        const next = Math.min(1, current + 0.0125);
        if (next >= 1) setCompacting(false);
        return next;
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [compacting]);

  const metrics = [
    ['Packing density', `${(compaction.packingDensity * 100).toFixed(1)} %`],
    ['Void ratio e', compaction.voidRatio.toFixed(3)],
    ['Void fraction', `${(compaction.voidFraction * 100).toFixed(1)} %`],
    ['Compaction progress', `${(compaction.progress * 100).toFixed(0)} %`],
    ['Paste volume', `${analysis.pasteVolumeM3.toFixed(3)} m³`],
    ['w/cm', analysis.wCm.toFixed(3)],
  ];

  const volumeOk = Math.abs(analysis.volumeClosureErrorPercent) <= 3;
  const stateLabel = compaction.stage === 'loose' ? 'LOOSE' : compaction.stage === 'vibrating' ? 'VIBRATING' : 'COMPACTED';
  const setPhase = (key: keyof ViewControls['phases'], value: boolean) => setView((current) => ({ ...current, phases: { ...current.phases, [key]: value } }));

  const regeneratePacking = () => {
    setPackingSeed((seed) => seed + 1);
    setCompactionProgress(0);
    setCompacting(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><div className="brand">TOLUE <span>CONCRETE COMPACTION</span></div><div className="subtitle">3D Packing & Mix Engineering Workspace</div></div>
        <div className="project-chip">PROJECT / TCC-001</div>
      </header>

      <section className="workspace">
        <aside className="panel left-panel">
          <div className="panel-title">PROJECT EXPLORER</div>
          <div className="mix-switch">
            <button className={activeMix === 'A' ? 'active' : ''} onClick={() => setActiveMix('A')}>MIX A</button>
            <button className={activeMix === 'B' ? 'active' : ''} onClick={() => setActiveMix('B')}>MIX B</button>
          </div>
          <button className="primary" onClick={() => setEditorMode('mix')}>+ Edit {activeMix === 'A' ? 'Mix A' : 'Mix B'}</button>
          <div className="tree active">◇ {mix.name}</div>
          <div className="tree">▦ Materials</div>
          <button className="tree tree-button" onClick={() => setEditorMode('gradation')}>◫ Gradation <span className={gradationsValid ? 'tree-ok' : 'tree-warn'}>{gradationsValid ? '✓' : '!'}</span></button>
          <div className="tree">⬡ Compaction Simulation</div>
          <div className="tree">◩ Section / Visibility</div>
          <button className="tree tree-button" onClick={() => setWorkspaceMode(workspaceMode === 'compare' ? 'single' : 'compare')}>⇄ Comparison <span>{workspaceMode === 'compare' ? 'ON' : ''}</span></button>
          <div className="tree">▤ Reports</div>
        </aside>

        <section className="viewport">
          <div className="viewport-toolbar">
            <span>{workspaceMode === 'compare' ? 'COMPARE MODE • MIX A ↔ MIX B' : `3D SPECIMEN • MIX ${activeMix}`}</span>
            <div>
              <button onClick={() => setWorkspaceMode(workspaceMode === 'compare' ? 'single' : 'compare')}>{workspaceMode === 'compare' ? 'Single View' : 'Compare'}</button>
              <button onClick={() => setEditorMode(editorMode === 'mix' ? null : 'mix')}>Mix Input</button>
              <button onClick={() => setView((current) => ({ ...current, sectionEnabled: !current.sectionEnabled }))}>{view.sectionEnabled ? 'Section Off' : 'Section'}</button>
              <button onClick={() => setView((current) => ({ ...current, ghostMode: !current.ghostMode }))}>{view.ghostMode ? 'Solid' : 'Ghost'}</button>
            </div>
          </div>

          {workspaceMode === 'compare' ? (
            <CompareMode mixA={mixA} mixB={mixB} analysisA={analysisA} analysisB={analysisB} packingA={packingA} packingB={packingB} compactionA={compactionA} compactionB={compactionB} view={view} metrics={comparison} />
          ) : (
            <ConcreteCube analysis={analysis} packing={packing} compaction={compaction} view={view} />
          )}

          {editorMode === 'mix' && <MixDesignEditor mix={mix} onChange={setMix} />}
          {editorMode === 'gradation' && <GradationEditor mix={mix} onChange={setMix} onClose={() => setEditorMode(null)} />}
        </section>

        <aside className="panel right-panel">
          <div className="panel-title">ENGINEERING INSPECTOR</div>
          {workspaceMode === 'compare' ? (
            <>
              <div className="status-card"><span>Comparison</span><strong className="ok">A ↔ B LIVE</strong></div>
              <div className="panel-title secondary">KEY DIFFERENCES</div>
              <div className="volume-list">
                {comparison.slice(0, 6).map((item) => <div className="volume-row" key={item.key}><span>{item.label}</span><b>{item.delta >= 0 ? '+' : ''}{item.delta.toFixed(item.unit === '%' ? 1 : 3)} {item.unit}</b></div>)}
              </div>
              <div className="panel-title secondary">EDIT TARGET</div>
              <div className="mix-switch"><button className={activeMix === 'A' ? 'active' : ''} onClick={() => setActiveMix('A')}>MIX A</button><button className={activeMix === 'B' ? 'active' : ''} onClick={() => setActiveMix('B')}>MIX B</button></div>
              <button className="run" onClick={() => setEditorMode('mix')}>EDIT SELECTED MIX</button>
            </>
          ) : (
            <>
              <div className="status-card"><span>Compaction state</span><strong className={compaction.stage === 'compacted' ? 'ok' : 'warn'}>{stateLabel}</strong></div>
              <div className="status-card gradation-status"><span>Gradation / volume</span><strong className={gradationsValid && volumeOk ? 'ok' : 'warn'}>{gradationsValid && volumeOk ? 'READY' : 'REVIEW INPUT'}</strong></div>
              <div className="compaction-progress"><i style={{ width: `${compaction.progress * 100}%` }} /></div>
              <div className="metric-grid">{metrics.map(([name, value]) => <div className="metric" key={name}><span>{name}</span><b>{value}</b></div>)}</div>
            </>
          )}

          <div className="panel-title secondary">SYNCHRONIZED VIEW</div>
          <label className="phase-row"><input type="checkbox" checked={view.sectionEnabled} onChange={(e) => setView((current) => ({ ...current, sectionEnabled: e.target.checked }))} /><span>Enable cut plane</span></label>
          <div className="axis-buttons">{(['x', 'y', 'z'] as SectionAxis[]).map((axis) => <button key={axis} className={view.sectionAxis === axis ? 'active' : ''} onClick={() => setView((current) => ({ ...current, sectionAxis: axis }))}>{axis.toUpperCase()}</button>)}</div>
          <label className="slider-row"><span>Cut position</span><input type="range" min="-0.5" max="0.5" step="0.01" value={view.sectionPosition} onChange={(e) => setView((current) => ({ ...current, sectionPosition: Number(e.target.value) }))} /><b>{view.sectionPosition.toFixed(2)} m</b></label>
          <label className="phase-row"><input type="checkbox" checked={view.ghostMode} onChange={(e) => setView((current) => ({ ...current, ghostMode: e.target.checked }))} /><span>Ghost mode</span></label>
          <label className="phase-row"><input type="checkbox" checked={view.phases.sand} onChange={(e) => setPhase('sand', e.target.checked)} /><span>Sand</span></label>
          <label className="phase-row"><input type="checkbox" checked={view.phases.aggregate5to12} onChange={(e) => setPhase('aggregate5to12', e.target.checked)} /><span>Aggregate 4.75–12</span></label>
          <label className="phase-row"><input type="checkbox" checked={view.phases.aggregate12to25} onChange={(e) => setPhase('aggregate12to25', e.target.checked)} /><span>Aggregate 12–25</span></label>
          <label className="phase-row"><input type="checkbox" checked={view.phases.paste} onChange={(e) => setPhase('paste', e.target.checked)} /><span>Paste</span></label>

          <button className="run" disabled={!gradationsValid || compacting || compactionProgress >= 1} onClick={() => setCompacting(true)}>{compacting ? 'VIBRATING…' : compactionProgress >= 1 ? 'COMPACTION COMPLETE' : 'START VIBRATION'}</button>
          <div className="action-row"><button onClick={() => { setCompacting(false); setCompactionProgress(0); }}>RESET</button><button onClick={regeneratePacking}>NEW PACKING</button></div>
        </aside>
      </section>

      <footer className="statusbar"><span>TOLUE Concrete Compaction v0.1.0-alpha</span><span>{workspaceMode === 'compare' ? 'COMPARE: TWO LIVE 1 m³ SPECIMENS + DELTA METRICS' : 'INSPECTION: CUT PLANE + GHOST + PHASE VISIBILITY'}</span></footer>
    </main>
  );
}
