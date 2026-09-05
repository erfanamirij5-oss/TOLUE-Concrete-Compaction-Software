import type { MixDesign, MaterialKey } from '../domain/mixDesign';

interface Props {
  mix: MixDesign;
  onChange: (mix: MixDesign) => void;
  onClose: () => void;
}

export function MixDesignEditor({ mix, onChange, onClose }: Props) {
  const updateMaterial = (key: MaterialKey, field: 'massKgPerM3' | 'densityKgPerM3', value: number) => {
    onChange({
      ...mix,
      materials: mix.materials.map((material) =>
        material.key === key ? { ...material, [field]: Number.isFinite(value) ? value : 0 } : material,
      ),
    });
  };

  return (
    <div className="mix-editor" dir="rtl">
      <div className="editor-heading">
        <div>
          <span className="eyebrow">ورودی طرح اختلاط</span>
          <h2>{mix.name}</h2>
        </div>
        <div className="mix-editor-tools">
          <label className="air-input">
            <span>هوای هدف ٪</span>
            <input
              type="number"
              min="0"
              max="20"
              step="0.1"
              value={mix.targetAirPercent}
              onChange={(event) => onChange({ ...mix, targetAirPercent: Number(event.target.value) })}
            />
          </label>
          <button className="panel-close" type="button" aria-label="بستن پنجره" title="بستن" onClick={onClose}>×</button>
        </div>
      </div>

      <div className="material-table">
        <div className="material-row material-header">
          <span>مصالح</span><span>مقدار kg/m³</span><span>چگالی kg/m³</span>
        </div>
        {mix.materials.map((material) => (
          <div className="material-row" key={material.key}>
            <span className="material-name"><i style={{ background: material.color }} />{material.label}</span>
            <input
              type="number"
              min="0"
              step="1"
              value={material.massKgPerM3}
              onChange={(event) => updateMaterial(material.key, 'massKgPerM3', Number(event.target.value))}
            />
            <input
              type="number"
              min="1"
              step="10"
              value={material.densityKgPerM3}
              onChange={(event) => updateMaterial(material.key, 'densityKgPerM3', Number(event.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
