import type { EffectiveCompactionResult } from '../engineering/effectiveCompaction';

interface Props { result: EffectiveCompactionResult; compact?: boolean; }

export function EffectiveCompactionPanel({ result, compact = false }: Props) {
  return <section className={`effective-compaction ${result.level} ${compact ? 'compact' : ''}`}>
    <div className="effective-head">
      <div><span>ارزیابی اثربخشی تراکم</span><b>{result.labelFa}</b><small>مدل مهندسی داخلی TOLUE • غیر استاندارد رسمی</small></div>
      <strong>{result.score}</strong>
    </div>
    <div className="effective-grid">
      <div><span>پتانسیل طرح</span><b>{result.designPotentialScore}</b></div>
      <div><span>کیفیت Packing</span><b>{result.packingQualityScore}</b></div>
      <div><span>پشتیبانی دانه‌بندی</span><b>{result.gradationSupportScore}</b></div>
      <div><span>پرشدن فضای خالی</span><b>{result.voidFillingSupportScore}</b></div>
      <div><span>پشتیبانی خمیر</span><b>{result.pasteSupportScore}</b></div>
      <div><span>تحقق اجرای تراکم</span><b>{result.executionRealizationScore}</b></div>
    </div>
    {!compact && <div className="effective-notes">
      {result.reasonsFa.map((item) => <p className="positive" key={item}>✓ {item}</p>)}
      {result.cautionsFa.map((item) => <p className="caution" key={item}>! {item}</p>)}
    </div>}
  </section>;
}
