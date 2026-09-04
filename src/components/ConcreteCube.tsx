import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';

const phases = [
  { count: 55, radius: 0.055, color: '#7c858c' },
  { count: 110, radius: 0.034, color: '#a28f78' },
  { count: 190, radius: 0.018, color: '#c6ad79' },
];

function Particles() {
  const particles = useMemo(() => {
    let seed = 20260905;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    return phases.flatMap((phase, phaseIndex) =>
      Array.from({ length: phase.count }, (_, index) => ({
        key: `${phaseIndex}-${index}`,
        position: [random() - 0.5, random() - 0.5, random() - 0.5] as [number, number, number],
        scale: 0.65 + random() * 0.7,
        ...phase,
      })),
    );
  }, []);

  return (
    <>
      {particles.map((particle) => (
        <mesh key={particle.key} position={particle.position} scale={particle.scale}>
          <icosahedronGeometry args={[particle.radius, 1]} />
          <meshStandardMaterial color={particle.color} roughness={0.82} />
        </mesh>
      ))}
    </>
  );
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[1.45, 1.05, 1.55]} fov={42} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 4, 2]} intensity={2.4} />
      <Particles />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial transparent opacity={0.09} roughness={0.08} metalness={0.05} transmission={0.45} depthWrite={false} />
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

import * as THREE from 'three';

export function ConcreteCube() {
  return (
    <div className="viewport-canvas">
      <Canvas gl={{ antialias: true, alpha: true }}>
        <Scene />
      </Canvas>
      <div className="axis-label">1.000 m³ • Interactive specimen</div>
    </div>
  );
}
