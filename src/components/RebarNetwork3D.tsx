import { useMemo } from 'react';
import type { RebarNetworkInput } from '../domain/rebarAnalysis';

interface Props { network: RebarNetworkInput; visible?: boolean; ghost?: boolean; dmaxMm?: number; showBottlenecks?: boolean; }
function positions(spacingMm:number,coverMm:number,limit=30){const spacing=Math.max(.04,spacingMm/1000),cover=Math.max(.015,Math.min(.20,coverMm/1000)),min=-.5+cover,max=.5-cover,values:number[]=[];for(let v=min;v<=max+1e-6;v+=spacing)values.push(v);if(!values.length)return[0];if(values[values.length-1]<max-spacing*.35)values.push(max);return values.slice(0,limit)}
function layerLevels(layerCount:number,coverMm:number){const cover=Math.max(.015,Math.min(.20,coverMm/1000)),min=-.5+cover,max=.5-cover,count=Math.max(2,Math.min(8,Math.round(layerCount)));return count===2?[min,max]:Array.from({length:count},(_,i)=>min+((max-min)*i)/(count-1))}
function mergeLevels(...groups:number[][]){return Array.from(new Set(groups.flat().map(v=>v.toFixed(5)))).map(Number).sort((a,b)=>a-b)}
export function RebarNetwork3D({network,visible=true,ghost=false,dmaxMm=0,showBottlenecks=true}:Props){
 const internalSpacing=network.interiorVerticalSpacingMm??300;
 const xPositions=useMemo(()=>positions(network.x.centerSpacingMm,network.coverMm),[network.x.centerSpacingMm,network.coverMm]);
 const zPositions=useMemo(()=>positions(network.y.centerSpacingMm,network.coverMm),[network.y.centerSpacingMm,network.coverMm]);
 const yLevels=useMemo(()=>layerLevels(network.layers,network.coverMm),[network.layers,network.coverMm]);
 const internalX=useMemo(()=>positions(internalSpacing,network.coverMm,14),[internalSpacing,network.coverMm]);
 const internalZ=useMemo(()=>positions(internalSpacing,network.coverMm,14),[internalSpacing,network.coverMm]);
 const internalYBase=useMemo(()=>positions(internalSpacing,network.coverMm,14),[internalSpacing,network.coverMm]);
 const internalY=useMemo(()=>mergeLevels(yLevels,internalYBase),[yLevels,internalYBase]);
 if(!visible)return null;
 const xRadius=Math.max(.0032,network.x.barDiameterMm/2000),zRadius=Math.max(.0032,network.y.barDiameterMm/2000),mainRadius=Math.max(xRadius,zRadius),tieRadius=Math.max(.0028,Math.min(xRadius,zRadius)*.72),opacity=ghost?.20:.93,cover=Math.max(.015,Math.min(.20,network.coverMm/1000)),clear=Math.max(.15,1-cover*2),min=-.5+cover,max=.5-cover,sideXs=[min,max],sideZs=[min,max],showInternal=network.internalGrid!==false,showTies=network.internalTies!==false;
 const steel=(color:string,localOpacity=opacity)=><meshStandardMaterial color={color} metalness={.82} roughness={.28} transparent opacity={localOpacity}/>;
 const clearX=Math.max(1,network.x.centerSpacingMm-network.x.barDiameterMm),clearZ=Math.max(1,network.y.centerSpacingMm-network.y.barDiameterMm),clearInternal=Math.max(1,internalSpacing-Math.max(network.x.barDiameterMm,network.y.barDiameterMm));const governing=Math.min(clearX,clearZ,clearInternal,network.layers>1?network.clearLayerSpacingMm:Infinity);const ratio=dmaxMm>0?governing/dmaxMm:99;const risk=ratio<1.25?'critical':ratio<1.8?'attention':'good';const riskColor=risk==='critical'?'#ff1744':risk==='attention'?'#ffb000':'#39ff88';
 const bottlenecks=showInternal&&showBottlenecks&&dmaxMm>0&&risk!=='good'?internalX.flatMap((x,xi)=>internalZ.map((z,zi)=>({key:`${xi}-${zi}`,x,z}))):[];
 return <group>
  {yLevels.map((y,mi)=><group key={`mat-${mi}`}>{zPositions.map((z,i)=><mesh key={`mx-${mi}-${i}`} position={[0,y,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[xRadius,xRadius,clear,14]}/>{steel(mi===0||mi===yLevels.length-1?'#243c50':'#31566f')}</mesh>)}{xPositions.map((x,i)=><mesh key={`mz-${mi}-${i}`} position={[x,y+zRadius*1.35,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[zRadius,zRadius,clear,14]}/>{steel(mi===0||mi===yLevels.length-1?'#35566d':'#426d89')}</mesh>)}</group>)}
  {xPositions.flatMap((x,i)=>sideZs.map(z=><mesh key={`vx-${i}-${z}`} position={[x,0,z]}><cylinderGeometry args={[mainRadius,mainRadius,clear,14]}/>{steel('#30495d')}</mesh>))}{zPositions.slice(1,-1).flatMap((z,i)=>sideXs.map(x=><mesh key={`vz-${i}-${x}`} position={[x,0,z]}><cylinderGeometry args={[mainRadius,mainRadius,clear,14]}/>{steel('#30495d')}</mesh>))}
  {showInternal&&internalX.flatMap((x,xi)=>internalZ.map((z,zi)=><mesh key={`iv-${xi}-${zi}`} position={[x,0,z]}><cylinderGeometry args={[tieRadius,tieRadius,clear,12]}/>{steel('#58778d',ghost?.12:.62)}</mesh>))}
  {showInternal&&showTies&&internalY.map((y,li)=><group key={`igrid-${li}`}>{internalZ.map((z,i)=><mesh key={`ihx-${li}-${i}`} position={[0,y,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[tieRadius*.95,tieRadius*.95,clear,10]}/>{steel('#6f91a8',ghost?.11:.54)}</mesh>)}{internalX.map((x,i)=><mesh key={`ihz-${li}-${i}`} position={[x,y+tieRadius*1.1,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[tieRadius*.95,tieRadius*.95,clear,10]}/>{steel('#789bb2',ghost?.11:.54)}</mesh>)}</group>)}
  {showTies&&yLevels.map((y,li)=><group key={`tie-${li}`}>{sideZs.map(z=><mesh key={`tx-${li}-${z}`} position={[0,y,z]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[tieRadius,tieRadius,clear,12]}/>{steel('#5a7489',ghost?.14:.54)}</mesh>)}{sideXs.map(x=><mesh key={`tz-${li}-${x}`} position={[x,y,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[tieRadius,tieRadius,clear,12]}/>{steel('#5a7489',ghost?.14:.54)}</mesh>)}</group>)}
  {bottlenecks.map((p,i)=><group key={`bn-${p.key}`} position={[p.x,0,p.z]}><mesh><sphereGeometry args={[risk==='critical'?.018:.014,10,8]}/><meshBasicMaterial color={riskColor} transparent opacity={ghost?.28:.88}/></mesh>{i%2===0&&<mesh><cylinderGeometry args={[.004,.004,clear*.88,8]}/><meshBasicMaterial color={riskColor} transparent opacity={ghost?.12:.34}/></mesh>}</group>)}
 </group>;
}
