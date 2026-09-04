import { useEffect, useMemo, useState } from 'react';
import { AIReviewPanel } from './components/AIReviewPanel';
import { CompareMode } from './components/CompareMode';
import { ConcreteCube } from './components/ConcreteCube';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { GradationEditor } from './components/GradationEditor';
import { MixDesignEditor } from './components/MixDesignEditor';
import { ProjectManager } from './components/ProjectManager';
import { PRODUCT_IDENTITY, type ConcreteProject } from './domain/project';
import type { MixDesign } from './domain/mixDesign';
import { defaultViewControls, type SectionAxis, type ViewControls } from './domain/viewControls';
import { analyzeMix } from './engineering/analyzeMix';
import { evaluateCompaction } from './engineering/compaction';
import { compareMixes } from './engineering/comparison';
import { diagnoseMix } from './engineering/diagnostics';
import { analyzeGradation } from './engineering/gradation';
import { generatePacking } from './engineering/packing';
import { addMix, createProject, deleteProject, exportProjectJson, listProjects, loadProject, removeMix, saveProject } from './services/projectStore';

type EditorMode = 'mix' | 'gradation' | null;
type WorkspaceMode = 'single' | 'compare';
type OverlayMode = 'project' | 'ai' | null;

function initialProject(): ConcreteProject {
  const first = listProjects()[0];
  return first ? loadProject(first.id) ?? createProject() : createProject();
}

