import type { DiagnosticSummary } from '../engineering/diagnostics';

interface Props {
  title: string;
  summary: DiagnosticSummary;
  compact?: boolean;
}

export function DiagnosticsPanel({ title, summary, compact = false }: Props) {
  const visibleItems = compact ? summary.items.slice(0, 3) : summary.items;
  const status = summary.critical > 0 ? 'CRITICAL' : summary.warnings > 0 ? 'REVIEW' : 'GOOD';

  return (
    <section className={`diagnostics-panel ${compact ? 'compact' : ''}`}>
      <div className="diagnostics-head">
        <div><span>{title}</span><b>{status}</b></div>
        <strong>{summary.score}/100</strong>
      </div>
      <div className="diagnostics-list">
        {visibleItems.length === 0 ? (
          <div className="diagnostic-empty">No active heuristic warnings in the current rule set.</div>
        ) : visibleItems.map((item) => (
          <article className={`diagnostic-item severity-${item.severity}`} key={item.id}>
            <div className="diagnostic-title"><span>{item.severity.toUpperCase()}</span><b>{item.title}</b></div>
            <p>{item.observation}</p>
            {!compact && <>
              <dl>
                <div><dt>Consequence</dt><dd>{item.consequence}</dd></div>
                <div><dt>Likely cause</dt><dd>{item.cause}</dd></div>
                <div><dt>Recommended action</dt><dd>{item.recommendation}</dd></div>
              </dl>
              <div className="diagnostic-evidence">{item.evidence.map((e) => <span key={e}>{e}</span>)}</div>
            </>}
          </article>
        ))}
      </div>
    </section>
  );
}
