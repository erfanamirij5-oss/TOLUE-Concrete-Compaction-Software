import { useMemo, useState } from 'react';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { analyzeCombinedGradation } from '../engineering/combinedGradation';
import { GRADATION_ENVELOPES, interpolateEnvelope, type GradationEnvelopePoint, type GradationEnvelopePreset } from '../engineering/combinedGradationEnvelope';

interface Props { mix: MixDesign; analysis: MixAnalysis; }

export function CombinedGradationMini({ mix, analysis }: Props) {
  const result=useMemo(()=>analyzeCombinedGradation(mix,analysis),[mix,analysis]);
  const [expanded,setExpanded]=useState(false);
  const [preset,setPreset]=useState<GradationEnvelopePreset>('aci-normal');
  const [custom,setCustom]=useState<GradationEnvelopePoint[]>(GRADATION_ENVELOPES['aci-normal'].points.map(p=>({...p})));
  const envelope=preset==='custom'?{...GRADATION_ENVELOPES.custom,points:custom}:GRADATION_ENVELOPES[preset];
  const points=result.points; const maxSieve=points[0]?.sieveMm??25; const minSieve=points[points.length-1]?.sieveMm??0.075;
  const width=250,height=112,px=22,py=15;
  const xOf=(s:number)=>px+((Math.log(s)-Math.log(minSieve))/Math.max(1e-9,Math.log(maxSieve)-Math.log(minSieve)))*(width-px*2);
  const yOf=(p:number)=>py+(1-p/100)*(height-py*2);
  const line=points.map(p=>`${xOf(p.sieveMm).toFixed(1)},${yOf(p.passingPercent).toFixed(1)}`).join(' ');
  const env=points.map(p=>{const e=interpolateEnvelope(envelope.points,p.sieveMm);return e?{sieveMm:p.sieveMm,lower:e.lower,upper:e.upper}:null}).filter((p):p is GradationEnvelopePoint=>Boolean(p));
  const upper=env.map(p=>`${xOf(p.sieveMm).toFixed(1)},${yOf(p.upper).toFixed(1)}`).join(' '); const lower=env.map(p=>`${xOf(p.sieveMm).toFixed(1)},${yOf(p.lower).toFixed(1)}`).join(' ');
  const polygon=[...env.map(p=>`${xOf(p.sieveMm).toFixed(1)},${yOf(p.upper).toFixed(1)}`),...env.slice().reverse().map(p=>`${xOf(p.sieveMm).toFixed(1)},${yOf(p.lower).toFixed(1)}`)].join(' ');
  const outside=points.filter(p=>{const e=interpolateEnvelope(envelope.points,p.sieveMm);return e&&(p.passingPercent<e.lower||p.passingPercent>e.upper)}).length;
  const choose=(id:GradationEnvelopePreset)=>{if(id==='custom'&&preset!=='custom')setCustom(envelope.points.map(p=>({...p})));setPreset(id)};
  const edit=(i:number,key:'lower'|'upper',value:number)=>setCustom(c=>c.map((p,n)=>n===i?{...p,[key]:Math.max(0,Math.min(100,value))}:p));
  return <div className={`combined-mini ${expanded?'combined-mini-expanded':''}`} dir="rtl">
    <div className="combined-mini-head"><div><b>منحنی دانه‌بندی کل</b><span>{envelope.labelFa} • حد بالا/پایین</span></div><div className="combined-mini-actions"><strong>{result.continuityScore}</strong><button onClick={()=>setExpanded(v=>!v)}>{expanded?'×':'تحلیل بیشتر'}</button></div></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="منحنی دانه‌بندی کل و محدوده راهنما">
      {[0,50,100].map(v=><g key={v}><line x1={px} x2={width-px} y1={yOf(v)} y2={yOf(v)} className="combined-mini-grid"/><text x="3" y={yOf(v)+3}>{v}</text></g>)}
      <polygon points={polygon} className="combined-envelope-fill"/><polyline points={upper} className="combined-envelope-limit"/><polyline points={lower} className="combined-envelope-limit"/>
      <polyline points={line} className="combined-mini-line"/>{points.map(p=><circle key={p.sieveMm} cx={xOf(p.sieveMm)} cy={yOf(p.passingPercent)} r="2.4" className="combined-mini-point"/>)}
    </svg>
    <div className="combined-mini-legend"><span>● منحنی طرح</span><span>▨ محدوده راهنما</span><b>{outside===0?'داخل بازه راهنما':`${outside} نقطه خارج از بازه`}</b></div>
    <div className="combined-mini-foot"><span>{result.valid?'منحنی مرکب معتبر':'داده ناکافی'}</span><b>{result.gaps.length} بازه نیازمند بررسی</b></div>
    {expanded&&<div className="combined-analysis-panel">
      <label>نوع ارزیابی<select value={preset} onChange={e=>choose(e.target.value as GradationEnvelopePreset)}>{Object.values(GRADATION_ENVELOPES).map(p=><option key={p.id} value={p.id}>{p.labelFa}</option>)}</select></label>
      <p>{envelope.descriptionFa}</p><small>{envelope.referenceFa}</small>
      <div className="combined-presets">{(['aci-normal','high-strength','pumpable','self-consolidating','custom'] as GradationEnvelopePreset[]).map(id=><button key={id} className={preset===id?'active':''} onClick={()=>choose(id)}>{GRADATION_ENVELOPES[id].labelFa}</button>)}</div>
      {preset==='custom'&&<div className="combined-envelope-editor"><div><b>الک mm</b><b>حد پایین %</b><b>حد بالا %</b></div>{custom.map((p,i)=><div key={p.sieveMm}><span>{p.sieveMm}</span><input type="number" min="0" max="100" value={p.lower.toFixed(1)} onChange={e=>edit(i,'lower',Number(e.target.value))}/><input type="number" min="0" max="100" value={p.upper.toFixed(1)} onChange={e=>edit(i,'upper',Number(e.target.value))}/></div>)}</div>}
      <div className={`combined-envelope-status ${outside?'warn':'ok'}`}>{outside?`${outside} نقطه منحنی خارج از محدوده انتخابی است.`:'کل منحنی در محدوده انتخابی قرار دارد.'}</div>
    </div>}
  </div>;
}
