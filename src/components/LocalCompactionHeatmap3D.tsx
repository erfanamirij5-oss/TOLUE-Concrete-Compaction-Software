import { useMemo } from 'react';
import type { MixAnalysis } from '../domain/mixDesign';
import type { CompactionState } from '../engineering/compaction';
import type { PackingResult } from '../engineering/packing';
import { evaluateLocalCompactionHeatmap } from '../engineering/localCompactionHeatmap';

interface Props {
  analysis: MixAnalysis;
  packing: PackingResult;
  compaction: CompactionState;
  visible?: boolean;
}

export function LocalCompactionHeatmap3D({ analysis, packing, compaction, visible = true }: Props) {
  const heatmap = useMemo(() => evaluateLocalCompactionHeatmap(analysis, packing, compaction, 5), [analysis, packing, compaction]);
  if (!visible) return null;
  const cellSize = 1 / heatmap.divisions;
  return <group>
    {heatmap.cells.filter((cell) => cell.level !== 'low').map((cell) => {
      const high = cell.level === 'high';
      return <mesh key={cell.key} position={cell.position}>
        <boxGeometry args={[cellSize * 0.94, cellSize * 0.94, cellSize * 0.94]} />
        <meshBasicMaterial color={high ? '#ff3047' : '#f28b2d'} transparent opacity={high ? 0.16 : 0.075} depthWrite={false} wireframe={!high} />
      </mesh>;
    })}
  </group>;
}
