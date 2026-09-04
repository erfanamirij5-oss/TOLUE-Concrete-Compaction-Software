export type SectionAxis = 'x' | 'y' | 'z';

export interface PhaseVisibility {
  sand: boolean;
  aggregate5to12: boolean;
  aggregate12to25: boolean;
  cement: boolean;
  water: boolean;
  silicaFume: boolean;
  admixture: boolean;
  air: boolean;
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
    cement: true,
    water: true,
    silicaFume: true,
    admixture: true,
    air: true,
    paste: true,
  },
};
