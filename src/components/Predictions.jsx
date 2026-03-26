import { useState, useEffect } from 'react'
import { useScans } from '../hooks/useScans.js'
import { calculatePredictions } from '../lib/predictions.js'
import MetricChart from './MetricChart.jsx'
import AIAnalysisCard from './AIAnalysisCard.jsx'

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

function DeltaBadge({ current, projected, unit = '', better = 'down' }) {
  if (current == null || projected == null) return null
  const diff = projected - current
  if (Math.abs(diff) < 0.01) return <span className="text-xs" style={{ color: '#64748b' }}>No change</span>

  const isPositive = diff > 0
  const isGood = better === 'up' ? isPositive : !isPositive
  const color = isGood ? '#22c55e' : '#ef4444'
  const Arrow = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {isPositive ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
    </svg>
  )

  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color }}>
      <Arrow />
      {Math.abs(diff).toFixed(1)}{unit}
    </span>
  )
}

function ProjectionCard({ label, weekData, currentScan, weekOffset }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: '#6366f1' }}
          >
            {label}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            {formatDate(weekData?.date)}
          </p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8' }}
        >
          +{weekOffset}w
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        {/* Weight */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#94a3b8' }}>Weight</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: '#6366f1' }}>
              {fmt(weekData?.weight)} kg
            </span>
            <DeltaBadge
              current={currentScan?.weight}
              projected={weekData?.weight}
              unit=" kg"
              better="down"
            />
          </div>
        </div>

        {/* Muscle */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#94a3b8' }}>Muscle Mass</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: '#10b981' }}>
              {fmt(weekData?.skeletalMuscleMass)} kg
            </span>
            <DeltaBadge
              current={currentScan?.skeletalMuscleMass}
              projected={weekData?.skeletalMuscleMass}
              unit=" kg"
              better="up"
            />
          </div>
        </div>

        {/* Body Fat % */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#94a3b8' }}>Body Fat %</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: '#f97316' }}>
              {fmt(weekData?.bodyFatPercentage)}%
            </span>
            <DeltaBadge
              current={currentScan?.bodyFatPercentage}
              projected={weekData?.bodyFatPercentage}
              unit="%"
              better="down"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Predictions() {
  const { scans, loading } = useScans()
  const [apiPredictions, setApiPredictions] = useState(null)
  const [aiInsight, setAiInsight] = useState(null)
  const [loadingPredictions, setLoadingPredictions] = useState(false)
  const [predError, setPredError] = useState(null)

  const scanCount = scans.length
  const latestScan = scans[0] ?? null

  // Local predictions (client-side)
  const localPredictions = scanCount >= 3
    ? calculatePredictions([...scans].reverse()) // ascending
    : null

  const predictions = apiPredictions || localPredictions

  useEffect(() => {
    if (loading || scanCount < 3) return

    setLoadingPredictions(true)
    setPredError(null)

    const ascending = [...scans].reverse()

    fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scans: ascending }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setApiPredictions(result.predictions)
          setAiInsight(result.aiInsight)
        } else {
          setPredError(result.error || 'Failed to fetch predictions.')
        }
      })
      .catch((err) => {
        setPredError(err.message || 'Network error fetching predictions.')
      })
      .finally(() => setLoadingPredictions(false))
  }, [loading, scanCount])

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 w-36 rounded" style={{ backgroundColor: '#1e1e3a' }} />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-36 rounded-xl" style={{ backgroundColor: '#111128' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      <div className="pt-2">
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Projections</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          AI-powered body composition forecast
        </p>
      </div>

      {/* Not enough scans */}
      {scanCount < 3 && (
        <div
          className="rounded-xl p-6 space-y-3"
          style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: '#1e1e3a' }}
            >
              📈
            </div>
            <div>
              <p className="font-semibold" style={{ color: '#f1f5f9' }}>
                More scans needed
              </p>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Upload at least 3 scans to see predictions
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: '#64748b' }}>
                {scanCount} of 3 scans
              </span>
              <span className="text-xs" style={{ color: '#6366f1' }}>
                {3 - scanCount} more needed
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: '#1e1e3a' }}>
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${(scanCount / 3) * 100}%`,
                  backgroundColor: '#6366f1',
                  transition: 'width 500ms ease',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Predictions available */}
      {scanCount >= 3 && predictions && (
        <>
          {/* Loading overlay note */}
          {loadingPredictions && (
            <div
              className="rounded-lg px-4 py-2 flex items-center gap-2 text-sm"
              style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8' }}
            >
              <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              Loading AI predictions...
            </div>
          )}

          {predError && (
            <div
              className="rounded-lg px-4 py-2 text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {predError} (Showing local predictions)
            </div>
          )}

          {/* Projection cards */}
          <div className="space-y-3">
            <ProjectionCard
              label="4 Weeks"
              weekData={predictions.weeks4}
              currentScan={latestScan}
              weekOffset={4}
            />
            <ProjectionCard
              label="8 Weeks"
              weekData={predictions.weeks8}
              currentScan={latestScan}
              weekOffset={8}
            />
            <ProjectionCard
              label="12 Weeks"
              weekData={predictions.weeks12}
              currentScan={latestScan}
              weekOffset={12}
            />
          </div>

          {/* Charts section */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>
              Trend & Forecast
            </h2>

            {predictions.trendData && (
              <>
                <MetricChart
                  data={predictions.trendData}
                  dataKey="weight"
                  label="Weight"
                  unit=" kg"
                  color="#6366f1"
                />
                <MetricChart
                  data={predictions.trendData}
                  dataKey="skeletalMuscleMass"
                  label="Skeletal Muscle Mass"
                  unit=" kg"
                  color="#10b981"
                />
                <MetricChart
                  data={predictions.trendData}
                  dataKey="bodyFatPercentage"
                  label="Body Fat %"
                  unit="%"
                  color="#f97316"
                />
              </>
            )}
          </div>

          {/* AI Insight */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>
              AI Insight
            </h2>
            <AIAnalysisCard
              analysis={aiInsight}
              loading={loadingPredictions && !aiInsight}
            />
          </div>
        </>
      )}
    </div>
  )
}
