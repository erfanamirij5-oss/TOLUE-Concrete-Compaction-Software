import type { ConcreteProject, ProjectIndexEntry } from '../domain/project';
import { cloneMix } from '../domain/project';
import { defaultMix } from '../domain/mixDesign';

const INDEX_KEY = 'tcc.project.index.v1';
const PROJECT_PREFIX = 'tcc.project.v1.';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function makeId() { return `prj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export function nextProjectNumber(index: ProjectIndexEntry[]) {
  const year = new Date().getFullYear();
  const prefix = `TCC-${year}-`;
  const max = index.map((item) => item.projectNumber).filter((value) => value.startsWith(prefix)).map((value) => Number(value.slice(prefix.length))).filter(Number.isFinite).reduce((acc, value) => Math.max(acc, value), 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

export function listProjects(): ProjectIndexEntry[] {
  return safeParse<ProjectIndexEntry[]>(localStorage.getItem(INDEX_KEY), []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createProject(name = 'New Concrete Project'): ConcreteProject {
  const index = listProjects(); const now = new Date().toISOString(); const id = makeId();
  const mixA = cloneMix(defaultMix, `${id}-mix-001`, 'Mix 001'); const mixB = cloneMix(defaultMix, `${id}-mix-002`, 'Mix 002');
  const project: ConcreteProject = { metadata: { id, projectNumber: nextProjectNumber(index), name, client: '', location: '', description: '', createdAt: now, updatedAt: now }, mixes: [mixA, mixB], compareSelection: [mixA.id, mixB.id] };
  saveProject(project); return project;
}

export function saveProject(project: ConcreteProject): ConcreteProject {
  const updated: ConcreteProject = { ...project, metadata: { ...project.metadata, updatedAt: new Date().toISOString() } };
  localStorage.setItem(PROJECT_PREFIX + updated.metadata.id, JSON.stringify(updated));
  const index = listProjects().filter((item) => item.id !== updated.metadata.id);
  index.unshift({ id: updated.metadata.id, projectNumber: updated.metadata.projectNumber, name: updated.metadata.name, updatedAt: updated.metadata.updatedAt, mixCount: updated.mixes.length });
  localStorage.setItem(INDEX_KEY, JSON.stringify(index)); return updated;
}

export function loadProject(id: string): ConcreteProject | null { return safeParse<ConcreteProject | null>(localStorage.getItem(PROJECT_PREFIX + id), null); }
export function deleteProject(id: string) { localStorage.removeItem(PROJECT_PREFIX + id); localStorage.setItem(INDEX_KEY, JSON.stringify(listProjects().filter((item) => item.id !== id))); }

export function addMix(project: ConcreteProject, sourceId?: string): ConcreteProject {
  const source = project.mixes.find((item) => item.id === sourceId) ?? project.mixes[0] ?? defaultMix; const sequence = project.mixes.length + 1;
  const id = `${project.metadata.id}-mix-${String(sequence).padStart(3, '0')}-${Date.now()}`; const next = cloneMix(source, id, `Mix ${String(sequence).padStart(3, '0')}`);
  return saveProject({ ...project, mixes: [...project.mixes, next] });
}

export function removeMix(project: ConcreteProject, mixId: string): ConcreteProject {
  if (project.mixes.length <= 1) return project; const mixes = project.mixes.filter((item) => item.id !== mixId);
  const compareSelection: [string | null, string | null] = [project.compareSelection[0] === mixId ? mixes[0]?.id ?? null : project.compareSelection[0], project.compareSelection[1] === mixId ? mixes[1]?.id ?? mixes[0]?.id ?? null : project.compareSelection[1]];
  return saveProject({ ...project, mixes, compareSelection });
}

export function exportProjectJson(project: ConcreteProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `${project.metadata.projectNumber}-${project.metadata.name.replace(/[^a-zA-Z0-9-_]+/g, '-')}.tcc.json`; anchor.click(); URL.revokeObjectURL(url);
}

export async function importProjectFile(file: File): Promise<ConcreteProject> {
  const raw = await file.text(); const parsed = JSON.parse(raw) as ConcreteProject;
  if (!parsed?.metadata?.id || !parsed?.metadata?.projectNumber || !Array.isArray(parsed?.mixes) || parsed.mixes.length < 1) throw new Error('Invalid TOLUE Concrete Compaction project file.');
  const now = new Date().toISOString(); const imported: ConcreteProject = { ...parsed, metadata: { ...parsed.metadata, updatedAt: now }, compareSelection: parsed.compareSelection ?? [parsed.mixes[0]?.id ?? null, parsed.mixes[1]?.id ?? parsed.mixes[0]?.id ?? null] };
  return saveProject(imported);
}
