// Presentational risk card — the product's core visual. Used as the hero mock on
// the landing page; the real dashboard can adopt the same component for a
// consistent look. Pure (no client state).

export type Bucket = 'GREEN' | 'AMBER' | 'RED';

export interface RiskSignalView {
  severity: string;
  explanation: string;
  contribution?: number; // 0..1
}

const BUCKET = {
  GREEN: { ring: 'ring-green-200', bar: 'bg-green-500', chip: 'bg-green-100 text-green-800', label: 'Healthy' },
  AMBER: { ring: 'ring-amber-200', bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800', label: 'At risk' },
  RED: { ring: 'ring-red-200', bar: 'bg-red-500', chip: 'bg-red-100 text-red-800', label: 'Critical' },
} as const;

export function RiskScoreCard({
  displayName,
  externalId,
  score,
  bucket,
  signals = [],
  className = '',
}: {
  displayName: string;
  externalId?: string;
  score: number;
  bucket: Bucket;
  signals?: RiskSignalView[];
  className?: string;
}) {
  const b = BUCKET[bucket];
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ${b.ring} ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{displayName}</p>
          {externalId && <p className="text-xs text-gray-400">{externalId}</p>}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.chip}`}>{b.label}</span>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <span className="text-4xl font-bold tabular-nums text-gray-900">{Math.round(score)}</span>
        <span className="pb-1 text-sm text-gray-400">/ 100 risk</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${b.bar}`} style={{ width: `${Math.min(100, Math.max(2, score))}%` }} />
      </div>

      {signals.length > 0 && (
        <ul className="mt-4 space-y-2">
          {signals.map((s) => (
            <li key={s.explanation} className="flex items-start gap-2 text-sm">
              <span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${b.chip}`}>{s.severity}</span>
              <span className="text-gray-600">{s.explanation}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
