import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { MixAnalysis } from '../domain/mixDesign';
import type { PackingResult } from '../engineering/packing';
import type { CompactionState } from '../engineering/compaction';

interface Props {
  analysis: MixAnalysis;
  packing: PackingResult;
  compaction: CompactionState;
}

function AnimatedParticle({ particle, compaction, index }: { particle: PackingResult['particles'][number]; compaction: CompactionState; index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const wave = Math.sin(clock.elapsedTime * 34 + index * 0.73);
    const lateral = compaction.lateralVibration * wave;
    const settledY = -0.5 + (particle.position[1] + 0.5) * compaction.settlementFactor;
    ref.current.position.set(particle.position[0] + lateral, settledY, particle.position[2] - lateral * 0.55);
  });

  return (
    <mesh ref={ref} rotation={particle.rotation} scale={particle.scale}>
      <icosahedronGeometry args={[particle.radius, 1]} />
      <meshStandardMaterial color={particle.color} roughness={0.84} />
    </mesh>
  );
}

function Particles({ packing, compaction }: { packing: PackingResult; compaction: CompactionState }) {
  return (
    <>
      {packing.particles.map((particle, index) => (
        <AnimatedParticle key={particle.key} particle={particle} compaction={compaction} index={index} />
      ))}
    </>
  );
}

function PastePhase({ analysis, compaction }: { analysis: MixAnalysis; compaction: CompactionState }) {
  const pasteFraction = Math.min(0.92, Math.max(0.08, analysis.pasteVolumeM3));
  const baseScale = Math.cbrt(pasteFraction);
  const verticalScale = baseScale * (0.97 + compaction.progress * 0.03);
  return (
    <mesh scale={[baseScale, verticalScale, baseScale]} position={[0, -0.5 + verticalScale / 2, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial color="#68757f" transparent opacity={0.13} roughness={0.34} depthWrite={false} />
    </mesh>
  );
}

function Scene({ analysis, packing, compaction }: Props) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[1.45, 1.05, 1.55]} fov={42} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 4, 2]} intensity={2.4} />
      <PastePhase analysis={analysis} compaction={compaction} />
      <Particles packing={packing} compaction={compaction} />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial transparent opacity={0.08} roughness={0.08} metalness={0.05} transmission={0.45} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial color="#8fa0ad" transparent opacity={0.65} />
      </lineSegments>
      <gridHelper args={[3, 30, '#313a42', '#1b2229']} position={[0, -0.505, 0]} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.07} minDistance={1.1} maxDistance={5} />
    </>
  );
}

export function ConcreteCube({ analysis, packing, compaction }: Props) {
  return (
    <div className="viewport-canvas">
      <Canvas gl={{ antialias: true, alpha: true }}>
        <Scene analysis={analysis} packing={packing} compaction={compaction} />
      </Canvas>
      <div className="axis-label">1.000 m³ • {compaction.stage.toUpperCase()} • {(compaction.progress * 100).toFixed(0)}% compaction</div>
    </div>
  );
}
