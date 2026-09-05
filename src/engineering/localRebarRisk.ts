import type { RebarNetworkInput } from '../domain/rebarAnalysis';

export type LocalRebarRiskLevel = 'low' | 'attention' | 'critical';

export interface LocalRebarRiskCell {
  key: string;
  index: [number, number, number];
  position: [number, number, number];
  size: [number, number, number];
  clearOpeningMm: number;
  openingToDmaxRatio: number;
  score: number;
  level: LocalRebarRiskLevel;
}

export interface LocalRebarRiskSummary {
  cells: LocalRebarRiskCell[];
  criticalCells: number;
  attentionCells: number;
  lowRiskCells: number;
  governingOpeningMm: number;
  governingRatio: number;
  worstCells: LocalRebarRiskCell[];
  method: 'tolue-local-rebar-dmax-heuristic-v1';
  heuristic: true;
  noteFa: string;
}

const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));

function axes(spacingMm:number,coverMm:number,limit=16){
  const spacing=Math.max(40,spacingMm)/1000;
  const cover=Math.max(.015,Math.min(.20,coverMm/1000));
  const min=-.5+cover,max=.5-cover,points:number[]=[];
  for(let value=min;value<=max+1e-6;value+=spacing) points.push(value);
  if(points.length<2) return [min,max];
  if(points[points.length-1]<max-spacing*.25) points.push(max);
  else points[points.length-1]=max;
  return points.slice(0,limit);
}

function layers(network:RebarNetworkInput){
  const spacing=network.interiorVerticalSpacingMm??300;
  const internal=axes(spacing,network.coverMm,16);
  const cover=Math.max(.015,Math.min(.20,network.coverMm/1000));
  const min=-.5+cover,max=.5-cover,count=Math.max(2,Math.min(8,Math.round(network.layers)));
  const structural=count===2?[min,max]:Array.from({length:count},(_,i)=>min+(max-min)*i/(count-1));
  return Array.from(new Set([...internal,...structural].map(v=>v.toFixed(5)))).map(Number).sort((a,b)=>a-b);
}

export function evaluateLocalRebarRisk(network:RebarNetworkInput,dmaxMm:number):LocalRebarRiskSummary{
  const spacing=network.interiorVerticalSpacingMm??300;
  const xs=axes(spacing,network.coverMm),zs=axes(spacing,network.coverMm),ys=layers(network);
  const diameter=Math.max(network.x.barDiameterMm,network.y.barDiameterMm);
  const dmax=Math.max(1,dmaxMm);
  const cells:LocalRebarRiskCell[]=[];

  for(let yi=0;yi<ys.length-1;yi+=1){
    for(let zi=0;zi<zs.length-1;zi+=1){
      for(let xi=0;xi<xs.length-1;xi+=1){
        const sx=(xs[xi+1]-xs[xi])*1000,sy=(ys[yi+1]-ys[yi])*1000,sz=(zs[zi+1]-zs[zi])*1000;
        const clearX=Math.max(1,sx-diameter),clearY=Math.max(1,sy-diameter),clearZ=Math.max(1,sz-diameter);
        const clearOpeningMm=Math.min(clearX,clearY,clearZ);
        const ratio=clearOpeningMm/dmax;
        const score=Math.round(clamp((1.9-ratio)*72));
        const level:LocalRebarRiskLevel=ratio<1.25?'critical':ratio<1.8?'attention':'low';
        cells.push({
          key:`${xi}-${yi}-${zi}`,
          index:[xi,yi,zi],
          position:[(xs[xi]+xs[xi+1])/2,(ys[yi]+ys[yi+1])/2,(zs[zi]+zs[zi+1])/2],
          size:[Math.max(.035,(xs[xi+1]-xs[xi])*.82),Math.max(.035,(ys[yi+1]-ys[yi])*.82),Math.max(.035,(zs[zi+1]-zs[zi])*.82)],
          clearOpeningMm:Number(clearOpeningMm.toFixed(1)),
          openingToDmaxRatio:Number(ratio.toFixed(2)),
          score,
          level,
        });
      }
    }
  }

  const sorted=[...cells].sort((a,b)=>a.openingToDmaxRatio-b.openingToDmaxRatio||b.score-a.score);
  const governing=sorted[0];
  return{
    cells,
    criticalCells:cells.filter(c=>c.level==='critical').length,
    attentionCells:cells.filter(c=>c.level==='attention').length,
    lowRiskCells:cells.filter(c=>c.level==='low').length,
    governingOpeningMm:governing?.clearOpeningMm??0,
    governingRatio:governing?.openingToDmaxRatio??0,
    worstCells:sorted.slice(0,5),
    method:'tolue-local-rebar-dmax-heuristic-v1',
    heuristic:true,
    noteFa:'تحلیل موضعی TOLUE نسبت فاصله آزاد هندسی هر سلول قفس به Dmax نماینده را غربال می‌کند. آستانه‌ها Heuristic داخلی هستند و معیار پذیرش سازه‌ای، آیین‌نامه‌ای یا مدل DEM محسوب نمی‌شوند.',
  };
}
