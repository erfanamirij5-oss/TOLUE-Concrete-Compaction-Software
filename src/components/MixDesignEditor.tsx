import type { MixDesign, MaterialKey } from '../domain/mixDesign';

interface Props {
  mix: MixDesign;
  onChange: (mix: MixDesign) => void;
}

export function MixDesignEditor({ mix, onChange }: Props) {
  const updateMaterial = (key: MaterialKey, field: 'massKgPerM3' | 'densityKgPerM3', value: number) => {
    onChange({
      ...mix,
      materials: mix.materials.map((material) =>
        material.key === key ? { ...material, [field]: Number.isFinite(value) ? value : 0 } : material,
      ),
    });
  };

  return (
    <div className="mix-editor">
      <div className="editor-heading">
        <div>
          <span className="eyebrow">MIX DESIGN INPUT</span>
          <h2>{mix.name}</h2>
        </div>
        <label className="air-input">
          <span>Target air %</span>
          <input
            type="number"
            min="0"
            max="20"
            step="0.1"
            value={mix.targetAirPercent}
            onChange={(event) => onChange({ ...mix, targetAirPercent: Number(event.target.value) })}
          />
        </label>
      </div>

      <div className="material-table">
        <div className="material-row material-header">
          <span>Material</span><span>kg/m³</span><span>Density kg/m³</span>
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
