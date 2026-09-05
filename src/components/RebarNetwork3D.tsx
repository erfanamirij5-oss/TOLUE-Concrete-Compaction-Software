import { useMemo } from 'react';
import type { RebarNetworkInput } from '../domain/rebarAnalysis';

interface Props {
  network: RebarNetworkInput;
  visible?: boolean;
  ghost?: boolean;
}

function positions(spacingMm: number, coverMm: number, limit = 30) {
  const spacing = Math.max(0.04, spacingMm / 1000);
  const cover = Math.max(0.015, Math.min(0.20, coverMm / 1000));
  const min = -0.5 + cover;
  const max = 0.5 - cover;
  const values: number[] = [];
  for (let value = min; value <= max + 1e-6; value += spacing) values.push(value);
  if (values.length === 0) return [0];
  if (values[values.length - 1] < max - spacing * 0.35) values.push(max);
  return values.slice(0, limit);
}

function layerLevels(layerCount: number, coverMm: number) {
  const cover = Math.max(0.015, Math.min(0.20, coverMm / 1000));
  const min = -0.5 + cover;
  const max = 0.5 - cover;
  const count = Math.max(2, Math.min(8, Math.round(layerCount)));
  if (count === 2) return [min, max];
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
}

export function RebarNetwork3D({ network, visible = true, ghost = false }: Props) {
  const xPositions = useMemo(() => positions(network.x.centerSpacingMm, network.coverMm), [network.x.centerSpacingMm, network.coverMm]);
  const zPositions = useMemo(() => positions(network.y.centerSpacingMm, network.coverMm), [network.y.centerSpacingMm, network.coverMm]);
  const yLevels = useMemo(() => layerLevels(network.layers, network.coverMm), [network.layers, network.coverMm]);
  const internalX = useMemo(() => positions(network.interiorVerticalSpacingMm ?? 300, network.coverMm, 12), [network.interiorVerticalSpacingMm, network.coverMm]);
  const internalZ = useMemo(() => positions(network.interiorVerticalSpacingMm ?? 300, network.coverMm, 12), [network.interiorVerticalSpacingMm, network.coverMm]);
  if (!visible) return null;

  const xRadius = Math.max(0.0032, network.x.barDiameterMm / 2000);
  const zRadius = Math.max(0.0032, network.y.barDiameterMm / 2000);
  const mainRadius = Math.max(xRadius, zRadius);
  const tieRadius = Math.max(0.0028, Math.min(xRadius, zRadius) * 0.72);
  const opacity = ghost ? 0.20 : 0.93;
  const cover = Math.max(0.015, Math.min(0.20, network.coverMm / 1000));
  const clear = Math.max(0.15, 1 - cover * 2);
  const min = -0.5 + cover;
  const max = 0.5 - cover;
  const sideXs = [min, max];
  const sideZs = [min, max];
  const showInternal = network.internalGrid !== false;
  const showTies = network.internalTies !== false;

  const steel = (color:string, localOpacity=opacity) => <meshStandardMaterial color={color} metalness={0.82} roughness={0.28} transparent opacity={localOpacity} />;

  return <group>
    {/* Main horizontal mats, distributed through the full concrete height. */}
    {yLevels.map((y, matIndex) => <group key={`mat-${matIndex}`}>
      {zPositions.map((z, index) => <mesh key={`mat-x-${matIndex}-${index}`} position={[0, y, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[xRadius, xRadius, clear, 14]} />{steel(matIndex === 0 || matIndex === yLevels.length - 1 ? '#243c50' : '#31566f')}
      </mesh>)}
      {xPositions.map((x, index) => <mesh key={`mat-z-${matIndex}-${index}`} position={[x, y + zRadius * 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[zRadius, zRadius, clear, 14]} />{steel(matIndex === 0 || matIndex === yLevels.length - 1 ? '#35566d' : '#426d89')}
      </mesh>)}
    </group>)}

    {/* Perimeter vertical bars retain the exterior cage definition. */}
    {xPositions.flatMap((x, index) => sideZs.map((z) => <mesh key={`vertical-x-${index}-${z}`} position={[x, 0, z]}>
      <cylinderGeometry args={[mainRadius, mainRadius, clear, 14]} />{steel('#30495d')}
    </mesh>))}
    {zPositions.slice(1,-1).flatMap((z, index) => sideXs.map((x) => <mesh key={`vertical-z-${index}-${x}`} position={[x, 0, z]}>
      <cylinderGeometry args={[mainRadius, mainRadius, clear, 14]} />{steel('#30495d')}
    </mesh>))}

    {/* Interior reinforcement connectors: real volumetric grid instead of an empty frame. */}
    {showInternal && internalX.flatMap((x, xi) => internalZ.map((z, zi) => <mesh key={`internal-v-${xi}-${zi}`} position={[x, 0, z]}>
      <cylinderGeometry args={[tieRadius, tieRadius, clear, 12]} />{steel('#58778d', ghost ? 0.12 : 0.58)}
    </mesh>))}

    {/* Secondary internal ties link the volume between the principal mats. */}
    {showInternal && showTies && yLevels.slice(1, -1).map((y, levelIndex) => <group key={`internal-tie-level-${levelIndex}`}>
      {internalZ.map((z, index) => <mesh key={`internal-tie-x-${levelIndex}-${index}`} position={[0, y, z]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[tieRadius * 0.9,tieRadius * 0.9,clear,10]} />{steel('#6b879a', ghost ? 0.10 : 0.42)}
      </mesh>)}
      {internalX.map((x, index) => <mesh key={`internal-tie-z-${levelIndex}-${index}`} position={[x, y, 0]} rotation={[Math.PI/2,0,0]}>
        <cylinderGeometry args={[tieRadius * 0.9,tieRadius * 0.9,clear,10]} />{steel('#6b879a', ghost ? 0.10 : 0.42)}
      </mesh>)}
    </group>)}

    {/* Perimeter ties remain visible as a spatial reference without dominating the model. */}
    {showTies && yLevels.map((y, levelIndex) => <group key={`tie-${levelIndex}`}>
      {sideZs.map((z) => <mesh key={`tie-x-${levelIndex}-${z}`} position={[0, y, z]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[tieRadius,tieRadius,clear,12]} />{steel('#5a7489', ghost ? 0.14 : 0.54)}
      </mesh>)}
      {sideXs.map((x) => <mesh key={`tie-z-${levelIndex}-${x}`} position={[x, y, 0]} rotation={[Math.PI/2,0,0]}>
        <cylinderGeometry args={[tieRadius,tieRadius,clear,12]} />{steel('#5a7489', ghost ? 0.14 : 0.54)}
      </mesh>)}
    </group>)}
  </group>;
}
