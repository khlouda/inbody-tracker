import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}/${day}`
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null
  const entry = payload[0]
  if (entry.value == null) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{ backgroundColor: '#1a1a3e', border: '1px solid #2e2e5a', color: '#f1f5f9' }}
    >
      <div style={{ color: '#94a3b8' }}>{label}</div>
      <div className="font-semibold" style={{ color: entry.color }}>
        {entry.value}
        {unit}
      </div>
      {entry.payload?.isPrediction && (
        <div style={{ color: '#818cf8', fontSize: '10px' }}>Projected</div>
      )}
    </div>
  )
}

export default function MetricChart({ data, dataKey, label, unit = '', color, predictionData }) {
  // Merge historical and prediction data for the chart
  // Historical data: actual values only
  // Prediction data: shown as continuation with dashed line
  const allData = data ? [...data] : []

  // Separate actual vs predicted points in the merged dataset
  // We expect `data` to be objects with { date, [dataKey], isPrediction }
  // OR separate arrays passed via predictionData prop

  let chartData
  if (allData.length && allData[0] && 'isPrediction' in allData[0]) {
    // Combined dataset already tagged
    chartData = allData.map((d) => ({
      date: formatDate(d.date),
      rawDate: d.date,
      actual: d.isPrediction ? null : (d[dataKey] ?? null),
      predicted: d.isPrediction ? (d[dataKey] ?? null) : null,
      isPrediction: d.isPrediction,
    }))
    // For the last historical point, also carry it into predicted to connect the lines
    const lastHistIdx = chartData.map((d) => d.isPrediction).lastIndexOf(false)
    if (lastHistIdx >= 0 && lastHistIdx < chartData.length - 1) {
      chartData[lastHistIdx + 1] = {
        ...chartData[lastHistIdx + 1],
        predicted: chartData[lastHistIdx + 1].predicted ?? chartData[lastHistIdx].actual,
      }
      // bridge: duplicate the last actual point into predicted column for visual continuity
      chartData[lastHistIdx] = {
        ...chartData[lastHistIdx],
        predicted: chartData[lastHistIdx].actual,
      }
    }
  } else {
    chartData = allData.map((d) => ({
      date: formatDate(d.date),
      rawDate: d.date,
      actual: d[dataKey] ?? null,
      predicted: null,
      isPrediction: false,
    }))
  }

  // Current (latest non-predicted) value
  const latestActual = [...chartData].reverse().find((d) => d.actual != null)
  const currentValue = latestActual ? latestActual.actual : null

  if (!chartData.length) return null

  // Determine domain
  const allValues = chartData.flatMap((d) => [d.actual, d.predicted]).filter((v) => v != null)
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const padding = (maxVal - minVal) * 0.15 || 1
  const yDomain = [Math.floor(minVal - padding), Math.ceil(maxVal + padding)]

  return (
    <div
      className="rounded-xl p-4 shadow-lg"
      style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
          {label}
        </span>
        {currentValue != null && (
          <span className="text-sm font-bold" style={{ color }}>
            {currentValue}
            {unit}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={yDomain}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {/* Actual data line */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke={color}
            strokeWidth={2.5}
            dot={{ fill: color, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: color }}
            connectNulls={false}
            isAnimationActive={true}
          />
          {/* Prediction data line */}
          <Line
            type="monotone"
            dataKey="predicted"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeOpacity={0.55}
            dot={{ fill: color, r: 3, strokeWidth: 0, fillOpacity: 0.55 }}
            activeDot={{ r: 5, fill: color, fillOpacity: 0.55 }}
            connectNulls={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
