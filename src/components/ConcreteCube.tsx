import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MixAnalysis } from '../domain/mixDesign';
import type { ViewControls } from '../domain/viewControls';
import type { PackingResult } from '../engineering/packing';
import type { CompactionState } from '../engineering/compaction';
import type { ComplianceSummary } from '../engineering/referenceCompliance';
import { evaluateEngineeringHealth } from '../engineering/engineeringHealth';

interface Props { analysis: MixAnalysis; packing: PackingResult; compaction: CompactionState; view: ViewControls; compliance?: ComplianceSummary; }

const phaseOrder: Record<string, number> = { aggregate12to25: 0, aggregate5to12: 1, sand: 2 };
const phaseLabel: Record<string, string> = { aggregate12to25: 'سنگدانه ۱۲–۲۵', aggregate5to12: 'سنگدانه ۴٫۷۵–۱۲', sand: 'ماسه' };

function SectionPlane({ view }: { view: ViewControls }) { if (!view.sectionEnabled) return null; const rotation:[number,number,number]=view.sectionAxis==='x'?[0,Math.PI/2,0]:view.sectionAxis==='y'?[Math.PI/2,0,0]:[0,0,0]; const position:[number,number,number]=view.sectionAxis==='x'?[view.sectionPosition,0,0]:view.sectionAxis==='y'?[0,view.sectionPosition,0]:[0,0,view.sectionPosition]; return <mesh position={position} rotation={rotation}><planeGeometry args={[1.05,1.05]}/><meshBasicMaterial color="#f28b2d" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false}/></mesh>; }
function isVisibleBySection(position:[number,number,number],view:ViewControls){if(!view.sectionEnabled)return true;const axisIndex=view.sectionAxis==='x'?0:view.sectionAxis==='y'?1:2;return position[axisIndex]<=view.sectionPosition;}

function revealFactor(materialKey:string,index:number,total:number,progress:number){
  if(progress<=0.02)return .14;
  const phase=phaseOrder[materialKey]??2;
  const phaseStart=phase*.20;
  const local=(index/Math.max(1,total))*.18;
  const threshold=.06+phaseStart+local;
  return THREE.MathUtils.smoothstep(progress,threshold,Math.min(.98,threshold+.18));
}

function AnimatedParticle({particle,compaction,index,total,view,critical}:{particle:PackingResult['particles'][number];compaction:CompactionState;index:number;total:number;view:ViewControls;critical:boolean}){
  const ref=useRef<THREE.Mesh>(null);const materialRef=useRef<THREE.MeshStandardMaterial>(null);
  const visible=isVisibleBySection(particle.position,view)&&(particle.materialKey==='sand'?view.phases.sand:particle.materialKey==='aggregate5to12'?view.phases.aggregate5to12:particle.materialKey==='aggregate12to25'?view.phases.aggregate12to25:true);
  useFrame(({clock})=>{if(!ref.current)return;const reveal=revealFactor(particle.materialKey,index,total,compaction.progress);const wave=Math.sin(clock.elapsedTime*34+index*.73);const lateral=compaction.lateralVibration*wave;const settledY=-.5+(particle.position[1]+.5)*compaction.settlementFactor;const inletLift=(1-reveal)*(.9+(index%11)*.018);ref.current.position.set(particle.position[0]+lateral,settledY+inletLift,particle.position[2]-lateral*.55);const s=.58+reveal*.42;ref.current.scale.set(particle.scale[0]*s,particle.scale[1]*s,particle.scale[2]*s);if(materialRef.current)materialRef.current.opacity=view.ghostMode?Math.max(.08,reveal*.30):Math.max(.06,reveal);});
  return <mesh ref={ref} visible={visible} rotation={particle.rotation}><icosahedronGeometry args={[particle.radius,1]}/><meshStandardMaterial ref={materialRef} color={critical?'#ff3347':particle.color} emissive={critical?'#8b0014':'#000000'} emissiveIntensity={critical?.9:0} roughness={critical?.45:.82} transparent opacity={compaction.progress<=.02?.14:1} depthWrite={!view.ghostMode}/></mesh></mesh>;
}

function Particles({packing,compaction,view,compliance}:{packing:PackingResult;compaction:CompactionState;view:ViewControls;compliance?:ComplianceSummary}){const affected=new Set(compliance?.affectedMaterials??[]);return <>{packing.particles.map((particle,index)=><AnimatedParticle key={particle.key} particle={particle} compaction={compaction} index={index} total={packing.particles.length} view={view} critical={affected.has(particle.materialKey as never)}/>)}</>;}
function PastePhase({analysis,compaction,view}:{analysis:MixAnalysis;compaction:CompactionState;view:ViewControls}){const pasteFraction=Math.min(.92,Math.max(.08,analysis.pasteVolumeM3));const baseScale=Math.cbrt(pasteFraction);const verticalScale=baseScale*(.97+compaction.progress*.03);if(!view.phases.paste)return null;const reveal=compaction.progress<=.02?.10:THREE.MathUtils.smoothstep(compaction.progress,.58,.88);return <mesh scale={[baseScale,verticalScale*reveal,baseScale]} position={[0,-.5+(verticalScale*reveal)/2,0]}><boxGeometry args={[1,1,1]}/><meshPhysicalMaterial color="#c5d1db" transparent opacity={view.ghostMode?.04:.11} roughness={.34} depthWrite={false}/></mesh>;}
function RiskShell({compliance}:{compliance?:ComplianceSummary}){if(!compliance?.issues.length)return null;const critical=compliance.critical>0;return <mesh scale={[1.018,1.018,1.018]}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color={critical?'#ff3047':'#ff7a2b'} wireframe transparent opacity={critical?.48:.25}/></mesh>;}

