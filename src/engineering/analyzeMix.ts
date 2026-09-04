import type { MixAnalysis, MixDesign } from '../domain/mixDesign';

export function analyzeMix(mix: MixDesign): MixAnalysis {
  const materials = mix.materials.map((material) => {
    const absoluteVolumeM3 = material.densityKgPerM3 > 0
      ? material.massKgPerM3 / material.densityKgPerM3
      : 0;
    return { ...material, absoluteVolumeM3, volumePercent: absoluteVolumeM3 * 100 };
  });

  const totalSolidAndLiquidVolumeM3 = materials.reduce((sum, item) => sum + item.absoluteVolumeM3, 0);
  const designedAirVolumeM3 = Math.max(0, mix.targetAirPercent / 100);
  const calculatedVoidM3 = Math.max(0, 1 - totalSolidAndLiquidVolumeM3 - designedAirVolumeM3);
  const totalVolumeM3 = totalSolidAndLiquidVolumeM3 + designedAirVolumeM3;

  const cementitiousMass = materials
    .filter((item) => item.key === 'cement' || item.key === 'silicaFume')
    .reduce((sum, item) => sum + item.massKgPerM3, 0);
  const waterMass = materials.find((item) => item.key === 'water')?.massKgPerM3 ?? 0;
  const wCm = cementitiousMass > 0 ? waterMass / cementitiousMass : 0;

  const pasteVolumeM3 = materials
    .filter((item) => ['binder', 'water', 'admixture'].includes(item.phase))
    .reduce((sum, item) => sum + item.absoluteVolumeM3, 0);
  const fineVolumeM3 = materials
    .filter((item) => item.phase === 'fine')
    .reduce((sum, item) => sum + item.absoluteVolumeM3, 0);
  const aggregateVolumeM3 = materials
    .filter((item) => ['fine', 'intermediate', 'coarse'].includes(item.phase))
    .reduce((sum, item) => sum + item.absoluteVolumeM3, 0);

  return {
    materials,
    totalSolidAndLiquidVolumeM3,
    designedAirVolumeM3,
    calculatedVoidM3,
    totalVolumeM3,
    wCm,
    pasteVolumeM3,
    mortarVolumeM3: pasteVolumeM3 + fineVolumeM3,
    aggregateVolumeM3,
    volumeClosureErrorPercent: (1 - totalVolumeM3) * 100,
  };
}
