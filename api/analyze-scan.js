const Anthropic = require('@anthropic-ai/sdk')

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

module.exports = async (req, res) => {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { currentScan, allScans } = req.body

    if (!currentScan) {
      return res.status(400).json({ success: false, error: 'Missing currentScan' })
    }

    const anthropic = new Anthropic.default({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const historicalScans = Array.isArray(allScans) ? allScans : []

    const prompt = `You are a fitness and body composition expert analyzing InBody scan results. Based on the following scan data, provide a concise analysis paragraph (3-4 sentences) covering: what improved since previous scans, what declined or needs attention, and ONE specific actionable recommendation. Be encouraging but honest. Focus on the most significant changes.

Current scan: ${JSON.stringify(currentScan, null, 2)}
Historical scans (most recent first): ${JSON.stringify(historicalScans, null, 2)}

Return only the analysis paragraph, no markdown, no bullet points.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const analysis = message.content[0].text.trim()

    return res.status(200).json({ success: true, analysis })
  } catch (err) {
    console.error('analyze-scan error:', err)
    return res.status(500).json({
      success: false,
      error: err.message || 'An unexpected error occurred while analyzing the scan.',
    })
  }
}