function RiskHeatmap({packing,compliance}:{packing:PackingResult;compliance?:ComplianceSummary}){
  if(!compliance?.issues.length)return null;
  const affected=new Set(compliance.affectedMaterials);
  const risky=packing.particles.filter(p=>affected.has(p.materialKey as never)).filter((_,i)=>i%9===0).slice(0,28);
  return <>{risky.map((p,i)=><mesh key={`heat-${p.key}`} position={p.position} scale={[.11,.11,.11]}><sphereGeometry args={[1,12,10]}/><meshBasicMaterial color={compliance.critical?'#ff1938':'#ff7a2b'} transparent opacity={.055+(i%4)*.012} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>)}</>;
}

function Scene({analysis,packing,compaction,view,compliance}:Props){const clippingPlanes=useMemo(()=>{if(!view.sectionEnabled)return[];const normal=view.sectionAxis==='x'?new THREE.Vector3(1,0,0):view.sectionAxis==='y'?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1);return[new THREE.Plane(normal,-view.sectionPosition)];},[view.sectionAxis,view.sectionEnabled,view.sectionPosition]);return <><PerspectiveCamera makeDefault position={[1.45,1.05,1.55]} fov={42}/><ambientLight intensity={1.35}/><directionalLight position={[3,4,2]} intensity={2.5}/><pointLight position={[-2,1.5,1]} intensity={.8} color="#3b82f6"/><PastePhase analysis={analysis} compaction={compaction} view={view}/><Particles packing={packing} compaction={compaction} view={view} compliance={compliance}/><RiskHeatmap packing={packing} compliance={compliance}/><mesh><boxGeometry args={[1,1,1]}/><meshPhysicalMaterial clippingPlanes={clippingPlanes} transparent opacity={view.ghostMode?.025:view.shellOpacity} roughness={.08} metalness={.05} transmission={.48} depthWrite={false}/></mesh><RiskShell compliance={compliance}/><SectionPlane view={view}/><lineSegments><edgesGeometry args={[new THREE.BoxGeometry(1,1,1)]}/><lineBasicMaterial color="#d9e4ee" transparent opacity={view.ghostMode?.35:.72}/></lineSegments><gridHelper args={[3,30,'#31557a','#13283e']} position={[0,-.505,0]}/><OrbitControls makeDefault enableDamping dampingFactor={.07} minDistance={1.1} maxDistance={5}/></>;}

export function ConcreteCube({analysis,packing,compaction,view,compliance}:Props){
  const health=useMemo(()=>evaluateEngineeringHealth(analysis,packing,compaction,compliance),[analysis,packing,compaction,compliance]);
  const affected=new Set(compliance?.affectedMaterials??[]);
  const status=compliance?.issues.length?`${compliance.critical?'بحرانی':'نیازمند بررسی'} • ${compliance.issues.length} مغایرت مرجع`:'محدوده مرجع مناسب';
  const phases=[['aggregate12to25','#7c858c'],['aggregate5to12','#a18c74'],['sand','#c5ad7c']];
  return <div className="viewport-canvas"><Canvas gl={{antialias:true,alpha:true,preserveDrawingBuffer:true}} onCreated={({gl})=>{gl.localClippingEnabled=true;}}><Scene analysis={analysis} packing={packing} compaction={compaction} view={view} compliance={compliance}/></Canvas>
    <div className={`health-orb ${health.level}`}><span>سلامت مهندسی</span><b>{health.score}</b><small>{health.labelFa}</small><i style={{'--health':`${health.score}%`} as React.CSSProperties}/></div>
    <div className="phase-legend"><b>راهنمای فازها</b>{phases.map(([key,color])=><div key={key}><i style={{background:affected.has(key as never)?'#ff3347':color}}/><span>{phaseLabel[key]}</span>{affected.has(key as never)&&<em>خارج از محدوده مرجع</em>}</div>)}<div><i className="paste-dot"/><span>خمیر سیمانی</span></div></div>
    <div className="health-breakdown"><div><span>تراکم</span><b>{health.packingScore}</b></div><div><span>حجم‌ها</span><b>{health.volumetricScore}</b></div><div><span>دانه‌بندی</span><b>{health.gradationScore}</b></div><div><span>اجرای تراکم</span><b>{health.compactionScore}</b></div></div>
    <div className={`axis-label ${compliance?.issues.length?'risk':''}`}>۱٫۰۰۰ مترمکعب • {compaction.stage==='loose'?'آماده اجرای میکس':compaction.stage==='vibrating'?'در حال ورود و تراکم مصالح':'متراکم'} • {status}</div></div>;
}
