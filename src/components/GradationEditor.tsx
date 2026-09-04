import { useMemo, useState } from 'react';
import type { AggregateMaterialKey, GradationCurve, MixDesign } from '../domain/mixDesign';
import { analyzeGradation } from '../engineering/gradation';

interface Props {
  mix: MixDesign;
  onChange: (mix: MixDesign) => void;
  onClose: () => void;
}

export function GradationEditor({ mix, onChange, onClose }: Props) {
  const [activeKey, setActiveKey] = useState<AggregateMaterialKey>('sand');
  const curve = mix.gradations.find((item) => item.materialKey === activeKey) ?? mix.gradations[0];
  const analysis = useMemo(() => analyzeGradation(curve), [curve]);

  const updateCurve = (nextCurve: GradationCurve) => {
    onChange({
      ...mix,
      gradations: mix.gradations.map((item) => item.materialKey === nextCurve.materialKey ? nextCurve : item),
    });
  };

  const updatePoint = (index: number, field: 'sieveMm' | 'passingPercent', value: number) => {
    updateCurve({
      ...curve,
      points: curve.points.map((point, pointIndex) => pointIndex === index ? { ...point, [field]: value } : point),
    });
  };

  const addPoint = () => {
    const last = curve.points.at(-1);
    updateCurve({ ...curve, points: [...curve.points, { sieveMm: Math.max(0.01, (last?.sieveMm ?? 1) / 2), passingPercent: 0 }] });
  };

  const removePoint = (index: number) => {
    if (curve.points.length <= 2) return;
    updateCurve({ ...curve, points: curve.points.filter((_, pointIndex) => pointIndex !== index) });
  };

  return (
    <div className="editor-overlay gradation-editor">
      <div className="editor-header">
        <div><b>GRADATION ENGINE</b><span>Particle-size distribution input</span></div>
        <button onClick={onClose}>×</button>
      </div>

      <div className="gradation-tabs">
        {mix.gradations.map((item) => (
          <button key={item.materialKey} className={item.materialKey === activeKey ? 'active' : ''} onClick={() => setActiveKey(item.materialKey)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="gradation-summary">
        <div><span>Status</span><b className={analysis.valid ? 'ok' : 'warn'}>{analysis.valid ? 'VALID' : 'CHECK CURVE'}</b></div>
        <div><span>D50</span><b>{analysis.d50 ? `${analysis.d50.toFixed(2)} mm` : '—'}</b></div>
        <div><span>Cu</span><b>{analysis.cu ? analysis.cu.toFixed(2) : '—'}</b></div>
        <div><span>Cc</span><b>{analysis.cc ? analysis.cc.toFixed(2) : '—'}</b></div>
        <div><span>FM</span><b>{analysis.finenessModulus ? analysis.finenessModulus.toFixed(2) : '—'}</b></div>
      </div>

      <div className="gradation-table-wrap">
        <table className="gradation-table">
          <thead><tr><th>Sieve (mm)</th><th>Passing (%)</th><th>Retained interval</th><th /></tr></thead>
          <tbody>
            {curve.points.map((point, index) => {
              const retained = index < curve.points.length - 1 ? point.passingPercent - curve.points[index + 1].passingPercent : null;
              return (
                <tr key={`${point.sieveMm}-${index}`}>
                  <td><input type="number" step="0.01" value={point.sieveMm} onChange={(e) => updatePoint(index, 'sieveMm', Number(e.target.value))} /></td>
                  <td><input type="number" min="0" max="100" step="0.1" value={point.passingPercent} onChange={(e) => updatePoint(index, 'passingPercent', Number(e.target.value))} /></td>
                  <td>{retained === null ? '—' : `${retained.toFixed(1)} %`}</td>
                  <td><button className="mini-danger" onClick={() => removePoint(index)}>−</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!analysis.valid && <div className="gradation-errors">{analysis.errors.map((error) => <div key={error}>• {error}</div>)}</div>}
      <div className="editor-actions"><button onClick={addPoint}>+ Add sieve</button><button className="primary-action" onClick={onClose}>Apply gradation</button></div>
    </div>
  );
}
