import { useMemo } from 'react';
import type { RebarNetworkInput } from '../domain/rebarAnalysis';

interface Props {
  network: RebarNetworkInput;
  visible?: boolean;
  ghost?: boolean;
}

function positions(spacingMm: number, coverMm: number) {
  const spacing = Math.max(0.03, spacingMm / 1000);
  const cover = Math.max(0.015, Math.min(0.20, coverMm / 1000));
  const min = -0.5 + cover;
  const max = 0.5 - cover;
  const values: number[] = [];
  for (let value = min; value <= max + 1e-6; value += spacing) values.push(value);
  if (values.length === 0) return [0];
  if (values[values.length - 1] < max - spacing * 0.35) values.push(max);
  return values.slice(0, 32);
}

function matElevations(network: RebarNetworkInput) {
  const cover = Math.max(0.015, Math.min(0.20, network.coverMm / 1000));
  const bottom = -0.5 + cover;
  const top = 0.5 - cover;
  const requested = Math.max(2, Math.min(6, network.layers));
  if (requested === 2) return [bottom, top];
  return Array.from({ length: requested }, (_, index) => bottom + ((top - bottom) * index) / (requested - 1));
}

export function RebarNetwork3D({ network, visible = true, ghost = false }: Props) {
  const xBarZ = useMemo(() => positions(network.x.centerSpacingMm, network.coverMm), [network.x.centerSpacingMm, network.coverMm]);
  const yBarX = useMemo(() => positions(network.y.centerSpacingMm, network.coverMm), [network.y.centerSpacingMm, network.coverMm]);
  const mats = useMemo(() => matElevations(network), [network]);
  if (!visible) return null;

  const xRadius = Math.max(0.003, network.x.barDiameterMm / 2000);
  const yRadius = Math.max(0.003, network.y.barDiameterMm / 2000);
  const opacity = ghost ? 0.22 : 0.88;
  const cover = Math.max(0.015, Math.min(0.20, network.coverMm / 1000));
  const clearLength = Math.max(0.15, 1 - cover * 2);
  const clearHeight = Math.max(0.15, 1 - cover * 2);
  const edgeX = [-0.5 + cover, 0.5 - cover];
  const edgeZ = [-0.5 + cover, 0.5 - cover];

  return <group>
    {mats.map((y, matIndex) => <group key={`foundation-mat-${matIndex}`} position={[0, y, 0]}>
      {xBarZ.map((z, index) => <mesh key={`x-${matIndex}-${index}`} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[xRadius, xRadius, clearLength, 12]} />
        <meshStandardMaterial color="#34495e" metalness={0.72} roughness={0.38} transparent opacity={opacity} />
      </mesh>)}
      {yBarX.map((x, index) => <mesh key={`z-${matIndex}-${index}`} position={[x, yRadius * 1.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[yRadius, yRadius, clearLength, 12]} />
        <meshStandardMaterial color="#526b82" metalness={0.72} roughness={0.38} transparent opacity={opacity} />
      </mesh>)}
    </group>)}

    {edgeX.flatMap((x) => edgeZ.map((z) => <mesh key={`corner-${x}-${z}`} position={[x, 0, z]}>
      <cylinderGeometry args={[Math.max(xRadius, yRadius), Math.max(xRadius, yRadius), clearHeight, 12]} />
      <meshStandardMaterial color="#405b72" metalness={0.74} roughness={0.36} transparent opacity={opacity} />
    </mesh>))}

    {xBarZ.filter((_, i) => i % 2 === 0).flatMap((z) => edgeX.map((x) => <mesh key={`edge-x-${x}-${z}`} position={[x, 0, z]}>
      <cylinderGeometry args={[Math.min(xRadius, yRadius), Math.min(xRadius, yRadius), clearHeight, 10]} />
      <meshStandardMaterial color="#405b72" metalness={0.7} roughness={0.42} transparent opacity={ghost ? 0.14 : 0.5} />
    </mesh>))}
  </group>;
}
