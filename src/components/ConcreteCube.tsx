import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { sampleDiameterMm } from '../engineering/gradation';

interface Props {
  analysis: MixAnalysis;
  mix: MixDesign;
}

function Particles({ analysis, mix }: Props) {
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
      const baseCount = phase.phase === 'coarse' ? 65 : phase.phase === 'intermediate' ? 115 : 240;
      const count = Math.max(1, Math.round(baseCount * Math.min(1.7, phase.absoluteVolumeM3 / 0.22)));
      const curve = mix.gradations.find((item) => item.materialKey === phase.key);

      return Array.from({ length: count }, (_, index) => {
        const sampledDiameterMm = curve ? sampleDiameterMm(curve, random()) : phase.phase === 'coarse' ? 19 : phase.phase === 'intermediate' ? 9 : 1.2;
        const displayRadius = Math.max(0.006, Math.min(0.061, sampledDiameterMm / 360));
        const elongation = 0.72 + random() * 0.55;
        return {
          key: `${phaseIndex}-${index}`,
          position: [random() - 0.5, random() - 0.5, random() - 0.5] as [number, number, number],
          rotation: [random() * Math.PI, random() * Math.PI, random() * Math.PI] as [number, number, number],
          scale: [elongation, 0.72 + random() * 0.5, 0.72 + random() * 0.5] as [number, number, number],
          radius: displayRadius,
          color: phase.color,
        };
      });
    });
  }, [analysis, mix.gradations]);

  return (
    <>
      {particles.map((particle) => (
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

function Scene({ analysis, mix }: Props) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[1.45, 1.05, 1.55]} fov={42} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 4, 2]} intensity={2.4} />
      <PastePhase analysis={analysis} />
      <Particles analysis={analysis} mix={mix} />
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

export function ConcreteCube({ analysis, mix }: Props) {
  return (
    <div className="viewport-canvas">
      <Canvas gl={{ antialias: true, alpha: true }}>
        <Scene analysis={analysis} mix={mix} />
      </Canvas>
      <div className="axis-label">1.000 m³ • PSD-driven particle sizing</div>
    </div>
  );
}
