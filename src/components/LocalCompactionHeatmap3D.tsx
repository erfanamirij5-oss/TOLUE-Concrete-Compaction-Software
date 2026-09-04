import { useMemo } from 'react';
import type { MixAnalysis } from '../domain/mixDesign';
import { defaultRebarNetwork, type RebarNetworkInput } from '../domain/rebarAnalysis';
import type { CompactionState } from '../engineering/compaction';
import type { PackingResult } from '../engineering/packing';
import { evaluateLocalCompactionHeatmap } from '../engineering/localCompactionHeatmap';
import { RebarNetwork3D } from './RebarNetwork3D';

interface Props {
  analysis: MixAnalysis;
  packing: PackingResult;
  compaction: CompactionState;
  visible?: boolean;
  rebarNetwork?: RebarNetworkInput;
  rebarVisible?: boolean;
  rebarGhost?: boolean;
}

export function LocalCompactionHeatmap3D({
  analysis,
  packing,
  compaction,
  visible = true,
  rebarNetwork = defaultRebarNetwork,
  rebarVisible = true,
  rebarGhost = false,
}: Props) {
  const heatmap = useMemo(
    () => evaluateLocalCompactionHeatmap(analysis, packing, compaction, 5, rebarNetwork),
    [analysis, packing, compaction, rebarNetwork],
  );
  const cellSize = 1 / heatmap.divisions;
  return <group>
    <RebarNetwork3D network={rebarNetwork} visible={rebarVisible} ghost={rebarGhost} />
    {visible && heatmap.cells.filter((cell) => cell.level !== 'low').map((cell) => {
      const high = cell.level === 'high';
      const rebarDriven = cell.rebarCongestionRisk >= Math.max(cell.localVoidRisk, 35);
      return <mesh key={cell.key} position={cell.position}>
        <boxGeometry args={[cellSize * 0.94, cellSize * 0.94, cellSize * 0.94]} />
        <meshBasicMaterial
          color={high ? '#ff3047' : rebarDriven ? '#ff6b2c' : '#f28b2d'}
          transparent
          opacity={high ? 0.18 : rebarDriven ? 0.11 : 0.075}
          depthWrite={false}
          wireframe={!high}
        />
      </mesh>;
    })}
  </group>;
}
