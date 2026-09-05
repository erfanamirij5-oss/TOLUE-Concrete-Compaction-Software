import { useMemo } from 'react';
import type { RebarNetworkInput } from '../domain/rebarAnalysis';

interface Props {
  network: RebarNetworkInput;
  visible?: boolean;
  ghost?: boolean;
}

function positions(spacingMm: number, coverMm: number) {
  const spacing = Math.max(0.04, spacingMm / 1000);
  const cover = Math.max(0.015, Math.min(0.20, coverMm / 1000));
  const min = -0.5 + cover;
  const max = 0.5 - cover;
  const values: number[] = [];
  for (let value = min; value <= max + 1e-6; value += spacing) values.push(value);
  if (values.length === 0) return [0];
  if (values[values.length - 1] < max - spacing * 0.35) values.push(max);
  return values.slice(0, 30);
}

function verticalLevels(spacingMm: number, coverMm: number) {
  const spacing = Math.max(0.08, spacingMm / 1000);
  const cover = Math.max(0.015, Math.min(0.20, coverMm / 1000));
  const min = -0.5 + cover;
  const max = 0.5 - cover;
  const values: number[] = [];
  for (let value = min; value <= max + 1e-6; value += spacing) values.push(value);
  if (values[values.length - 1] < max - spacing * 0.4) values.push(max);
  return values.slice(0, 14);
}

export function RebarNetwork3D({ network, visible = true, ghost = false }: Props) {
  const xPositions = useMemo(() => positions(network.x.centerSpacingMm, network.coverMm), [network.x.centerSpacingMm, network.coverMm]);
  const zPositions = useMemo(() => positions(network.y.centerSpacingMm, network.coverMm), [network.y.centerSpacingMm, network.coverMm]);
  const yLevels = useMemo(() => verticalLevels(Math.min(network.x.centerSpacingMm, network.y.centerSpacingMm), network.coverMm), [network.x.centerSpacingMm, network.y.centerSpacingMm, network.coverMm]);
  if (!visible) return null;

  const xRadius = Math.max(0.0032, network.x.barDiameterMm / 2000);
  const zRadius = Math.max(0.0032, network.y.barDiameterMm / 2000);
  const mainRadius = Math.max(xRadius, zRadius);
  const tieRadius = Math.max(0.0028, Math.min(xRadius, zRadius) * 0.78);
  const opacity = ghost ? 0.22 : 0.92;
  const cover = Math.max(0.015, Math.min(0.20, network.coverMm / 1000));
  const clear = Math.max(0.15, 1 - cover * 2);
  const min = -0.5 + cover;
  const max = 0.5 - cover;
  const sideXs = [min, max];
  const sideZs = [min, max];

  const steel = (color:string, localOpacity=opacity) => <meshStandardMaterial color={color} metalness={0.82} roughness={0.28} transparent opacity={localOpacity} />;

  return <group>
    {/* Bottom and top mats across the complete 1 m specimen. */}
    {[min, max].map((y, matIndex) => <group key={`mat-${matIndex}`}>
      {zPositions.map((z, index) => <mesh key={`mat-x-${matIndex}-${index}`} position={[0, y, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[xRadius, xRadius, clear, 14]} />{steel('#263d50')}
      </mesh>)}
      {xPositions.map((x, index) => <mesh key={`mat-z-${matIndex}-${index}`} position={[x, y + zRadius * 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[zRadius, zRadius, clear, 14]} />{steel('#344f65')}
      </mesh>)}
    </group>)}

    {/* Vertical bars distributed along all four faces, not only at the corners. */}
    {xPositions.flatMap((x, index) => sideZs.map((z) => <mesh key={`vertical-x-${index}-${z}`} position={[x, 0, z]}>
      <cylinderGeometry args={[mainRadius, mainRadius, clear, 14]} />{steel('#30495d')}
    </mesh>))}
    {zPositions.slice(1,-1).flatMap((z, index) => sideXs.map((x) => <mesh key={`vertical-z-${index}-${x}`} position={[x, 0, z]}>
      <cylinderGeometry args={[mainRadius, mainRadius, clear, 14]} />{steel('#30495d')}
    </mesh>))}

    {/* Horizontal perimeter ties from bottom to top so the cage reads as a complete foundation cage. */}
    {yLevels.map((y, levelIndex) => <group key={`tie-${levelIndex}`}>
      {sideZs.map((z) => <mesh key={`tie-x-${levelIndex}-${z}`} position={[0, y, z]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[tieRadius,tieRadius,clear,12]} />{steel('#5a7489', ghost ? 0.16 : 0.68)}
      </mesh>)}
      {sideXs.map((x) => <mesh key={`tie-z-${levelIndex}-${x}`} position={[x, y, 0]} rotation={[Math.PI/2,0,0]}>
        <cylinderGeometry args={[tieRadius,tieRadius,clear,12]} />{steel('#5a7489', ghost ? 0.16 : 0.68)}
      </mesh>)}
    </group>)}
  </group>;
}
