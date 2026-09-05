import { useMemo } from 'react';
import type { MixAnalysis } from '../domain/mixDesign';
import { defaultRebarNetwork, type RebarNetworkInput } from '../domain/rebarAnalysis';
import type { CompactionState } from '../engineering/compaction';
import type { PackingResult } from '../engineering/packing';
import { evaluateLocalCompactionHeatmap } from '../engineering/localCompactionHeatmap';
import { RebarNetwork3D } from './RebarNetwork3D';
interface Props{analysis:MixAnalysis;packing:PackingResult;compaction:CompactionState;visible?:boolean;rebarNetwork?:RebarNetworkInput;rebarVisible?:boolean;rebarGhost?:boolean;}
export function LocalCompactionHeatmap3D({analysis,packing,compaction,visible=true,rebarNetwork=defaultRebarNetwork,rebarVisible=true,rebarGhost=false}:Props){
 const heatmap=useMemo(()=>evaluateLocalCompactionHeatmap(analysis,packing,compaction,6,rebarNetwork),[analysis,packing,compaction,rebarNetwork]);const cellSize=1/heatmap.divisions;const dmax=useMemo(()=>Math.max(1,...packing.particles.map(p=>p.diameterMm||0)),[packing]);
 return <group><RebarNetwork3D network={rebarNetwork} visible={rebarVisible} ghost={rebarGhost} dmaxMm={dmax} showBottlenecks={visible}/>{visible&&heatmap.cells.filter(c=>c.level!=='low'||c.rebarCongestionRisk>=28).map(cell=>{const high=cell.level==='high'||cell.rebarCongestionRisk>=70,attention=cell.level==='attention'||cell.rebarCongestionRisk>=42,rebarDriven=cell.rebarCongestionRisk>=Math.max(cell.localVoidRisk,28),color=high?'#ff1744':rebarDriven?'#ff7a00':attention?'#ffe600':'#39ff88',opacity=high?.24:rebarDriven?.17:attention?.12:.07;return <mesh key={cell.key} position={cell.position}><boxGeometry args={[cellSize*.90,cellSize*.90,cellSize*.90]}/><meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} wireframe={!high}/></mesh>})}</group>;
}
