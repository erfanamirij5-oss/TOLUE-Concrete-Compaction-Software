export type MaterialKey =
  | 'cement'
  | 'water'
  | 'silicaFume'
  | 'admixture'
  | 'sand'
  | 'aggregate5to12'
  | 'aggregate12to25';

export interface MaterialInput {
  key: MaterialKey;
  label: string;
  massKgPerM3: number;
  densityKgPerM3: number;
  color: string;
  phase: 'binder' | 'water' | 'fine' | 'intermediate' | 'coarse' | 'admixture';
}

export interface MixDesign {
  id: string;
  name: string;
  targetAirPercent: number;
  materials: MaterialInput[];
}

export interface MaterialVolume extends MaterialInput {
  absoluteVolumeM3: number;
  volumePercent: number;
}

export interface MixAnalysis {
  materials: MaterialVolume[];
  totalSolidAndLiquidVolumeM3: number;
  designedAirVolumeM3: number;
  calculatedVoidM3: number;
  totalVolumeM3: number;
  wCm: number;
  pasteVolumeM3: number;
  mortarVolumeM3: number;
  aggregateVolumeM3: number;
  volumeClosureErrorPercent: number;
}

export const defaultMix: MixDesign = {
  id: 'mix-01',
  name: 'Baseline Mix 01',
  targetAirPercent: 2,
  materials: [
    { key: 'cement', label: 'Cement', massKgPerM3: 360, densityKgPerM3: 3150, color: '#73777c', phase: 'binder' },
    { key: 'water', label: 'Water', massKgPerM3: 165, densityKgPerM3: 1000, color: '#4d8fb5', phase: 'water' },
    { key: 'silicaFume', label: 'Silica fume', massKgPerM3: 25, densityKgPerM3: 2200, color: '#4a4d50', phase: 'binder' },
    { key: 'admixture', label: 'Admixture', massKgPerM3: 4.5, densityKgPerM3: 1080, color: '#b56b3f', phase: 'admixture' },
    { key: 'sand', label: 'Sand 0–4.75 mm', massKgPerM3: 760, densityKgPerM3: 2650, color: '#c5ad7c', phase: 'fine' },
    { key: 'aggregate5to12', label: 'Aggregate 4.75–12 mm', massKgPerM3: 420, densityKgPerM3: 2680, color: '#a18c74', phase: 'intermediate' },
    { key: 'aggregate12to25', label: 'Aggregate 12–25 mm', massKgPerM3: 610, densityKgPerM3: 2700, color: '#7c858c', phase: 'coarse' },
  ],
};
