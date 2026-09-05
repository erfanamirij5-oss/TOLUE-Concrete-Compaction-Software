import type { ACIExposureClass } from './aci318_25';
import type { ASTMCoarseSizeNo } from './astmC33_24a';

export interface StandardsSettings {
  aci: {
    classes: ACIExposureClass[];
    fcMpa?: number;
    nominalMaxAggregateMm?: number;
    measuredAirPercent?: number;
    chloridePercentByCementitious?: number;
    prestressed: boolean;
  };
  astm: {
    coarseSizeNo: ASTMCoarseSizeNo;
  };
}

export const DEFAULT_STANDARDS_SETTINGS: StandardsSettings = {
  aci: {
    classes: ['F0','S0','W0','C0'],
    nominalMaxAggregateMm: 25,
    prestressed: false,
  },
  astm: {
    coarseSizeNo: '57',
  },
};

const KEY='tolue-concrete-compaction-standards-v1';

export function loadStandardsSettings(): StandardsSettings {
  if(typeof window==='undefined') return DEFAULT_STANDARDS_SETTINGS;
  try {
    const raw=window.localStorage.getItem(KEY);
    if(!raw) return DEFAULT_STANDARDS_SETTINGS;
    const parsed=JSON.parse(raw) as Partial<StandardsSettings>;
    return {
      aci: {...DEFAULT_STANDARDS_SETTINGS.aci,...parsed.aci},
      astm: {...DEFAULT_STANDARDS_SETTINGS.astm,...parsed.astm},
    };
  } catch {
    return DEFAULT_STANDARDS_SETTINGS;
  }
}

export function saveStandardsSettings(settings: StandardsSettings) {
  if(typeof window==='undefined') return;
  window.localStorage.setItem(KEY,JSON.stringify(settings));
}
