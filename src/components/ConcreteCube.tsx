import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { MixAnalysis } from '../domain/mixDesign';
import type { PackingResult } from '../engineering/packing';

interface Props {
  analysis: MixAnalysis;
  packing: PackingResult;
}

function Particles({ packing }: { packing: PackingResult }) {
  return (
    <>
      {packing.particles.map((particle) => (
        <mesh key={particle.key} position={particle.position} rotation={particle.rotation} scale={particle.scale}>
          <icosahedronGeometry args={[particle.radius, 1]} />
          <meshStandardMaterial color={particle.color} roughness={0.84} />
        </mesh>
      ))}
    </>
  );
}

function PastePhase({ analysis }: { analysis: MixAnalysis }) {
  const pasteFraction = Math.min(0.92, Math.max(0.08, analysis.pasteVolumeM3));
  const scale = Math.cbrt(pasteFraction);
  return (
    <mesh scale={[scale, scale, scale]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial color="#68757f" transparent opacity={0.13} roughness={0.34} depthWrite={false} />
    </mesh>
  );
}

function Scene({ analysis, packing }: Props) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[1.45, 1.05, 1.55]} fov={42} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 4, 2]} intensity={2.4} />
      <PastePhase analysis={analysis} />
      <Particles packing={packing} />
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

export function ConcreteCube({ analysis, packing }: Props) {
  return (
    <div className="viewport-canvas">
      <Canvas gl={{ antialias: true, alpha: true }}>
        <Scene analysis={analysis} packing={packing} />
      </Canvas>
      <div className="axis-label">1.000 m³ • stochastic RSA packing v1 • {packing.particles.length} particles</div>
    </div>
  );
}
