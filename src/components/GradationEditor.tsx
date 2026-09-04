import { useMemo, useState } from 'react';
import type { AggregateMaterialKey, GradationCurve, MixDesign } from '../domain/mixDesign';
import { analyzeMix } from '../engineering/analyzeMix';
import { analyzeCombinedGradation } from '../engineering/combinedGradation';
import { evaluateEffectiveCompaction } from '../engineering/effectiveCompaction';
import { analyzeGradation } from '../engineering/gradation';
import { generatePacking } from '../engineering/packing';
import { CombinedGradationPanel } from './CombinedGradationPanel';
import { EffectiveCompactionPanel } from './EffectiveCompactionPanel';

interface Props { mix: MixDesign; onChange: (mix: MixDesign) => void; onClose: () => void; }

const TAB_LABELS: Record<AggregateMaterialKey, string> = {
  sand: 'ماسه ۰–۴٫۷۵',
  aggregate5to12: 'نخودی ۴٫۷۵–۱۲',
  aggregate12to25: 'بادامی ۱۲–۲۵',
};

export function GradationEditor({ mix, onChange, onClose }: Props) {
  const [activeKey, setActiveKey] = useState<AggregateMaterialKey>('sand');
  const curve = mix.gradations.find((item) => item.materialKey === activeKey) ?? mix.gradations[0];
  const analysis = useMemo(() => analyzeGradation(curve), [curve]);
  const mixAnalysis = useMemo(() => analyzeMix(mix), [mix]);
  const combined = useMemo(() => analyzeCombinedGradation(mix, mixAnalysis), [mix, mixAnalysis]);
  const packing = useMemo(() => generatePacking(mix, mixAnalysis, 20260905), [mix, mixAnalysis]);
  const effectiveCompaction = useMemo(() => evaluateEffectiveCompaction(mixAnalysis, packing, combined), [mixAnalysis, packing, combined]);

  const updateCurve = (nextCurve: GradationCurve) => onChange({ ...mix, gradations: mix.gradations.map((item) => item.materialKey === nextCurve.materialKey ? nextCurve : item) });
  const updatePoint = (index: number, field: 'sieveMm' | 'passingPercent', value: number) => updateCurve({ ...curve, points: curve.points.map((point, pointIndex) => pointIndex === index ? { ...point, [field]: value } : point) });
  const addPoint = () => {
    const last = curve.points[curve.points.length - 1];
    updateCurve({ ...curve, points: [...curve.points, { sieveMm: Math.max(0.01, (last?.sieveMm ?? 1) / 2), passingPercent: 0 }] });
  };
  const removePoint = (index: number) => {
    if (curve.points.length <= 2) return;
    updateCurve({ ...curve, points: curve.points.filter((_, pointIndex) => pointIndex !== index) });
  };

  return <div className="editor-overlay gradation-editor">
    <div className="editor-header"><div><b>موتور دانه‌بندی</b><span>ورودی PSD، دانه‌بندی مرکب و تحلیل پیوستگی</span></div><button onClick={onClose}>×</button></div>
    <div className="gradation-tabs">{mix.gradations.map((item) => <button key={item.materialKey} className={item.materialKey === activeKey ? 'active' : ''} onClick={() => setActiveKey(item.materialKey)}>{TAB_LABELS[item.materialKey]}</button>)}</div>
    <div className="gradation-summary">
      <div><span>وضعیت منحنی</span><b className={analysis.valid ? 'ok' : 'warn'}>{analysis.valid ? 'معتبر' : 'نیازمند بررسی'}</b></div>
      <div><span>D50</span><b>{analysis.d50 ? `${analysis.d50.toFixed(2)} mm` : '—'}</b></div>
      <div><span>Cu</span><b>{analysis.cu ? analysis.cu.toFixed(2) : '—'}</b></div>
      <div><span>Cc</span><b>{analysis.cc ? analysis.cc.toFixed(2) : '—'}</b></div>
      <div><span>مدول نرمی</span><b>{analysis.finenessModulus ? analysis.finenessModulus.toFixed(2) : '—'}</b></div>
    </div>
    <div className="gradation-table-wrap"><table className="gradation-table"><thead><tr><th>الک (mm)</th><th>درصد عبوری</th><th>مانده در بازه</th><th /></tr></thead><tbody>{curve.points.map((point, index) => {
      const retained = index < curve.points.length - 1 ? point.passingPercent - curve.points[index + 1].passingPercent : null;
      return <tr key={`${point.sieveMm}-${index}`}><td><input type="number" step="0.01" value={point.sieveMm} onChange={(event) => updatePoint(index, 'sieveMm', Number(event.target.value))} /></td><td><input type="number" min="0" max="100" step="0.1" value={point.passingPercent} onChange={(event) => updatePoint(index, 'passingPercent', Number(event.target.value))} /></td><td>{retained === null ? '—' : `${retained.toFixed(1)}٪`}</td><td><button className="mini-danger" onClick={() => removePoint(index)}>−</button></td></tr>;
    })}</tbody></table></div>
    {!analysis.valid && <div className="gradation-errors">{analysis.errors.map((error) => <div key={error}>• {error}</div>)}</div>}
    <CombinedGradationPanel mix={mix} analysis={mixAnalysis} />
    <EffectiveCompactionPanel result={effectiveCompaction} />
    <div className="editor-actions"><button onClick={addPoint}>+ افزودن الک</button><button className="primary-action" onClick={onClose}>اعمال دانه‌بندی</button></div>
  </div>;
}
