import { useMemo, useState } from 'react';
import type { ConcreteProject, ProjectIndexEntry } from '../domain/project';
import type { MixDesign } from '../domain/mixDesign';

interface Props {
  project: ConcreteProject;
  projects: ProjectIndexEntry[];
  activeMixId: string;
  compareSelection: [string | null, string | null];
  onClose: () => void;
  onNewProject: (name: string) => void;
  onOpenProject: (id: string) => void;
  onSaveProject: (project: ConcreteProject) => void;
  onDeleteProject: (id: string) => void;
  onSelectMix: (id: string) => void;
  onAddMix: (sourceId?: string) => void;
  onRemoveMix: (id: string) => void;
  onRenameMix: (id: string, name: string) => void;
  onCompareSelection: (slot: 0 | 1, mixId: string) => void;
  onExport: () => void;
}

export function ProjectManager(props: Props) {
  const [draft, setDraft] = useState(props.project.metadata);
  const [newProjectName, setNewProjectName] = useState('New Concrete Project');
  const mixes = useMemo(() => props.project.mixes, [props.project.mixes]);

  const saveMetadata = () => props.onSaveProject({ ...props.project, metadata: { ...draft, updatedAt: new Date().toISOString() } });

  return (
    <div className="editor-overlay project-manager">
      <div className="editor-header">
        <div><b>PROJECT MANAGER</b><span>Save, reopen, number and compare concrete mix designs</span></div>
        <button onClick={props.onClose}>×</button>
      </div>

      <div className="project-grid">
        <section className="project-section">
          <h3>Current project</h3>
          <div className="project-form">
            <label><span>Project number</span><input value={draft.projectNumber} onChange={(e) => setDraft({ ...draft, projectNumber: e.target.value })} /></label>
            <label><span>Project name</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <label><span>Client</span><input value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} /></label>
            <label><span>Location</span><input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></label>
            <label className="project-wide"><span>Description</span><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
          </div>
          <div className="project-actions"><button className="primary-action" onClick={saveMetadata}>SAVE PROJECT</button><button onClick={props.onExport}>EXPORT JSON</button></div>
        </section>

        <section className="project-section">
          <h3>Mix design library</h3>
          <div className="mix-library">
            {mixes.map((mix: MixDesign, index) => (
              <div className={`mix-library-row ${props.activeMixId === mix.id ? 'active' : ''}`} key={mix.id}>
                <button className="mix-index" onClick={() => props.onSelectMix(mix.id)}>{String(index + 1).padStart(3, '0')}</button>
                <input value={mix.name} onChange={(e) => props.onRenameMix(mix.id, e.target.value)} />
                <button onClick={() => props.onCompareSelection(0, mix.id)} className={props.compareSelection[0] === mix.id ? 'selected' : ''}>A</button>
                <button onClick={() => props.onCompareSelection(1, mix.id)} className={props.compareSelection[1] === mix.id ? 'selected' : ''}>B</button>
                <button onClick={() => props.onRemoveMix(mix.id)}>×</button>
              </div>
            ))}
          </div>
          <div className="project-actions"><button onClick={() => props.onAddMix(props.activeMixId)}>DUPLICATE SELECTED MIX</button><button onClick={() => props.onAddMix()}>NEW MIX</button></div>
        </section>

        <section className="project-section project-wide-section">
          <h3>Saved projects</h3>
          <div className="new-project-row"><input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} /><button onClick={() => props.onNewProject(newProjectName)}>CREATE NEW PROJECT</button></div>
          <div className="saved-projects">
            {props.projects.length === 0 ? <div className="diagnostic-empty">No saved projects yet.</div> : props.projects.map((item) => (
              <div className="saved-project-row" key={item.id}>
                <div><b>{item.projectNumber}</b><span>{item.name}</span><small>{item.mixCount} mix designs</small></div>
                <button onClick={() => props.onOpenProject(item.id)}>OPEN</button>
                <button onClick={() => props.onDeleteProject(item.id)}>DELETE</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
