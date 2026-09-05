import { useEffect } from 'react';
import type { PackingResult } from '../engineering/packing';
import type { RebarNetworkInput } from '../domain/rebarAnalysis';
import { analyzeRebarBridgeRisk } from '../engineering/rebarBridgeRisk';
import { loadRebarScenario, saveRebarScenario } from '../services/rebarScenarioStore';
import './RebarLiveControls.css';

interface Props {
  network: RebarNetworkInput;
  packing: PackingResult;
  onChange: (network: RebarNetworkInput) => void;
  visible: boolean;
  onToggleVisible: () => void;
}

const clamp=(v:number,min=0,max=100)=>Math.min(max,Math.max(min,v));

export function RebarLiveControls({network,packing,onChange,visible,onToggleVisible}:Props){
  useEffect(()=>{ onChange(loadRebarScenario()); },[]);
  const commit=(next:RebarNetworkInput)=>{ saveRebarScenario(next); onChange(next); };
  const dmax=Math.max(1,...packing.particles.map(p=>p.diameterMm||0));
  const clearX=Math.max(0,network.x.centerSpacingMm-network.x.barDiameterMm);
  const clearY=Math.max(0,network.y.centerSpacingMm-network.y.barDiameterMm);
  const governing=Math.min(clearX,clearY,network.layers>1?network.clearLayerSpacingMm:Number.POSITIVE_INFINITY);
  const ratio=governing/dmax;
  const passing=Math.round(clamp((ratio-1)*42+38));
  const level=passing>=75?'good':passing>=50?'attention':'critical';
  const bridge=analyzeRebarBridgeRisk(packing,network);
  const updateDir=(dir:'x'|'y',key:'barDiameterMm'|'centerSpacingMm',value:number)=>commit({...network,[dir]:{...network[dir],[key]:Math.max(1,value)}});
  return <div className={`rebar-live ${level}`} dir="rtl">
    <div className="rebar-live-head"><div><b>شبکه آرماتور — تحلیل زنده</b><small>اثر فوری بر هندسه، گلوگاه، Heatmap و ریسک پل‌زدگی</small></div><button onClick={onToggleVisible}>{visible?'پنهان':'نمایش'}</button></div>
    <div className="rebar-live-score"><div><span>عبور سنگدانه</span><strong>{passing}/100</strong></div><div><span>گلوگاه</span><strong>{governing.toFixed(0)} mm</strong></div><div><span>Dmax نماینده</span><strong>{dmax.toFixed(1)} mm</strong></div></div>
    <div className={`rebar-bridge-summary ${bridge.level}`}><div><span>ریسک پل‌زدگی</span><b>{bridge.score}/100</b></div><small>{bridge.candidateSharePercent}٪ ذرات درشت در محدوده حساس • {bridge.criticalSharePercent}٪ بحرانی</small><p>{bridge.messageFa}</p></div>
    <div className="rebar-live-grid">
      <label><span>قطر X</span><input type="number" min="1" value={network.x.barDiameterMm} onChange={e=>updateDir('x','barDiameterMm',Number(e.target.value))}/><i>mm</i></label>
      <label><span>فاصله X</span><input type="number" min="1" value={network.x.centerSpacingMm} onChange={e=>updateDir('x','centerSpacingMm',Number(e.target.value))}/><i>mm</i></label>
      <label><span>قطر Y</span><input type="number" min="1" value={network.y.barDiameterMm} onChange={e=>updateDir('y','barDiameterMm',Number(e.target.value))}/><i>mm</i></label>
      <label><span>فاصله Y</span><input type="number" min="1" value={network.y.centerSpacingMm} onChange={e=>updateDir('y','centerSpacingMm',Number(e.target.value))}/><i>mm</i></label>
      <label><span>تعداد لایه</span><input type="number" min="1" max="6" value={network.layers} onChange={e=>commit({...network,layers:Math.max(1,Math.min(6,Number(e.target.value)))})}/><i>لایه</i></label>
      <label><span>فاصله خالص لایه‌ها</span><input type="number" min="1" value={network.clearLayerSpacingMm} onChange={e=>commit({...network,clearLayerSpacingMm:Math.max(1,Number(e.target.value))})}/><i>mm</i></label>
      <label><span>کاور</span><input type="number" min="0" max="450" value={network.coverMm} onChange={e=>commit({...network,coverMm:Math.max(0,Number(e.target.value))})}/><i>mm</i></label>
      <label><span>قطر سر ویبراتور</span><input type="number" min="1" value={network.vibratorHeadDiameterMm} onChange={e=>commit({...network,vibratorHeadDiameterMm:Math.max(1,Number(e.target.value))})}/><i>mm</i></label>
    </div>
    <p>{ratio<1.25?'گلوگاه به اندازه سنگدانه درشت نزدیک است؛ احتمال پل‌زدگی و محدودیت عبور بالاست.':ratio<1.8?'عبور ممکن است، اما شبکه متراکم است و اجرای تراکم باید کنترل شود.':'فضای عبور هندسی نسبت به Dmax نماینده مناسب ارزیابی می‌شود.'}</p>
    <small className="rebar-live-note">سناریوی آرماتور ذخیره می‌شود و همان سناریو در گزارش‌ها و رتبه‌بندی اجرا استفاده خواهد شد. Heuristic داخلی TOLUE — تشخیص پل‌زدگی فعلاً مبتنی بر PSD و نسبت اندازه ذره به گلوگاه است؛ مدل DEM یا کنترل استاندارد رسمی نیست.</small>
  </div>;
}
