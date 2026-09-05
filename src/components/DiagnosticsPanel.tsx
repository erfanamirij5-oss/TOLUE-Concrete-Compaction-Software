import type { DiagnosticSummary } from '../engineering/diagnostics';

interface Props {
  title: string;
  summary: DiagnosticSummary;
  compact?: boolean;
}

export function DiagnosticsPanel({ title, summary, compact = false }: Props) {
  const visibleItems = compact ? summary.items.slice(0, 3) : summary.items;
  const status = summary.critical > 0 ? 'بحرانی' : summary.warnings > 0 ? 'نیازمند بررسی' : 'مناسب';
  const severityFa = (severity: string) => severity === 'critical' ? 'بحرانی' : severity === 'warning' ? 'هشدار' : 'اطلاع';

  return (
    <section className={`diagnostics-panel ${compact ? 'compact' : ''}`} dir="rtl">
      <div className="diagnostics-head">
        <div><span>{title}</span><b>{status}</b></div>
        <strong>{summary.score}/100</strong>
      </div>
      <div className="diagnostics-list">
        {visibleItems.length === 0 ? (
          <div className="diagnostic-empty">در مجموعه قواعد فعلی هیچ هشدار مهندسی فعالی وجود ندارد.</div>
        ) : visibleItems.map((item) => (
          <article className={`diagnostic-item severity-${item.severity}`} key={item.id}>
            <div className="diagnostic-title"><span>{severityFa(item.severity)}</span><b>{item.title}</b></div>
            <p>{item.observation}</p>
            {!compact && <>
              <dl>
                <div><dt>پیامد</dt><dd>{item.consequence}</dd></div>
                <div><dt>علت محتمل</dt><dd>{item.cause}</dd></div>
                <div><dt>اقدام پیشنهادی</dt><dd>{item.recommendation}</dd></div>
              </dl>
              <div className="diagnostic-evidence">{item.evidence.map((e) => <span key={e}>{e}</span>)}</div>
            </>}
          </article>
        ))}
      </div>
    </section>
  );
}
