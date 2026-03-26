import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScans } from '../hooks/useScans.js'
import MetricChart from './MetricChart.jsx'
import AIAnalysisCard from './AIAnalysisCard.jsx'

const METRIC_CONFIG = [
  { key: 'weight', label: 'Weight', unit: ' kg', color: '#6366f1' },
  { key: 'skeletalMuscleMass', label: 'Muscle Mass', unit: ' kg', color: '#10b981' },
  { key: 'bodyFatMass', label: 'Body Fat Mass', unit: ' kg', color: '#f43f5e' },
  { key: 'bodyFatPercentage', label: 'Body Fat %', unit: '%', color: '#f97316' },
  { key: 'bmi', label: 'BMI', unit: '', color: '#06b6d4' },
  { key: 'visceralFatLevel', label: 'Visceral Fat', unit: '', color: '#f59e0b' },
  { key: 'bmr', label: 'BMR', unit: ' kcal', color: '#8b5cf6' },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function fmt(val, dec = 1) {
  if (val == null || val === undefined) return '—'
  return typeof val === 'number' ? val.toFixed(dec) : val
}

function ChangeIndicator({ current, previous }) {
  if (current == null || previous == null) return null
  const diff = current - previous
  const isImproved = diff > 0
  const color = isImproved ? '#22c55e' : '#ef4444'
  const arrow = isImproved ? '▲' : '▼'
  return (
    <span className="text-xs ml-1" style={{ color }}>
      {arrow} {Math.abs(diff).toFixed(1)}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}>
      <div className="h-4 w-24 rounded" style={{ backgroundColor: '#1e1e3a' }} />
      <div className="h-10 w-16 rounded mt-3" style={{ backgroundColor: '#1e1e3a' }} />
      <div className="grid grid-cols-2 gap-3 mt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded" style={{ backgroundColor: '#1e1e3a' }} />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { scans, loading, error } = useScans()
  const navigate = useNavigate()
  const [showAnalysis, setShowAnalysis] = useState(false)

  const latestScan = scans[0] ?? null
  const previousScan = scans[1] ?? null

  // Build chart data (ascending order)
  const chartScans = [...scans].reverse()

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-40 rounded animate-pulse" style={{ backgroundColor: '#1e1e3a' }} />
        <SkeletonCard />
        <div className="h-6 w-36 rounded animate-pulse" style={{ backgroundColor: '#1e1e3a' }} />
        <div className="h-48 rounded-xl animate-pulse" style={{ backgroundColor: '#111128' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-xl p-4" style={{ backgroundColor: '#1a0a0a', border: '1px solid #ef4444' }}>
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>InBody Tracker</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          {scans.length === 0
            ? 'Upload your first scan to get started'
            : `${scans.length} scan${scans.length !== 1 ? 's' : ''} recorded`}
        </p>
      </div>

      {/* Empty State */}
      {scans.length === 0 && (
        <div
          className="rounded-xl p-6 text-center space-y-4"
          style={{ backgroundColor: '#111128', border: '1px dashed #2e2e5a' }}
        >
          <div className="text-4xl">📊</div>
          <p className="font-semibold text-lg" style={{ color: '#f1f5f9' }}>
            No scans yet
          </p>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Upload your InBody scan results to start tracking your body composition progress.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="w-full py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: '#6366f1', color: '#fff' }}
          >
            Upload First Scan
          </button>
        </div>
      )}

      {/* Latest Scan Card */}
      {latestScan && (
        <div
          className="rounded-xl p-4 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2a 100%)',
            border: '1px solid #2e2e5a',
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs" style={{ color: '#64748b' }}>Latest Scan</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: '#94a3b8' }}>
                {formatDate(latestScan.date)}
              </p>
            </div>
            <button
              onClick={() => navigate(`/scan/${latestScan.id}`)}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: '#1e1e4a', color: '#818cf8' }}
            >
              View Details
            </button>
          </div>

          {/* Weight prominently */}
          <div className="mb-4">
            <span className="text-5xl font-bold" style={{ color: '#f1f5f9' }}>
              {fmt(latestScan.weight)}
            </span>
            <span className="text-lg ml-1" style={{ color: '#94a3b8' }}>kg</span>
            {previousScan?.weight != null && (
              <ChangeIndicator current={latestScan.weight} previous={previousScan.weight} />
            )}
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Muscle Mass',
                value: latestScan.skeletalMuscleMass,
                unit: 'kg',
                prev: previousScan?.skeletalMuscleMass,
                better: 'up',
              },
              {
                label: 'Body Fat %',
                value: latestScan.bodyFatPercentage,
                unit: '%',
                prev: previousScan?.bodyFatPercentage,
                better: 'down',
              },
              {
                label: 'BMI',
                value: latestScan.bmi,
                unit: '',
                prev: previousScan?.bmi,
                better: 'down',
              },
              {
                label: 'Visceral Fat',
                value: latestScan.visceralFatLevel,
                unit: '',
                prev: previousScan?.visceralFatLevel,
                better: 'down',
              },
            ].map((metric) => {
              const improved =
                metric.prev != null && metric.value != null
                  ? metric.better === 'up'
                    ? metric.value > metric.prev
                    : metric.value < metric.prev
                  : null

              return (
                <div
                  key={metric.label}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: '#0f0f1a' }}
                >
                  <div className="flex items-center gap-1.5">
                    {improved != null && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: improved ? '#22c55e' : '#ef4444' }}
                      />
                    )}
                    <span className="text-xs" style={{ color: '#64748b' }}>
                      {metric.label}
                    </span>
                  </div>
                  <p className="text-lg font-bold mt-1" style={{ color: '#f1f5f9' }}>
                    {fmt(metric.value)}
                    <span className="text-xs font-normal ml-0.5" style={{ color: '#94a3b8' }}>
                      {metric.unit}
                    </span>
                  </p>
                </div>
              )
            })}
          </div>

          {/* AI Analysis toggle */}
          <button
            onClick={() => setShowAnalysis((v) => !v)}
            className="w-full mt-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <span>✦</span>
            {showAnalysis ? 'Hide AI Analysis' : 'View AI Analysis'}
          </button>

          {showAnalysis && latestScan.aiAnalysis && (
            <div className="mt-3">
              <AIAnalysisCard analysis={latestScan.aiAnalysis} loading={false} />
            </div>
          )}
          {showAnalysis && !latestScan.aiAnalysis && (
            <div className="mt-3">
              <p className="text-sm text-center" style={{ color: '#64748b' }}>
                No AI analysis saved for this scan. Re-upload to generate one.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Progress Charts */}
      {chartScans.length >= 2 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>
            Progress Over Time
          </h2>
          {METRIC_CONFIG.map((cfg) => {
            const hasData = chartScans.filter((s) => s[cfg.key] != null).length >= 2
            if (!hasData) return null
            return (
              <MetricChart
                key={cfg.key}
                data={chartScans}
                dataKey={cfg.key}
                label={cfg.label}
                unit={cfg.unit}
                color={cfg.color}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
