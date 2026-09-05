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
  onClose?: () => void;
}

const clamp=(v:number,min=0,max=100)=>Math.min(max,Math.max(min,v));

export function RebarLiveControls({network,packing,onChange,visible,onToggleVisible,onClose}:Props){
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
    <div className="rebar-live-head"><div><b>شبکه آرماتور و تراکم داخلی</b><small>قفس حجمی، شبکه‌های داخلی، گلوگاه، Heatmap و ریسک پل‌زدگی</small></div><div className="rebar-head-actions"><button onClick={onToggleVisible}>{visible?'پنهان‌کردن شبکه':'نمایش شبکه'}</button>{onClose&&<button className="panel-close" title="بستن" aria-label="بستن پنل آرماتور" onClick={onClose}>×</button>}</div></div>
    <div className="rebar-live-score"><div><span>عبور سنگدانه</span><strong>{passing}/100</strong></div><div><span>گلوگاه</span><strong>{governing.toFixed(0)} mm</strong></div><div><span>Dmax نماینده</span><strong>{dmax.toFixed(1)} mm</strong></div></div>
    <div className={`rebar-bridge-summary ${bridge.level}`}><div><span>ریسک پل‌زدگی</span><b>{bridge.score}/100</b></div><small>{bridge.candidateSharePercent}٪ ذرات درشت در محدوده حساس • {bridge.criticalSharePercent}٪ بحرانی</small><p>{bridge.messageFa}</p></div>

    <section className="rebar-control-section">
      <div className="rebar-section-title"><b>هندسه اصلی</b><span>پارامترهای مؤثر بر فاصله آزاد</span></div>
      <div className="rebar-live-grid">
        <label><span>قطر میلگرد X</span><input type="number" min="1" value={network.x.barDiameterMm} onChange={e=>updateDir('x','barDiameterMm',Number(e.target.value))}/><i>mm</i></label>
        <label><span>فاصله محور X</span><input type="number" min="1" value={network.x.centerSpacingMm} onChange={e=>updateDir('x','centerSpacingMm',Number(e.target.value))}/><i>mm</i></label>
        <label><span>قطر میلگرد Y</span><input type="number" min="1" value={network.y.barDiameterMm} onChange={e=>updateDir('y','barDiameterMm',Number(e.target.value))}/><i>mm</i></label>
        <label><span>فاصله محور Y</span><input type="number" min="1" value={network.y.centerSpacingMm} onChange={e=>updateDir('y','centerSpacingMm',Number(e.target.value))}/><i>mm</i></label>
        <label><span>تعداد شبکه ارتفاعی</span><input type="number" min="2" max="8" value={Math.max(2,network.layers)} onChange={e=>commit({...network,layers:Math.max(2,Math.min(8,Number(e.target.value)))})}/><i>لایه</i></label>
        <label><span>فاصله خالص لایه‌ها</span><input type="number" min="1" value={network.clearLayerSpacingMm} onChange={e=>commit({...network,clearLayerSpacingMm:Math.max(1,Number(e.target.value))})}/><i>mm</i></label>
        <label><span>کاور بتن</span><input type="number" min="15" max="200" value={network.coverMm} onChange={e=>commit({...network,coverMm:Math.max(15,Math.min(200,Number(e.target.value)))})}/><i>mm</i></label>
        <label><span>قطر سر ویبراتور</span><input type="number" min="1" value={network.vibratorHeadDiameterMm} onChange={e=>commit({...network,vibratorHeadDiameterMm:Math.max(1,Number(e.target.value))})}/><i>mm</i></label>
      </div>
    </section>

    <details className="rebar-advanced" open>
      <summary><span><b>شبکه داخلی سه‌بعدی</b><small>تراکم واقعی‌تر داخل حجم بتن</small></span><i>تنظیمات پیشرفته</i></summary>
      <div className="rebar-toggle-row">
        <label className="rebar-switch"><input type="checkbox" checked={network.internalGrid!==false} onChange={e=>commit({...network,internalGrid:e.target.checked})}/><span>نمایش میلگردهای داخلی</span></label>
        <label className="rebar-switch"><input type="checkbox" checked={network.internalTies!==false} onChange={e=>commit({...network,internalTies:e.target.checked})}/><span>نمایش اتصالات داخلی</span></label>
      </div>
      <div className="rebar-live-grid single-row">
        <label><span>فاصله میلگردهای قائم داخلی</span><input type="number" min="80" max="600" step="10" value={network.interiorVerticalSpacingMm??300} onChange={e=>commit({...network,interiorVerticalSpacingMm:Math.max(80,Math.min(600,Number(e.target.value)))})}/><i>mm</i></label>
      </div>
      <p className="rebar-advanced-note">شبکه داخلی اکنون در کل حجم عضو نمایش داده می‌شود؛ بنابراین ذرات و Heatmap نسبت به قفس داخلی قابل مشاهده‌اند، نه فقط قاب پیرامونی.</p>
    </details>

    <p>{ratio<1.25?'گلوگاه به اندازه سنگدانه درشت نزدیک است؛ احتمال پل‌زدگی و محدودیت عبور بالاست.':ratio<1.8?'عبور ممکن است، اما شبکه متراکم است و اجرای تراکم باید کنترل شود.':'فضای عبور هندسی نسبت به Dmax نماینده مناسب ارزیابی می‌شود.'}</p>
    <small className="rebar-live-note">سناریوی آرماتور ذخیره می‌شود و همان سناریو در گزارش‌ها و رتبه‌بندی اجرا استفاده خواهد شد. تحلیل پل‌زدگی Heuristic داخلی TOLUE است و جایگزین کنترل سازه‌ای یا مدل DEM نیست.</small>
  </div>;
}
