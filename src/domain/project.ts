import type { MixDesign } from './mixDesign';

export interface ProjectMetadata {
  id: string;
  projectNumber: string;
  name: string;
  client: string;
  location: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConcreteProject {
  metadata: ProjectMetadata;
  mixes: MixDesign[];
  compareSelection: [string | null, string | null];
}

export interface ProjectIndexEntry {
  id: string;
  projectNumber: string;
  name: string;
  updatedAt: string;
  mixCount: number;
}

export const PRODUCT_IDENTITY = {
  productName: 'TOLUE Concrete Compaction',
  designer: 'مهندس عرفان امیری',
  phone: '۰۹۱۳۳۲۴۰۲۰۵',
  email: 'Erfanamiriyazd@gmail.com',
  website: '',
} as const;

export function cloneMix(mix: MixDesign, id: string, name: string): MixDesign {
  return {
    ...mix,
    id,
    name,
    materials: mix.materials.map((item) => ({ ...item })),
    gradations: mix.gradations.map((curve) => ({
      ...curve,
      points: curve.points.map((point) => ({ ...point })),
    })),
  };
}
