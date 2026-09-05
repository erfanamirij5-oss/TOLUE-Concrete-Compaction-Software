import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { analyzeCombinedGradation } from '../engineering/combinedGradation';
import { GRADATION_ENVELOPES, interpolateEnvelope, type GradationEnvelopePoint, type GradationEnvelopePreset } from '../engineering/combinedGradationEnvelope';
import { baselineGradationShares, evaluateGradationDesignLab, type GradationBlendShares } from '../engineering/gradationDesignLab';
import './CombinedGradationMini.css';

interface Props { mix: MixDesign; analysis: MixAnalysis; }
const LABELS:Record<keyof GradationBlendShares,string>={sand:'ماسه',aggregate5to12:'نخودی ۴٫۷۵–۱۲',aggregate12to25:'بادامی ۱۲–۲۵'};

export function CombinedGradationMini({ mix, analysis }: Props) {
  const result=useMemo(()=>analyzeCombinedGradation(mix,analysis),[mix,analysis]);
  const baseline=useMemo(()=>baselineGradationShares(mix,analysis),[mix,analysis]);
  const [expanded,setExpanded]=useState(false);
  const [dockTarget,setDockTarget]=useState<Element|null>(null);
  const [preset,setPreset]=useState<GradationEnvelopePreset>('aci-normal');
  const [custom,setCustom]=useState<GradationEnvelopePoint[]>(GRADATION_ENVELOPES['aci-normal'].points.map(p=>({...p})));
  const [blend,setBlend]=useState<GradationBlendShares>(baseline);
  useEffect(()=>{setDockTarget(document.querySelector('.right-panel .metric-grid'));},[]);
  const lab=useMemo(()=>evaluateGradationDesignLab(mix,analysis,blend),[mix,analysis,blend]);
  const envelope=preset==='custom'?{...GRADATION_ENVELOPES.custom,points:custom}:GRADATION_ENVELOPES[preset];
  const points=expanded?lab.points:result.points; const maxSieve=points[0]?.sieveMm??25; const minSieve=points[points.length-1]?.sieveMm??0.075;
  const width=280,height=126,px=24,py=16;
  const xOf=(s:number)=>px+((Math.log(s)-Math.log(minSieve))/Math.max(1e-9,Math.log(maxSieve)-Math.log(minSieve)))*(width-px*2);
  const yOf=(p:number)=>py+(1-p/100)*(height-py*2);
  const line=points.map(p=>`${xOf(p.sieveMm).toFixed(1)},${yOf(p.passingPercent).toFixed(1)}`).join(' ');
  const env=points.map(p=>{const e=interpolateEnvelope(envelope.points,p.sieveMm);return e?{sieveMm:p.sieveMm,lower:e.lower,upper:e.upper}:null}).filter((p):p is GradationEnvelopePoint=>Boolean(p));
  const upper=env.map(p=>`${xOf(p.sieveMm).toFixed(1)},${yOf(p.upper).toFixed(1)}`).join(' '); const lower=env.map(p=>`${xOf(p.sieveMm).toFixed(1)},${yOf(p.lower).toFixed(1)}`).join(' ');
  const polygon=[...env.map(p=>`${xOf(p.sieveMm).toFixed(1)},${yOf(p.upper).toFixed(1)}`),...env.slice().reverse().map(p=>`${xOf(p.sieveMm).toFixed(1)},${yOf(p.lower).toFixed(1)}`)].join(' ');
  const outside=points.filter(p=>{const e=interpolateEnvelope(envelope.points,p.sieveMm);return e&&(p.passingPercent<e.lower||p.passingPercent>e.upper)}).length;
  const choose=(id:GradationEnvelopePreset)=>{if(id==='custom'&&preset!=='custom')setCustom(envelope.points.map(p=>({...p})));setPreset(id)};
  const edit=(i:number,key:'lower'|'upper',value:number)=>setCustom(c=>c.map((p,n)=>n===i?{...p,[key]:Math.max(0,Math.min(100,value))}:p));
  const setShare=(key:keyof GradationBlendShares,value:number)=>setBlend(current=>({...current,[key]:Math.max(0,Math.min(100,value))}));
  const resetBlend=()=>setBlend(baseline);
  if(!dockTarget&&!expanded)return null;
  const card=<div className={`combined-mini ${expanded?'combined-mini-expanded':'combined-mini-docked'}`} dir="rtl" role={expanded?'dialog':undefined} aria-modal={expanded?true:undefined}>
    <div className="combined-mini-head"><div><b>{expanded?'Combined Gradation Design Lab':'منحنی دانه‌بندی کل'}</b><span>{expanded?'طراحی و مقایسه Blend بدون تغییر طرح اصلی':`${envelope.labelFa} • حد بالا/پایین`}</span></div><div className="combined-mini-actions"><strong>{expanded?lab.continuityScore:result.continuityScore}</strong><button onClick={()=>setExpanded(v=>!v)}>{expanded?'بستن آزمایشگاه':'Design Lab'}</button></div></div>
    {expanded&&<div className={`gradation-lab-kpis ${lab.level}`}><div><span>Continuity</span><b>{lab.continuityScore}</b></div><div><span>Packing Proxy</span><b>{lab.packingProxyPercent}٪</b></div><div><span>Void Proxy</span><b>{lab.voidProxyPercent}٪</b></div><div><span>Paste Demand</span><b>{lab.pasteDemandIndex}</b></div><div><span>Risk</span><b>{lab.riskScore}</b></div></div>}
    <div className="combined-chart-shell"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="منحنی دانه‌بندی کل و محدوده راهنما">
      {[0,50,100].map(v=><g key={v}><line x1={px} x2={width-px} y1={yOf(v)} y2={yOf(v)} className="combined-mini-grid"/><text x="3" y={yOf(v)+3}>{v}</text></g>)}
      <polygon points={polygon} className="combined-envelope-fill"/><polyline points={upper} className="combined-envelope-limit"/><polyline points={lower} className="combined-envelope-limit"/>
      <polyline points={line} className="combined-mini-line"/>{points.map(p=><circle key={p.sieveMm} cx={xOf(p.sieveMm)} cy={yOf(p.passingPercent)} r="2.5" className="combined-mini-point"/>)}
    </svg></div>
    <div className="combined-mini-legend"><span>● منحنی Blend</span><span>▨ محدوده راهنما</span><b>{outside===0?'داخل بازه راهنما':`${outside} نقطه خارج از بازه`}</b></div>
    {!expanded&&<div className="combined-mini-foot"><span>{result.valid?'منحنی مرکب معتبر':'داده ناکافی'}</span><b>{result.gaps.length} بازه نیازمند بررسی</b></div>}
    {expanded&&<div className="combined-analysis-panel">
      <section className="gradation-lab-section"><div className="gradation-lab-title"><div><b>ترکیب سنگدانه‌ها</b><span>اسلایدرها فقط سناریوی آزمایشگاه را تغییر می‌دهند</span></div><button onClick={resetBlend}>بازگشت به طرح پایه</button></div>
        {(Object.keys(LABELS) as (keyof GradationBlendShares)[]).map(key=><label className="gradation-blend-row" key={key}><div><span>{LABELS[key]}</span><b>{lab.shares[key].toFixed(1)}٪</b></div><input type="range" min="0" max="100" step="1" value={blend[key]} onChange={e=>setShare(key,Number(e.target.value))}/></label>)}
        <div className="gradation-blend-total"><span>مجموع نرمال‌شده</span><b>{(lab.shares.sand+lab.shares.aggregate5to12+lab.shares.aggregate12to25).toFixed(0)}٪</b></div>
      </section>
      <section className="gradation-lab-section envelope"><div className="gradation-lab-title"><div><b>محدوده مقایسه</b><span>برای ارزیابی بصری و غربالگری</span></div></div>
        <label className="gradation-select">نوع ارزیابی<select value={preset} onChange={e=>choose(e.target.value as GradationEnvelopePreset)}>{Object.values(GRADATION_ENVELOPES).map(p=><option key={p.id} value={p.id}>{p.labelFa}</option>)}</select></label>
        <div className="combined-presets">{(['aci-normal','high-strength','pumpable','self-consolidating','custom'] as GradationEnvelopePreset[]).map(id=><button key={id} className={preset===id?'active':''} onClick={()=>choose(id)}>{GRADATION_ENVELOPES[id].labelFa}</button>)}</div>
        <p>{envelope.descriptionFa}</p><small>{envelope.referenceFa}</small>
      </section>
      {preset==='custom'&&<div className="combined-envelope-editor"><div><b>الک mm</b><b>حد پایین %</b><b>حد بالا %</b></div>{custom.map((p,i)=><div key={p.sieveMm}><span>{p.sieveMm}</span><input type="number" min="0" max="100" value={p.lower.toFixed(1)} onChange={e=>edit(i,'lower',Number(e.target.value))}/><input type="number" min="0" max="100" value={p.upper.toFixed(1)} onChange={e=>edit(i,'upper',Number(e.target.value))}/></div>)}</div>}
      <div className={`combined-envelope-status ${outside?'warn':'ok'}`}>{outside?`${outside} نقطه منحنی Blend خارج از محدوده انتخابی است.`:'کل منحنی Blend در محدوده انتخابی قرار دارد.'}</div>
      <small className="gradation-lab-note">{lab.noteFa}</small>
    </div>}
  </div>;
  return createPortal(expanded?<><div className="combined-lab-backdrop" onClick={()=>setExpanded(false)} aria-hidden="true"/>{card}</>:card,expanded?document.body:dockTarget!);
}
