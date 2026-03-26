import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useScans } from '../hooks/useScans.js'
import AIAnalysisCard from './AIAnalysisCard.jsx'

const FIELD_LABELS = {
  date: 'Date',
  weight: 'Weight (kg)',
  skeletalMuscleMass: 'Skeletal Muscle Mass (kg)',
  bodyFatMass: 'Body Fat Mass (kg)',
  bodyFatPercentage: 'Body Fat %',
  bmi: 'BMI',
  visceralFatLevel: 'Visceral Fat Level',
  bmr: 'BMR (kcal)',
  protein: 'Protein (kg)',
  minerals: 'Minerals (kg)',
  totalBodyWater: 'Total Body Water (L)',
  intracellularWater: 'Intracellular Water (L)',
  extracellularWater: 'Extracellular Water (L)',
  softLeanMass: 'Soft Lean Mass (kg)',
  leanBodyMass: 'Lean Body Mass (kg)',
}

const STEPS = ['Uploading image...', 'Reading metrics...', 'Calculating analysis...', 'Preparing your data...']

function compressImage(file, maxSize = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = reject
    img.src = url
  })
}

export default function UploadScreen() {
  const navigate = useNavigate()
  const { scans } = useScans()
  const fileInputRef = useRef(null)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [step, setStep] = useState('select') // select | extracting | review | saving | error
  const [extractProgress, setExtractProgress] = useState(0)
  const [extractedData, setExtractedData] = useState(null)
  const [editedDate, setEditedDate] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [analyzingAI, setAnalyzingAI] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleFileSelect = (file) => {
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }

  const handleExtract = async () => {
    if (!imageFile) return
    setStep('extracting')
    setExtractProgress(0)

    // Animate progress steps
    const progressTimer = setInterval(() => {
      setExtractProgress((p) => {
        if (p >= STEPS.length - 1) {
          clearInterval(progressTimer)
          return p
        }
        return p + 1
      })
    }, 1200)

    try {
      const base64 = await compressImage(imageFile)
      const response = await fetch('/api/extract-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' }),
      })

      clearInterval(progressTimer)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract scan data')
      }

      setExtractedData(result.data)
      setEditedDate(result.data.date || new Date().toISOString().split('T')[0])
      setStep('review')
    } catch (err) {
      clearInterval(progressTimer)
      setError(err.message || 'Failed to analyze image. Please try again.')
      setStep('error')
    }
  }

  const handleGetAnalysis = async () => {
    if (!extractedData) return
    setAnalyzingAI(true)

    try {
      const allScans = scans.slice(0, 5)
      const response = await fetch('/api/analyze-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentScan: extractedData, allScans }),
      })
      const result = await response.json()
      if (result.success) {
        setAiAnalysis(result.analysis)
      } else {
        setAiAnalysis('Could not generate analysis at this time.')
      }
    } catch {
      setAiAnalysis('Could not generate analysis at this time.')
    } finally {
      setAnalyzingAI(false)
    }
  }

  const handleSave = async () => {
    if (!extractedData) return
    setSaving(true)

    try {
      // Build Firestore document
      const docData = {
        ...extractedData,
        date: editedDate || extractedData.date,
        aiAnalysis: aiAnalysis || null,
        createdAt: serverTimestamp(),
      }

      // Remove null/undefined keys
      Object.keys(docData).forEach((k) => {
        if (docData[k] == null) delete docData[k]
      })

      await addDoc(collection(db, 'scans'), docData)
      setStep('saved')
      setTimeout(() => navigate('/history'), 1200)
    } catch (err) {
      setError(err.message || 'Failed to save scan. Please try again.')
      setSaving(false)
    }
  }

  const reset = () => {
    setImageFile(null)
    setImagePreview(null)
    setStep('select')
    setExtractProgress(0)
    setExtractedData(null)
    setEditedDate('')
    setAiAnalysis(null)
    setError('')
    setSaving(false)
  }

  // --- STEP: Select ---
  if (step === 'select') {
    return (
      <div className="p-4 space-y-4">
        <div className="pt-2">
          <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Upload Scan</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Take a photo of your InBody result sheet
          </p>
        </div>

        {/* Drop zone */}
        <div
          className="relative rounded-xl flex flex-col items-center justify-center cursor-pointer"
          style={{
            minHeight: '220px',
            backgroundColor: '#111128',
            border: '2px dashed #2e2e5a',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {imagePreview ? (
            <>
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-64 max-w-full rounded-lg object-contain"
              />
              <div
                className="absolute inset-0 flex items-end justify-center pb-4 rounded-xl"
                style={{ background: 'linear-gradient(to top, rgba(10,10,15,0.8) 0%, transparent 50%)' }}
              >
                <span className="text-xs" style={{ color: '#94a3b8' }}>Tap to change</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2e2e5a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="14" rx="2" />
                <circle cx="12" cy="13" r="3" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              <div>
                <p className="font-semibold" style={{ color: '#94a3b8' }}>Tap to upload InBody scan</p>
                <p className="text-xs mt-1" style={{ color: '#475569' }}>
                  JPG, PNG, HEIC supported
                </p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
        </div>

        {imagePreview && (
          <button
            onClick={handleExtract}
            className="w-full py-3.5 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: '#6366f1', color: '#fff' }}
          >
            Extract Metrics with AI
          </button>
        )}
      </div>
    )
  }

  // --- STEP: Extracting ---
  if (step === 'extracting') {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen gap-8">
        {/* Spinner */}
        <div className="relative flex items-center justify-center">
          <div
            className="w-20 h-20 rounded-full border-4 animate-spin"
            style={{ borderColor: '#1e1e3a', borderTopColor: '#6366f1' }}
          />
          <span className="absolute text-2xl">✦</span>
        </div>
        <div className="text-center space-y-2">
          <p className="font-semibold text-lg" style={{ color: '#f1f5f9' }}>
            Analyzing your scan with AI...
          </p>
          <p className="text-sm" style={{ color: '#6366f1' }}>
            {STEPS[Math.min(extractProgress, STEPS.length - 1)]}
          </p>
        </div>
        {/* Progress steps */}
        <div className="w-full space-y-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="flex items-center gap-3 px-4 py-2 rounded-lg"
              style={{ backgroundColor: i <= extractProgress ? 'rgba(99,102,241,0.1)' : 'transparent' }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                style={{
                  backgroundColor: i < extractProgress ? '#6366f1' : i === extractProgress ? 'rgba(99,102,241,0.3)' : '#1e1e3a',
                  color: '#fff',
                }}
              >
                {i < extractProgress ? '✓' : i + 1}
              </div>
              <span
                className="text-sm"
                style={{ color: i <= extractProgress ? '#f1f5f9' : '#475569' }}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // --- STEP: Review ---
  if (step === 'review' && extractedData) {
    const displayFields = Object.entries(FIELD_LABELS).filter(
      ([key]) => key !== 'date' && extractedData[key] != null
    )

    return (
      <div className="p-4 space-y-4">
        <div className="pt-2">
          <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Review Metrics</h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
            Verify the extracted data before saving
          </p>
        </div>

        {/* Preview thumbnail */}
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Scan preview"
            className="w-full max-h-48 object-contain rounded-xl"
            style={{ backgroundColor: '#111128' }}
          />
        )}

        {/* Date field (editable) */}
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}
        >
          <label className="text-xs font-medium" style={{ color: '#94a3b8' }}>
            Scan Date
          </label>
          <input
            type="date"
            value={editedDate}
            onChange={(e) => setEditedDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{
              backgroundColor: '#0f0f1a',
              border: '1px solid #2e2e5a',
              color: '#f1f5f9',
              colorScheme: 'dark',
            }}
          />
        </div>

        {/* Metrics grid */}
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: '#94a3b8' }}>
            EXTRACTED METRICS
          </p>
          <div className="grid grid-cols-2 gap-3">
            {displayFields.map(([key, label]) => (
              <div key={key} className="rounded-lg p-3" style={{ backgroundColor: '#0f0f1a' }}>
                <p className="text-xs" style={{ color: '#64748b' }}>{label}</p>
                <p className="text-base font-bold mt-0.5" style={{ color: '#f1f5f9' }}>
                  {typeof extractedData[key] === 'object'
                    ? JSON.stringify(extractedData[key])
                    : String(extractedData[key])}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis */}
        {!aiAnalysis && (
          <button
            onClick={handleGetAnalysis}
            disabled={analyzingAI}
            className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'rgba(99,102,241,0.15)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.3)',
              opacity: analyzingAI ? 0.7 : 1,
            }}
          >
            {analyzingAI ? (
              <>
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Generating analysis...
              </>
            ) : (
              <>✦ Get AI Analysis</>
            )}
          </button>
        )}

        {(aiAnalysis || analyzingAI) && (
          <AIAnalysisCard analysis={aiAnalysis} loading={analyzingAI} />
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          style={{
            backgroundColor: saving ? '#166534' : '#22c55e',
            color: '#fff',
            opacity: saving ? 0.8 : 1,
          }}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            'Save Scan'
          )}
        </button>

        <button
          onClick={reset}
          className="w-full py-2.5 rounded-xl text-sm"
          style={{ color: '#64748b' }}
        >
          Start Over
        </button>
      </div>
    )
  }

  // --- STEP: Saved ---
  if (step === 'saved') {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          style={{ backgroundColor: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e' }}>
          ✓
        </div>
        <p className="text-xl font-bold" style={{ color: '#22c55e' }}>Scan Saved!</p>
        <p className="text-sm" style={{ color: '#64748b' }}>Taking you to your history...</p>
      </div>
    )
  }

  // --- STEP: Error ---
  if (step === 'error') {
    return (
      <div className="p-4 space-y-4">
        <div className="pt-2">
          <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Upload Scan</h1>
        </div>
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ backgroundColor: '#1a0a0a', border: '1px solid #ef4444' }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: '#ef4444' }}>✕</span>
            <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
              Extraction Failed
            </p>
          </div>
          <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
        </div>
        <button
          onClick={reset}
          className="w-full py-3.5 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#6366f1', color: '#fff' }}
        >
          Try Again
        </button>
      </div>
    )
  }

  return null
}
