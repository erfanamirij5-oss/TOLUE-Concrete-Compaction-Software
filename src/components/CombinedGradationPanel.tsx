import { useMemo } from 'react';
import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import { analyzeCombinedGradation } from '../engineering/combinedGradation';

interface Props {
  mix: MixDesign;
  analysis: MixAnalysis;
}

export function CombinedGradationPanel({ mix, analysis }: Props) {
  const result = useMemo(() => analyzeCombinedGradation(mix, analysis), [mix, analysis]);
  const maxSieve = result.points[0]?.sieveMm ?? 1;
  const minSieve = result.points[result.points.length - 1]?.sieveMm ?? 0.075;
  const width = 420;
  const height = 190;
  const padX = 34;
  const padY = 20;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;
  const xOf = (sieveMm: number) => {
    const maxLog = Math.log(maxSieve);
    const minLog = Math.log(minSieve);
    const t = (Math.log(sieveMm) - minLog) / Math.max(1e-9, maxLog - minLog);
    return padX + t * plotW;
  };
  const yOf = (passing: number) => padY + (1 - passing / 100) * plotH;
  const polyline = result.points.map((point) => `${xOf(point.sieveMm).toFixed(1)},${yOf(point.passingPercent).toFixed(1)}`).join(' ');

  return <section className="combined-gradation-panel">
    <div className="combined-head">
      <div><b>دانه‌بندی مرکب سنگدانه‌ها</b><span>{result.basisLabelFa}</span></div>
      <strong className={result.continuityScore >= 78 ? 'ok' : result.continuityScore >= 55 ? 'warn' : 'risk'}>{result.continuityScore}</strong>
    </div>

    <div className="combined-shares">
      {result.shares.map((share) => <div key={share.materialKey}><span>{share.labelFa}</span><b>{share.sharePercent.toFixed(1)}٪</b><small>{share.absoluteVolumeM3.toFixed(3)} m³</small></div>)}
    </div>

    <div className="combined-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="نمودار دانه‌بندی مرکب">
        {[0, 25, 50, 75, 100].map((value) => <g key={value}><line x1={padX} x2={width - padX} y1={yOf(value)} y2={yOf(value)} className="combined-grid"/><text x={8} y={yOf(value) + 3}>{value}</text></g>)}
        {result.points.map((point) => <line key={`x-${point.sieveMm}`} x1={xOf(point.sieveMm)} x2={xOf(point.sieveMm)} y1={padY} y2={height - padY} className="combined-grid minor"/>)}
        <polyline points={polyline} className="combined-line" />
        {result.points.map((point) => <g key={point.sieveMm}><circle cx={xOf(point.sieveMm)} cy={yOf(point.passingPercent)} r="3.5" className="combined-point"/><text x={xOf(point.sieveMm)} y={height - 4} textAnchor="middle">{point.sieveMm}</text></g>)}
      </svg>
    </div>

    <div className="combined-summary"><span>روش تحلیل</span><b>TOLUE Combined Gradation v1</b><small>مبنای حجمی • Gap Analysis داخلی • غیر استاندارد رسمی</small></div>

    {result.gaps.length > 0 ? <div className="combined-gaps"><b>بازه‌های نیازمند بررسی</b>{result.gaps.map((gap, index) => <div className={gap.severity} key={`${gap.upperSieveMm}-${gap.lowerSieveMm}-${index}`}><span>{gap.lowerSieveMm}–{gap.upperSieveMm} mm</span><strong>{gap.retainedPercent.toFixed(1)}٪ retained</strong><small>{gap.messageFa}</small></div>)}</div> : <div className="combined-no-gap">در مدل داخلی فعلی، Gap برجسته‌ای در منحنی مرکب شناسایی نشد.</div>}

    {result.warningsFa.map((warning) => <div className="combined-warning" key={warning}>{warning}</div>)}
  </section>;
}
