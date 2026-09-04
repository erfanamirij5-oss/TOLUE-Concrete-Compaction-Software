import type { MixAnalysis, MixDesign } from '../domain/mixDesign';
import type { ViewControls } from '../domain/viewControls';
import type { CompactionState } from '../engineering/compaction';
import type { ComparisonMetric } from '../engineering/comparison';
import type { PackingResult } from '../engineering/packing';
import { ConcreteCube } from './ConcreteCube';

interface Props {
  mixA: MixDesign;
  mixB: MixDesign;
  analysisA: MixAnalysis;
  analysisB: MixAnalysis;
  packingA: PackingResult;
  packingB: PackingResult;
  compactionA: CompactionState;
  compactionB: CompactionState;
  view: ViewControls;
  metrics: ComparisonMetric[];
}

export function CompareMode(props: Props) {
  return (
    <div className="compare-mode">
      <div className="compare-cubes">
        <section className="compare-card">
          <div className="compare-head"><span>MIX A</span><b>{props.mixA.name}</b></div>
          <ConcreteCube analysis={props.analysisA} packing={props.packingA} compaction={props.compactionA} view={props.view} />
        </section>
        <section className="compare-card">
          <div className="compare-head"><span>MIX B</span><b>{props.mixB.name}</b></div>
          <ConcreteCube analysis={props.analysisB} packing={props.packingB} compaction={props.compactionB} view={props.view} />
        </section>
      </div>
      <div className="compare-table">
        <div className="compare-row compare-header"><span>Metric</span><span>Mix A</span><span>Mix B</span><span>Δ B−A</span></div>
        {props.metrics.map((metric) => {
          const preferred = metric.preference === 'higher' ? metric.delta > 0 : metric.preference === 'lower' ? metric.delta < 0 : false;
          return (
            <div className="compare-row" key={metric.key}>
              <span>{metric.label}</span>
              <b>{metric.a.toFixed(metric.unit === '%' ? 1 : 3)} {metric.unit}</b>
              <b>{metric.b.toFixed(metric.unit === '%' ? 1 : 3)} {metric.unit}</b>
              <b className={metric.preference === 'neutral' ? '' : preferred ? 'compare-good' : 'compare-warn'}>{metric.delta >= 0 ? '+' : ''}{metric.delta.toFixed(metric.unit === '%' ? 1 : 3)} {metric.unit}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}
