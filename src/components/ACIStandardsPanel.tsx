import { useMemo, useState } from 'react';
import type { MixAnalysis } from '../domain/mixDesign';
import { ACI_318_25_EXPOSURE, type ACIExposureClass } from '../standards/aci318_25';
import { evaluateACI31825Compliance } from '../standards/aciCompliance';
import { loadStandardsSettings, saveStandardsSettings, type StandardsSettings } from '../standards/standardsSettings';

export function ACIStandardsPanel({analysis}:{analysis:MixAnalysis}){
  const[settings,setSettings]=useState<StandardsSettings>(()=>{
    const current=loadStandardsSettings();
    return {
      ...current,
      aci:{
        ...current.aci,
        measuredAirPercent:current.aci.measuredAirPercent ?? analysis.designedAirVolumeM3*100,
      },
    };
  });
  const aci=settings.aci;
  const result=useMemo(()=>evaluateACI31825Compliance(analysis,{
    classes:aci.classes,
    fcMpa:aci.fcMpa,
    nominalMaxAggregateMm:aci.nominalMaxAggregateMm,
    measuredAirPercent:aci.measuredAirPercent,
    chloridePercentByCementitious:aci.chloridePercentByCementitious,
    prestressed:aci.prestressed,
  }),[analysis,aci]);

  const patchAci=(patch:Partial<StandardsSettings['aci']>)=>setSettings(current=>{
    const next={...current,aci:{...current.aci,...patch}};
    saveStandardsSettings(next);
    return next;
  });
  const setCategory=(category:'F'|'S'|'W'|'C',value:ACIExposureClass)=>patchAci({classes:[...aci.classes.filter(c=>ACI_318_25_EXPOSURE[c].category!==category),value]});
  const statusColor=result.status==='pass'?'#39c27f':result.status==='fail'?'#ff4055':'#f2a33b';
  return <section dir="rtl" style={{border:'1px solid #254963',background:'#071827',borderRadius:12,padding:12,display:'grid',gap:10}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><div><b>کنترل استاندارد ACI 318-25</b><div style={{fontSize:11,color:'#7895aa'}}>فصل 19 — دوام و کلاس‌های محیطی</div></div><strong style={{color:statusColor}}>{result.labelFa}</strong></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
      {(['F','S','W','C'] as const).map(cat=><label key={cat} style={{display:'grid',gap:4,fontSize:11}}><span>{cat==='F'?'یخ‌زدگی F':cat==='S'?'سولفات S':cat==='W'?'آب W':'کلرید C'}</span><select value={aci.classes.find(c=>ACI_318_25_EXPOSURE[c].category===cat)} onChange={e=>setCategory(cat,e.target.value as ACIExposureClass)}>{Object.values(ACI_318_25_EXPOSURE).filter(r=>r.category===cat).map(r=><option key={r.code} value={r.code}>{r.code} — {r.labelFa}</option>)}</select></label>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
      <label>f'c MPa<input type="number" value={aci.fcMpa??''} onChange={e=>patchAci({fcMpa:e.target.value===''?undefined:Number(e.target.value)})}/></label>
      <label>Dmax mm<input type="number" value={aci.nominalMaxAggregateMm??''} onChange={e=>patchAci({nominalMaxAggregateMm:e.target.value===''?undefined:Number(e.target.value)})}/></label>
      <label>Air %<input type="number" step="0.1" value={aci.measuredAirPercent??''} onChange={e=>patchAci({measuredAirPercent:e.target.value===''?undefined:Number(e.target.value)})}/></label>
      <label>Cl⁻ %<input type="number" step="0.01" value={aci.chloridePercentByCementitious??''} onChange={e=>patchAci({chloridePercentByCementitious:e.target.value===''?undefined:Number(e.target.value)})}/></label>
      <label style={{display:'flex',alignItems:'end',gap:6}}><input type="checkbox" checked={aci.prestressed} onChange={e=>patchAci({prestressed:e.target.checked})}/>پیش‌تنیده</label>
    </div>
    <div style={{display:'grid',gap:6}}>{result.checks.map(check=><div key={check.key} style={{display:'grid',gridTemplateColumns:'1.4fr .8fr .8fr 1.2fr',gap:8,borderTop:'1px solid #15334a',paddingTop:6,fontSize:11}}><b>{check.labelFa}</b><span>{check.actualFa}</span><span style={{color:check.status==='pass'?'#39c27f':check.status==='fail'?'#ff4055':'#f2a33b'}}>{check.status==='pass'?'مطابق':check.status==='fail'?'نامطابق':'داده ناکافی'}</span><small>{check.requiredFa}<br/>{check.sourceFa}</small></div>)}</div>
    <small style={{color:'#7895aa'}}>انتخاب کلاس‌ها و داده‌های ACI برای گزارش‌های بعدی ذخیره می‌شود. نتیجه استاندارد مستقل از امتیاز Heuristic نرم‌افزار باقی می‌ماند.</small>
  </section>;
}
