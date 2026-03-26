import Anthropic from '@anthropic-ai/sdk'

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

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

function calculatePredictions(scans) {
  if (!scans || scans.length < 3) return null
  const sorted = [...scans].sort((a, b) => new Date(a.date) - new Date(b.date))
  const firstDate = new Date(sorted[0].date)
  const lastDate = new Date(sorted[sorted.length - 1].date)
  const metrics = ['weight', 'skeletalMuscleMass', 'bodyFatMass', 'bodyFatPercentage']
  const regressions = {}
  for (const metric of metrics) {
    const validPoints = sorted.filter((s) => s[metric] != null)
    if (validPoints.length < 2) { regressions[metric] = null; continue }
    const xs = validPoints.map((s) => (new Date(s.date) - firstDate) / 86400000)
    const ys = validPoints.map((s) => s[metric])
    regressions[metric] = linearRegression(xs, ys)
  }
  const daysFromFirst = (lastDate - firstDate) / 86400000
  const predict = (metric, extra) => {
    const reg = regressions[metric]
    if (!reg) return null
    return Math.round((reg.slope * (daysFromFirst + extra) + reg.intercept) * 10) / 10
  }
  const addDays = (date, days) => {
    const d = new Date(date); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0]
  }
  const make = (days) => ({
    date: addDays(lastDate, days),
    weight: predict('weight', days),
    skeletalMuscleMass: predict('skeletalMuscleMass', days),
    bodyFatMass: predict('bodyFatMass', days),
    bodyFatPercentage: predict('bodyFatPercentage', days),
  })
  const weeks4 = make(28), weeks8 = make(56), weeks12 = make(84)
  const historicalTrendData = sorted.map((s) => ({ date: s.date, weight: s.weight ?? null, skeletalMuscleMass: s.skeletalMuscleMass ?? null, bodyFatMass: s.bodyFatMass ?? null, bodyFatPercentage: s.bodyFatPercentage ?? null, isPrediction: false }))
  const predictionTrendData = [weeks4, weeks8, weeks12].map((p) => ({ ...p, isPrediction: true }))
  return { weeks4, weeks8, weeks12, trendData: [...historicalTrendData, ...predictionTrendData] }
}

export default async function handler(req, res) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  try {
    const { scans } = req.body
    if (!Array.isArray(scans) || scans.length < 3) {
      return res.status(400).json({ success: false, error: 'At least 3 scans are required.' })
    }

    const predictions = calculatePredictions(scans)
    const sorted = [...scans].sort((a, b) => new Date(a.date) - new Date(b.date))

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const prompt = `You are a fitness and body composition expert. Based on the following InBody scan history and projected trend data, provide a concise 3-4 sentence insight about the user's body composition trajectory. Interpret whether the trend is positive or concerning, and provide ONE specific recommendation to either maintain or improve the trend. Be encouraging but data-driven.

Scan history (oldest to newest): ${JSON.stringify(sorted, null, 2)}
Projected at 4 weeks: ${JSON.stringify(predictions.weeks4, null, 2)}
Projected at 8 weeks: ${JSON.stringify(predictions.weeks8, null, 2)}
Projected at 12 weeks: ${JSON.stringify(predictions.weeks12, null, 2)}

Return only the insight paragraph, no markdown, no bullet points.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    return res.status(200).json({ success: true, predictions, aiInsight: message.content[0].text.trim() })
  } catch (err) {
    console.error('predict error:', err)
    return res.status(500).json({ success: false, error: err.message || 'Unexpected error.' })
  }
}
