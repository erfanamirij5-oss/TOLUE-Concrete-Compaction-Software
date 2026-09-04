export type SectionAxis = 'x' | 'y' | 'z';

export interface PhaseVisibility {
  sand: boolean;
  aggregate5to12: boolean;
  aggregate12to25: boolean;
  paste: boolean;
}

export interface ViewControls {
  sectionEnabled: boolean;
  sectionAxis: SectionAxis;
  sectionPosition: number;
  ghostMode: boolean;
  shellOpacity: number;
  phases: PhaseVisibility;
}

export const defaultViewControls: ViewControls = {
  sectionEnabled: false,
  sectionAxis: 'x',
  sectionPosition: 0,
  ghostMode: false,
  shellOpacity: 0.08,
  phases: {
    sand: true,
    aggregate5to12: true,
    aggregate12to25: true,
    paste: true,
  },
};
