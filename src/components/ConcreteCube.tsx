import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { MixAnalysis } from '../domain/mixDesign';

interface Props {
  analysis: MixAnalysis;
}

function Particles({ analysis }: Props) {
  const particles = useMemo(() => {
    let seed = 20260905;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const particlePhases = analysis.materials.filter((material) =>
      ['fine', 'intermediate', 'coarse'].includes(material.phase),
    );

    return particlePhases.flatMap((phase, phaseIndex) => {
      const radius = phase.phase === 'coarse' ? 0.052 : phase.phase === 'intermediate' ? 0.034 : 0.017;
      const baseCount = phase.phase === 'coarse' ? 60 : phase.phase === 'intermediate' ? 100 : 180;
      const count = Math.max(1, Math.round(baseCount * Math.min(1.7, phase.absoluteVolumeM3 / 0.22)));

      return Array.from({ length: count }, (_, index) => ({
        key: `${phaseIndex}-${index}`,
        position: [random() - 0.5, random() - 0.5, random() - 0.5] as [number, number, number],
        scale: 0.62 + random() * 0.75,
        radius,
        color: phase.color,
      }));
    });
  }, [analysis]);

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

function PastePhase({ analysis }: Props) {
  const pasteFraction = Math.min(0.92, Math.max(0.08, analysis.pasteVolumeM3));
  const scale = Math.cbrt(pasteFraction);
  return (
    <mesh scale={[scale, scale, scale]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial color="#68757f" transparent opacity={0.13} roughness={0.34} depthWrite={false} />
    </mesh>
  );
}

function Scene({ analysis }: Props) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[1.45, 1.05, 1.55]} fov={42} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 4, 2]} intensity={2.4} />
      <PastePhase analysis={analysis} />
      <Particles analysis={analysis} />
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

export function ConcreteCube({ analysis }: Props) {
  return (
    <div className="viewport-canvas">
      <Canvas gl={{ antialias: true, alpha: true }}>
        <Scene analysis={analysis} />
      </Canvas>
      <div className="axis-label">1.000 m³ • volume-driven visualization</div>
    </div>
  );
}
