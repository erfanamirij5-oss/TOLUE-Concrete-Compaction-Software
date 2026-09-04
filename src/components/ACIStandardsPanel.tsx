import { useMemo, useState } from 'react';
import type { MixAnalysis } from '../domain/mixDesign';
import { ACI_318_25_EXPOSURE, type ACIExposureClass } from '../standards/aci318_25';
import { evaluateACI31825Compliance } from '../standards/aciCompliance';

export function ACIStandardsPanel({analysis}:{analysis:MixAnalysis}){
  const[classes,setClasses]=useState<ACIExposureClass[]>(['F0','S0','W0','C0']);
  const[fcMpa,setFcMpa]=useState<number|undefined>();
  const[dmax,setDmax]=useState<number|undefined>(25);
  const[air,setAir]=useState<number|undefined>(analysis.designedAirVolumeM3*100);
  const[chloride,setChloride]=useState<number|undefined>();
  const[prestressed,setPrestressed]=useState(false);
  const result=useMemo(()=>evaluateACI31825Compliance(analysis,{classes,fcMpa,nominalMaxAggregateMm:dmax,measuredAirPercent:air,chloridePercentByCementitious:chloride,prestressed}),[analysis,classes,fcMpa,dmax,air,chloride,prestressed]);
  const setCategory=(category:'F'|'S'|'W'|'C',value:ACIExposureClass)=>setClasses(current=>[...current.filter(c=>ACI_318_25_EXPOSURE[c].category!==category),value]);
  const statusColor=result.status==='pass'?'#39c27f':result.status==='fail'?'#ff4055':'#f2a33b';
  return <section dir="rtl" style={{border:'1px solid #254963',background:'#071827',borderRadius:12,padding:12,display:'grid',gap:10}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div><b>کنترل استاندارد ACI 318-25</b><div style={{fontSize:11,color:'#7895aa'}}>فصل 19 — دوام و کلاس‌های محیطی</div></div><strong style={{color:statusColor}}>{result.labelFa}</strong></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
      {(['F','S','W','C'] as const).map(cat=><label key={cat} style={{display:'grid',gap:4,fontSize:11}}><span>{cat==='F'?'یخ‌زدگی F':cat==='S'?'سولفات S':cat==='W'?'آب W':'کلرید C'}</span><select value={classes.find(c=>ACI_318_25_EXPOSURE[c].category===cat)} onChange={e=>setCategory(cat,e.target.value as ACIExposureClass)}>{Object.values(ACI_318_25_EXPOSURE).filter(r=>r.category===cat).map(r=><option key={r.code} value={r.code}>{r.code} — {r.labelFa}</option>)}</select></label>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
      <label>f'c MPa<input type="number" value={fcMpa??''} onChange={e=>setFcMpa(e.target.value===''?undefined:Number(e.target.value))}/></label>
      <label>Dmax mm<input type="number" value={dmax??''} onChange={e=>setDmax(e.target.value===''?undefined:Number(e.target.value))}/></label>
      <label>Air %<input type="number" step="0.1" value={air??''} onChange={e=>setAir(e.target.value===''?undefined:Number(e.target.value))}/></label>
      <label>Cl⁻ %<input type="number" step="0.01" value={chloride??''} onChange={e=>setChloride(e.target.value===''?undefined:Number(e.target.value))}/></label>
      <label style={{display:'flex',alignItems:'end',gap:6}}><input type="checkbox" checked={prestressed} onChange={e=>setPrestressed(e.target.checked)}/>پیش‌تنیده</label>
    </div>
    <div style={{display:'grid',gap:6}}>{result.checks.map(check=><div key={check.key} style={{display:'grid',gridTemplateColumns:'1.4fr .8fr .8fr 1.2fr',gap:8,borderTop:'1px solid #15334a',paddingTop:6,fontSize:11}}><b>{check.labelFa}</b><span>{check.actualFa}</span><span style={{color:check.status==='pass'?'#39c27f':check.status==='fail'?'#ff4055':'#f2a33b'}}>{check.status==='pass'?'مطابق':check.status==='fail'?'نامطابق':'داده ناکافی'}</span><small>{check.requiredFa}<br/>{check.sourceFa}</small></div>)}</div>
    <small style={{color:'#7895aa'}}>این بخش کنترل رسمی ACI است؛ شاخص‌های Packing/Heatmap/Bridge در بخش جداگانه Heuristic باقی می‌مانند. برای دانه‌بندی سنگدانه، ماژول ASTM C33/C33M جداگانه استفاده خواهد شد.</small>
  </section>;
}
