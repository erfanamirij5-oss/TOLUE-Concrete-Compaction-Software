export interface RebarDirectionInput {
  barDiameterMm: number;
  centerSpacingMm: number;
}

export interface RebarNetworkInput {
  memberType: 'slab' | 'wall' | 'beam' | 'column' | 'joint' | 'other';
  x: RebarDirectionInput;
  y: RebarDirectionInput;
  layers: number;
  clearLayerSpacingMm: number;
  coverMm: number;
  memberThicknessMm: number;
  vibratorHeadDiameterMm: number;
  /** Render reinforcement through the full concrete volume, not only the perimeter cage. */
  internalGrid?: boolean;
  /** Approximate centre spacing of interior vertical connectors / bars. */
  interiorVerticalSpacingMm?: number;
  /** Keep secondary ties visible between horizontal reinforcement layers. */
  internalTies?: boolean;
}

export type ReinforcedPlacementLevel = 'good' | 'attention' | 'critical';

export interface RebarAnalysisResult {
  clearOpeningXmm: number;
  clearOpeningYmm: number;
  governingClearOpeningMm: number;
  estimatedAggregateDmaxMm: number;
  openingToAggregateRatio: number;
  aggregatePassingIndex: number;
  congestionIndex: number;
  vibratorAccessibilityIndex: number;
  reinforcedPlacementScore: number;
  level: ReinforcedPlacementLevel;
  labelFa: string;
  notesFa: string[];
  method: 'tcc-rebar-heuristic-v1';
}

export const defaultRebarNetwork: RebarNetworkInput = {
  memberType: 'wall',
  x: { barDiameterMm: 16, centerSpacingMm: 150 },
  y: { barDiameterMm: 16, centerSpacingMm: 150 },
  layers: 2,
  clearLayerSpacingMm: 120,
  coverMm: 40,
  memberThicknessMm: 250,
  vibratorHeadDiameterMm: 38,
  internalGrid: true,
  interiorVerticalSpacingMm: 300,
  internalTies: true,
};