export function App() {
  const [project, setProject] = useState<ConcreteProject>(initialProject);
  const [activeMixId, setActiveMixId] = useState(project.mixes[0].id);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('single');
  const [editorMode, setEditorMode] = useState<EditorMode>('mix');
  const [overlayMode, setOverlayMode] = useState<OverlayMode>(null);
  const [packingSeed, setPackingSeed] = useState(20260905);
  const [compactionProgress, setCompactionProgress] = useState(0);
  const [compacting, setCompacting] = useState(false);
  const [view, setView] = useState<ViewControls>(defaultViewControls);
  const [projectIndex, setProjectIndex] = useState(listProjects());

  const activeMix = project.mixes.find((item) => item.id === activeMixId) ?? project.mixes[0];
  const compareAId = project.compareSelection[0] ?? project.mixes[0]?.id;
  const compareBId = project.compareSelection[1] ?? project.mixes[1]?.id ?? project.mixes[0]?.id;
  const mixA = project.mixes.find((item) => item.id === compareAId) ?? project.mixes[0];
  const mixB = project.mixes.find((item) => item.id === compareBId) ?? project.mixes[1] ?? project.mixes[0];

  const analysis = useMemo(() => analyzeMix(activeMix), [activeMix]);
  const packing = useMemo(() => generatePacking(activeMix, analysis, packingSeed), [activeMix, analysis, packingSeed]);
  const compaction = useMemo(() => evaluateCompaction(packing, compactionProgress), [packing, compactionProgress]);
  const diagnostics = useMemo(() => diagnoseMix(activeMix, analysis, packing), [activeMix, analysis, packing]);

  const analysisA = useMemo(() => analyzeMix(mixA), [mixA]);
  const analysisB = useMemo(() => analyzeMix(mixB), [mixB]);
  const packingA = useMemo(() => generatePacking(mixA, analysisA, packingSeed), [mixA, analysisA, packingSeed]);
  const packingB = useMemo(() => generatePacking(mixB, analysisB, packingSeed + 97), [mixB, analysisB, packingSeed]);
  const compactionA = useMemo(() => evaluateCompaction(packingA, compactionProgress), [packingA, compactionProgress]);
  const compactionB = useMemo(() => evaluateCompaction(packingB, compactionProgress), [packingB, compactionProgress]);
  const comparison = useMemo(() => compareMixes(analysisA, packingA, analysisB, packingB), [analysisA, analysisB, packingA, packingB]);
  const diagnosticsA = useMemo(() => diagnoseMix(mixA, analysisA, packingA), [mixA, analysisA, packingA]);
  const diagnosticsB = useMemo(() => diagnoseMix(mixB, analysisB, packingB), [mixB, analysisB, packingB]);
  const gradationsValid = useMemo(() => activeMix.gradations.map(analyzeGradation).every((item) => item.valid), [activeMix.gradations]);

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

  const persist = (next: ConcreteProject) => {
    const saved = saveProject(next);
    setProject(saved);
    setProjectIndex(listProjects());
    return saved;
  };

  const updateActiveMix = (mix: MixDesign) => persist({ ...project, mixes: project.mixes.map((item) => item.id === mix.id ? mix : item) });
  const renameMix = (id: string, name: string) => persist({ ...project, mixes: project.mixes.map((item) => item.id === id ? { ...item, name } : item) });
  const setCompareSelection = (slot: 0 | 1, mixId: string) => {
    const selection: [string | null, string | null] = [...project.compareSelection];
    selection[slot] = mixId;
    persist({ ...project, compareSelection: selection });
  };

  const openProject = (id: string) => {
    const loaded = loadProject(id);
    if (!loaded) return;
    setProject(loaded);
    setActiveMixId(loaded.mixes[0].id);
    setCompactionProgress(0);
    setWorkspaceMode('single');
    setOverlayMode(null);
  };

  const newProject = (name: string) => {
    const next = createProject(name || 'New Concrete Project');
    setProject(next);
    setProjectIndex(listProjects());
    setActiveMixId(next.mixes[0].id);
    setWorkspaceMode('single');
    setOverlayMode(null);
  };

  const addProjectMix = (sourceId?: string) => {
    const next = addMix(project, sourceId);
    setProject(next);
    setProjectIndex(listProjects());
    setActiveMixId(next.mixes[next.mixes.length - 1].id);
  };

  const removeProjectMix = (id: string) => {
    const next = removeMix(project, id);
    setProject(next);
    setProjectIndex(listProjects());
    if (!next.mixes.some((item) => item.id === activeMixId)) setActiveMixId(next.mixes[0].id);
  };

  const setPhase = (key: keyof ViewControls['phases'], value: boolean) => setView((current) => ({ ...current, phases: { ...current.phases, [key]: value } }));
  const volumeOk = Math.abs(analysis.volumeClosureErrorPercent) <= 3;
  const stateLabel = compaction.stage === 'loose' ? 'LOOSE' : compaction.stage === 'vibrating' ? 'VIBRATING' : 'COMPACTED';
  const metrics = [
    ['Packing density', `${(compaction.packingDensity * 100).toFixed(1)} %`],
    ['Void ratio e', compaction.voidRatio.toFixed(3)],
    ['Void fraction', `${(compaction.voidFraction * 100).toFixed(1)} %`],
    ['Compaction', `${(compaction.progress * 100).toFixed(0)} %`],
    ['Paste volume', `${analysis.pasteVolumeM3.toFixed(3)} m³`],
    ['w/cm', analysis.wCm.toFixed(3)],
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><div className="brand">TOLUE <span>CONCRETE COMPACTION</span></div><div className="subtitle">3D Concrete Packing • Compaction • Mix Engineering</div></div>
        <div className="topbar-project"><b>{project.metadata.projectNumber}</b><span>{project.metadata.name}</span></div>
      </header>

      <section className="workspace">
        <aside className="panel left-panel">
          <div className="panel-title">PROJECT EXPLORER</div>
          <button className="primary" onClick={() => setOverlayMode('project')}>PROJECT MANAGER</button>
          <div className="project-mini"><b>{project.metadata.projectNumber}</b><span>{project.metadata.name}</span><small>{project.mixes.length} saved mix designs</small></div>
          <div className="panel-title secondary">MIX LIBRARY</div>
          <div className="mix-nav-list">
            {project.mixes.map((item, index) => <button key={item.id} className={item.id === activeMix.id ? 'active' : ''} onClick={() => { setActiveMixId(item.id); setWorkspaceMode('single'); }}><span>{String(index + 1).padStart(3, '0')}</span><b>{item.name}</b></button>)}
          </div>
          <button className="tree tree-button" onClick={() => setEditorMode('mix')}>✎ Edit mix</button>
          <button className="tree tree-button" onClick={() => setEditorMode('gradation')}>◫ Gradation <span className={gradationsValid ? 'tree-ok' : 'tree-warn'}>{gradationsValid ? '✓' : '!'}</span></button>
          <button className="tree tree-button" onClick={() => setWorkspaceMode(workspaceMode === 'compare' ? 'single' : 'compare')}>⇄ Compare selected <span>{workspaceMode === 'compare' ? 'ON' : ''}</span></button>
          <button className="tree tree-button ai-tree" onClick={() => setOverlayMode('ai')}>✦ AI Engineering Review</button>
          <div className="designer-card"><span>DESIGNED BY</span><b>{PRODUCT_IDENTITY.designer}</b><small>{PRODUCT_IDENTITY.phone}</small><small>{PRODUCT_IDENTITY.email}</small></div>
        </aside>

        <section className="viewport">
          <div className="viewport-toolbar">
            <span>{workspaceMode === 'compare' ? `COMPARE • ${mixA.name} ↔ ${mixB.name}` : `${activeMix.name} • 1.000 m³ SPECIMEN`}</span>
            <div>
              <button onClick={() => setOverlayMode('project')}>Projects</button>
              <button onClick={() => setWorkspaceMode(workspaceMode === 'compare' ? 'single' : 'compare')}>{workspaceMode === 'compare' ? 'Single' : 'Compare'}</button>
              <button onClick={() => setEditorMode(editorMode === 'mix' ? null : 'mix')}>Mix Input</button>
              <button onClick={() => setView((current) => ({ ...current, sectionEnabled: !current.sectionEnabled }))}>{view.sectionEnabled ? 'Section Off' : 'Section'}</button>
              <button onClick={() => setView((current) => ({ ...current, ghostMode: !current.ghostMode }))}>{view.ghostMode ? 'Solid' : 'Ghost'}</button>
              <button className="ai-toolbar" onClick={() => setOverlayMode('ai')}>AI Review</button>
            </div>
          </div>

          {workspaceMode === 'compare'
            ? <CompareMode mixA={mixA} mixB={mixB} analysisA={analysisA} analysisB={analysisB} packingA={packingA} packingB={packingB} compactionA={compactionA} compactionB={compactionB} view={view} metrics={comparison} />
            : <ConcreteCube analysis={analysis} packing={packing} compaction={compaction} view={view} />}

          {editorMode === 'mix' && <MixDesignEditor mix={activeMix} onChange={updateActiveMix} />}
          {editorMode === 'gradation' && <GradationEditor mix={activeMix} onChange={updateActiveMix} onClose={() => setEditorMode(null)} />}
          {overlayMode === 'project' && <ProjectManager project={project} projects={projectIndex} activeMixId={activeMix.id} compareSelection={project.compareSelection} onClose={() => setOverlayMode(null)} onNewProject={newProject} onOpenProject={openProject} onSaveProject={persist} onDeleteProject={(id) => { deleteProject(id); setProjectIndex(listProjects()); }} onSelectMix={(id) => setActiveMixId(id)} onAddMix={addProjectMix} onRemoveMix={removeProjectMix} onRenameMix={renameMix} onCompareSelection={setCompareSelection} onExport={() => exportProjectJson(project)} />}
          {overlayMode === 'ai' && <AIReviewPanel project={project} mix={activeMix} analysis={analysis} packing={packing} diagnostics={diagnostics} onClose={() => setOverlayMode(null)} />}
        </section>

        <aside className="panel right-panel">
          <div className="panel-title">ENGINEERING INSPECTOR</div>
          {workspaceMode === 'compare' ? <>
            <div className="status-card"><span>Selected comparison</span><strong className="ok">2 MIXES</strong></div>
            <div className="diagnostic-score-compare"><div><span>{mixA.name}</span><b>{diagnosticsA.score}</b><small>{diagnosticsA.critical} critical / {diagnosticsA.warnings} warning</small></div><div><span>{mixB.name}</span><b>{diagnosticsB.score}</b><small>{diagnosticsB.critical} critical / {diagnosticsB.warnings} warning</small></div></div>
            <DiagnosticsPanel title={mixA.name} summary={diagnosticsA} compact /><DiagnosticsPanel title={mixB.name} summary={diagnosticsB} compact />
            <div className="panel-title secondary">KEY DIFFERENCES</div>
            <div className="volume-list">{comparison.map((item) => <div className="volume-row" key={item.key}><span>{item.label}</span><b>{item.delta >= 0 ? '+' : ''}{item.delta.toFixed(item.unit === '%' ? 1 : 3)} {item.unit}</b></div>)}</div>
          </> : <>
            <div className="status-card"><span>Compaction state</span><strong className={compaction.stage === 'compacted' ? 'ok' : 'warn'}>{stateLabel}</strong></div>
            <div className="status-card gradation-status"><span>Input integrity</span><strong className={gradationsValid && volumeOk ? 'ok' : 'warn'}>{gradationsValid && volumeOk ? 'READY' : 'REVIEW'}</strong></div>
            <div className="compaction-progress"><i style={{ width: `${compaction.progress * 100}%` }} /></div>
            <div className="metric-grid">{metrics.map(([name, value]) => <div className="metric" key={name}><span>{name}</span><b>{value}</b></div>)}</div>
            <div className="panel-title secondary">ENGINEERING DIAGNOSTICS</div><DiagnosticsPanel title={activeMix.name} summary={diagnostics} />
          </>}

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
          <div className="action-row"><button onClick={() => { setCompacting(false); setCompactionProgress(0); }}>RESET</button><button onClick={() => { setPackingSeed((seed) => seed + 1); setCompactionProgress(0); }}>NEW PACKING</button></div>
        </aside>
      </section>

      <footer className="statusbar"><span>{PRODUCT_IDENTITY.productName} • {PRODUCT_IDENTITY.designer} • {PRODUCT_IDENTITY.phone} • {PRODUCT_IDENTITY.email}</span><span>AUTO-SAVED PROJECT LIBRARY • AI REVIEW READY</span></footer>
    </main>
  );
}
