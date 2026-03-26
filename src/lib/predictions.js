/**
 * Performs Ordinary Least Squares (OLS) linear regression.
 * @param {number[]} xs - x values
 * @param {number[]} ys - y values
 * @returns {{ slope: number, intercept: number }}
 */
function linearRegression(xs, ys) {
  const n = xs.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 }

  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0)
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0)

  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  return { slope, intercept }
}

/**
 * Calculates future predictions using linear regression on historical scan data.
 * @param {Array<Object>} scans - Array of scan objects sorted by date ascending
 * @returns {Object|null} Prediction object or null if insufficient data
 */
export function calculatePredictions(scans) {
  if (!scans || scans.length < 3) return null

  // Sort ascending by date
  const sorted = [...scans].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  )

  const firstDate = new Date(sorted[0].date)
  const lastDate = new Date(sorted[sorted.length - 1].date)

  const metrics = ['weight', 'skeletalMuscleMass', 'bodyFatMass', 'bodyFatPercentage']

  // Build xs (days since first scan) and ys for each metric
  const regressions = {}
  for (const metric of metrics) {
    const validPoints = sorted.filter((s) => s[metric] != null)
    if (validPoints.length < 2) {
      regressions[metric] = null
      continue
    }
    const xs = validPoints.map((s) => {
      const diff = new Date(s.date) - firstDate
      return diff / (1000 * 60 * 60 * 24)
    })
    const ys = validPoints.map((s) => s[metric])
    regressions[metric] = linearRegression(xs, ys)
  }

  // Days from first scan to prediction point
  const daysFromFirst = (new Date(lastDate) - firstDate) / (1000 * 60 * 60 * 24)

  const predict = (metric, extraDays) => {
    const reg = regressions[metric]
    if (!reg) return null
    const val = reg.slope * (daysFromFirst + extraDays) + reg.intercept
    return Math.round(val * 10) / 10
  }

  const addDays = (date, days) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  const weeks4 = {
    date: addDays(lastDate, 28),
    weight: predict('weight', 28),
    skeletalMuscleMass: predict('skeletalMuscleMass', 28),
    bodyFatMass: predict('bodyFatMass', 28),
    bodyFatPercentage: predict('bodyFatPercentage', 28),
  }

  const weeks8 = {
    date: addDays(lastDate, 56),
    weight: predict('weight', 56),
    skeletalMuscleMass: predict('skeletalMuscleMass', 56),
    bodyFatMass: predict('bodyFatMass', 56),
    bodyFatPercentage: predict('bodyFatPercentage', 56),
  }

  const weeks12 = {
    date: addDays(lastDate, 84),
    weight: predict('weight', 84),
    skeletalMuscleMass: predict('skeletalMuscleMass', 84),
    bodyFatMass: predict('bodyFatMass', 84),
    bodyFatPercentage: predict('bodyFatPercentage', 84),
  }

  // Build trendData: historical + prediction points
  const historicalTrendData = sorted.map((s) => ({
    date: s.date,
    weight: s.weight ?? null,
    skeletalMuscleMass: s.skeletalMuscleMass ?? null,
    bodyFatMass: s.bodyFatMass ?? null,
    bodyFatPercentage: s.bodyFatPercentage ?? null,
    isPrediction: false,
  }))

  const predictionTrendData = [weeks4, weeks8, weeks12].map((p) => ({
    date: p.date,
    weight: p.weight,
    skeletalMuscleMass: p.skeletalMuscleMass,
    bodyFatMass: p.bodyFatMass,
    bodyFatPercentage: p.bodyFatPercentage,
    isPrediction: true,
  }))

  return {
    weeks4,
    weeks8,
    weeks12,
    trendData: [...historicalTrendData, ...predictionTrendData],
  }
}
