export default function GlassScore(props: { score: number; label?: string; caption?: string }) {
  const { score, label = 'UrunFit Index', caption } = props
  const clamped = Math.max(0, Math.min(100, score))
  const size = 164
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * (clamped / 100)
  const gap = c - dash
  const gradId = 'df-grad'
  return (
    <div className="relative grid place-items-center rounded-2xl border border-ink-300/60 bg-white/80 p-6 shadow-subtle backdrop-blur">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2e8cff" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e6efff"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 600ms ease' }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-4xl font-semibold text-ink-900">{clamped}</div>
        <div className="mt-1 text-xs text-ink-500">{label}</div>
        {caption ? <div className="mt-1 text-[11px] text-ink-500/80">{caption}</div> : null}
      </div>
    </div>
  )
}


