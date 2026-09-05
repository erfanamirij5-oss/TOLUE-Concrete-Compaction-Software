import { useMemo } from 'react';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { analyzeCombinedGradation } from '../engineering/combinedGradation';

interface Props { mix: MixDesign; analysis: MixAnalysis; }

export function CombinedGradationMini({ mix, analysis }: Props) {
  const result = useMemo(() => analyzeCombinedGradation(mix, analysis), [mix, analysis]);
  const points = result.points;
  const maxSieve = points[0]?.sieveMm ?? 25;
  const minSieve = points[points.length - 1]?.sieveMm ?? 0.075;
  const width = 250, height = 112, px = 22, py = 15;
  const xOf = (s:number) => px + ((Math.log(s)-Math.log(minSieve))/Math.max(1e-9,Math.log(maxSieve)-Math.log(minSieve))) * (width-px*2);
  const yOf = (p:number) => py + (1-p/100)*(height-py*2);
  const line = points.map(p=>`${xOf(p.sieveMm).toFixed(1)},${yOf(p.passingPercent).toFixed(1)}`).join(' ');
  return <div className="combined-mini" dir="rtl">
    <div className="combined-mini-head"><div><b>منحنی دانه‌بندی کل</b><span>ترکیب حجمی ماسه + نخودی + بادامی</span></div><strong>{result.continuityScore}</strong></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="منحنی دانه‌بندی کل">
      {[0,50,100].map(v=><g key={v}><line x1={px} x2={width-px} y1={yOf(v)} y2={yOf(v)} className="combined-mini-grid"/><text x="3" y={yOf(v)+3}>{v}</text></g>)}
      <polyline points={line} className="combined-mini-line"/>
      {points.map(p=><circle key={p.sieveMm} cx={xOf(p.sieveMm)} cy={yOf(p.passingPercent)} r="2.4" className="combined-mini-point"/>)}
    </svg>
    <div className="combined-mini-foot"><span>{result.valid?'منحنی مرکب معتبر':'داده ناکافی'}</span><b>{result.gaps.length} بازه نیازمند بررسی</b></div>
  </div>;
}
