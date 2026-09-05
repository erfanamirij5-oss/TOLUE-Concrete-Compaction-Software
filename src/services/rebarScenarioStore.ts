import { defaultRebarNetwork, type RebarNetworkInput } from '../domain/rebarAnalysis';

const STORAGE_KEY = 'tolue-concrete-compaction:rebar-scenario:v1';

function validDirection(value: unknown): value is RebarNetworkInput['x'] {
  if (!value || typeof value !== 'object') return false;
  const v=value as Record<string, unknown>;
  return Number.isFinite(v.barDiameterMm) && Number(v.barDiameterMm) > 0 && Number.isFinite(v.centerSpacingMm) && Number(v.centerSpacingMm) > 0;
}

function validScenario(value: unknown): value is RebarNetworkInput {
  if (!value || typeof value !== 'object') return false;
  const v=value as Record<string, unknown>;
  return validDirection(v.x) && validDirection(v.y) && Number.isFinite(v.layers) && Number(v.layers) >= 1 && Number.isFinite(v.clearLayerSpacingMm) && Number(v.clearLayerSpacingMm) > 0 && Number.isFinite(v.coverMm) && Number(v.coverMm) >= 0 && Number.isFinite(v.memberThicknessMm) && Number(v.memberThicknessMm) > 0 && Number.isFinite(v.vibratorHeadDiameterMm) && Number(v.vibratorHeadDiameterMm) > 0;
}

function normalizeScenario(value: RebarNetworkInput): RebarNetworkInput {
  return {
    ...value,
    internalGrid: value.internalGrid ?? defaultRebarNetwork.internalGrid,
    interiorVerticalSpacingMm: Number.isFinite(value.interiorVerticalSpacingMm) && Number(value.interiorVerticalSpacingMm) > 0 ? value.interiorVerticalSpacingMm : defaultRebarNetwork.interiorVerticalSpacingMm,
    internalTies: value.internalTies ?? defaultRebarNetwork.internalTies,
  };
}

export function loadRebarScenario(): RebarNetworkInput {
  try {
    const raw=window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultRebarNetwork);
    const parsed=JSON.parse(raw);
    return validScenario(parsed) ? normalizeScenario(parsed) : structuredClone(defaultRebarNetwork);
  } catch {
    return structuredClone(defaultRebarNetwork);
  }
}

export function saveRebarScenario(network: RebarNetworkInput) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeScenario(network))); } catch { /* storage unavailable */ }
}

export function resetRebarScenario() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
  return structuredClone(defaultRebarNetwork);
}
