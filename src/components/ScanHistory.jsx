import { useNavigate } from 'react-router-dom'
import { useScans } from '../hooks/useScans.js'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmt(val, dec = 1) {
  if (val == null) return '—'
  return typeof val === 'number' ? val.toFixed(dec) : val
}

function ChangeChip({ current, previous, unit = '', better = 'down' }) {
  if (current == null || previous == null) return null
  const diff = current - previous
  if (Math.abs(diff) < 0.05) return null
  const isPositive = diff > 0
  const isImprovement = better === 'up' ? isPositive : !isPositive
  const color = isImprovement ? '#22c55e' : '#ef4444'
  const prefix = isPositive ? '+' : ''
  return (
    <span
      className="text-xs font-medium px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {prefix}{diff.toFixed(1)}{unit}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div className="rounded-xl p-4 animate-pulse flex items-center gap-4" style={{ backgroundColor: '#111128' }}>
      <div className="flex-1 space-y-2">
        <div className="h-3 w-20 rounded" style={{ backgroundColor: '#1e1e3a' }} />
        <div className="h-6 w-16 rounded" style={{ backgroundColor: '#1e1e3a' }} />
        <div className="h-3 w-32 rounded" style={{ backgroundColor: '#1e1e3a' }} />
      </div>
      <div className="h-5 w-5 rounded" style={{ backgroundColor: '#1e1e3a' }} />
    </div>
  )
}

export default function ScanHistory() {
  const { scans, loading, error } = useScans()
  const navigate = useNavigate()

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Scan History</h1>
        {!loading && (
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            {scans.length === 0
              ? 'No scans recorded yet'
              : `${scans.length} scan${scans.length !== 1 ? 's' : ''} total`}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl p-4" style={{ backgroundColor: '#1a0a0a', border: '1px solid #ef4444' }}>
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      {!loading && scans.length === 0 && !error && (
        <div
          className="rounded-xl p-8 text-center space-y-4"
          style={{ backgroundColor: '#111128', border: '1px dashed #2e2e5a' }}
        >
          <div className="text-4xl">📋</div>
          <p className="font-semibold text-lg" style={{ color: '#f1f5f9' }}>No scans yet</p>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Upload your first InBody scan to start tracking.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: '#6366f1', color: '#fff' }}
          >
            Upload Scan
          </button>
        </div>
      )}

      {!loading && scans.length > 0 && (
        <div className="space-y-3">
          {scans.map((scan, idx) => {
            const next = scans[idx + 1] // older scan (scans sorted newest first)
            return (
              <button
                key={scan.id}
                onClick={() => navigate(`/scan/${scan.id}`)}
                className="w-full rounded-xl p-4 text-left"
                style={{
                  backgroundColor: '#111128',
                  border: '1px solid #1e1e3a',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Date */}
                    <p className="text-xs" style={{ color: '#64748b' }}>
                      {formatDate(scan.date)}
                    </p>

                    {/* Weight */}
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
                        {fmt(scan.weight)}
                      </span>
                      <span className="text-sm" style={{ color: '#94a3b8' }}>lbs</span>
                      <ChangeChip
                        current={scan.weight}
                        previous={next?.weight}
                        unit=" lbs"
                        better="down"
                      />
                    </div>

                    {/* Metric row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {scan.skeletalMuscleMass != null && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: '#64748b' }}>Muscle</span>
                          <span className="text-xs font-semibold" style={{ color: '#10b981' }}>
                            {fmt(scan.skeletalMuscleMass)} lbs
                          </span>
                        </div>
                      )}
                      {scan.bodyFatPercentage != null && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: '#64748b' }}>Fat%</span>
                          <span className="text-xs font-semibold" style={{ color: '#f97316' }}>
                            {fmt(scan.bodyFatPercentage)}%
                          </span>
                        </div>
                      )}
                      {scan.bmi != null && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: '#64748b' }}>BMI</span>
                          <span className="text-xs font-semibold" style={{ color: '#06b6d4' }}>
                            {fmt(scan.bmi)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 mt-2">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
