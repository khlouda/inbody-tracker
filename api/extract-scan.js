import Anthropic from '@anthropic-ai/sdk'

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { imageBase64, mimeType } = req.body

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ success: false, error: 'Missing imageBase64 or mimeType' })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            {
              type: 'text',
              text: 'You are analyzing an InBody body composition scan. Extract ALL visible metrics and return them as a JSON object. Include these fields if present: date (ISO string YYYY-MM-DD), weight (kg), skeletalMuscleMass (kg), bodyFatMass (kg), bodyFatPercentage (%), bmi, visceralFatLevel (number), bmr (kcal), protein (kg), minerals (kg), totalBodyWater (L), intracellularWater (L), extracellularWater (L), softLeanMass (kg), leanBodyMass (kg), segmentalLeanAnalysis (object with rightArm, leftArm, trunk, rightLeg, leftLeg). Return ONLY a valid JSON object, no markdown, no explanation.',
            },
          ],
        },
      ],
    })

    const responseText = message.content[0].text.trim()
    const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()

    let parsedMetrics
    try {
      parsedMetrics = JSON.parse(cleaned)
    } catch {
      return res.status(422).json({
        success: false,
        error: 'Could not parse metrics from the image. Please ensure it is a clear InBody scan photo.',
      })
    }

    return res.status(200).json({ success: true, data: parsedMetrics })
  } catch (err) {
    console.error('extract-scan error:', err)
    return res.status(500).json({
      success: false,
      error: err.message || 'An unexpected error occurred while analyzing the scan.',
    })
  }
}
