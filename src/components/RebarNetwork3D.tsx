import { useMemo } from 'react';
import type { RebarNetworkInput } from '../domain/rebarAnalysis';

interface Props {
  network: RebarNetworkInput;
  visible?: boolean;
  ghost?: boolean;
}

function positions(spacingMm: number, coverMm: number) {
  const spacing = Math.max(0.03, spacingMm / 1000);
  const cover = Math.max(0.015, Math.min(0.45, coverMm / 1000));
  const min = -0.5 + cover;
  const max = 0.5 - cover;
  const values: number[] = [];
  for (let value = min; value <= max + 1e-6; value += spacing) values.push(value);
  return values.slice(0, 28);
}

function layerPositions(network: RebarNetworkInput) {
  if (network.layers <= 1) return [0];
  const gap = Math.max(0.025, network.clearLayerSpacingMm / 1000);
  const total = gap * (network.layers - 1);
  return Array.from({ length: Math.min(6, network.layers) }, (_, index) => -total / 2 + index * gap);
}

export function RebarNetwork3D({ network, visible = true, ghost = false }: Props) {
  const xPositions = useMemo(() => positions(network.x.centerSpacingMm, network.coverMm), [network.x.centerSpacingMm, network.coverMm]);
  const yPositions = useMemo(() => positions(network.y.centerSpacingMm, network.coverMm), [network.y.centerSpacingMm, network.coverMm]);
  const layers = useMemo(() => layerPositions(network), [network]);
  if (!visible) return null;

  const xRadius = Math.max(0.003, network.x.barDiameterMm / 2000);
  const yRadius = Math.max(0.003, network.y.barDiameterMm / 2000);
  const opacity = ghost ? 0.24 : 0.82;
  const length = Math.max(0.12, 1 - Math.min(0.9, network.coverMm * 2 / 1000));

  return <group>
    {layers.map((layerZ, layerIndex) => <group key={`layer-${layerIndex}`} position={[0, 0, Math.max(-0.46, Math.min(0.46, layerZ))]}>
      {xPositions.map((y, index) => <mesh key={`x-${layerIndex}-${index}`} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[xRadius, xRadius, length, 12]} />
        <meshStandardMaterial color="#34495e" metalness={0.7} roughness={0.42} transparent opacity={opacity} />
      </mesh>)}
      {yPositions.map((x, index) => <mesh key={`y-${layerIndex}-${index}`} position={[x, 0, yRadius * 1.35]}>
        <cylinderGeometry args={[yRadius, yRadius, length, 12]} />
        <meshStandardMaterial color="#526b82" metalness={0.72} roughness={0.4} transparent opacity={opacity} />
      </mesh>)}
    </group>)}
  </group>;
}
