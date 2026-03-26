import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import AIAnalysisCard from './AIAnalysisCard.jsx'

const METRIC_CONFIG = [
  { key: 'weight', label: 'Weight', unit: ' lbs', color: '#6366f1' },
  { key: 'skeletalMuscleMass', label: 'Skeletal Muscle Mass', unit: ' lbs', color: '#10b981' },
  { key: 'bodyFatMass', label: 'Body Fat Mass', unit: ' lbs', color: '#f43f5e' },
  { key: 'bodyFatPercentage', label: 'Body Fat %', unit: '%', color: '#f97316' },
  { key: 'bmi', label: 'BMI', unit: '', color: '#06b6d4' },
  { key: 'visceralFatLevel', label: 'Visceral Fat Level', unit: '', color: '#f59e0b' },
  { key: 'bmr', label: 'BMR', unit: ' kcal', color: '#8b5cf6' },
  { key: 'protein', label: 'Protein', unit: ' lbs', color: '#ec4899' },
  { key: 'minerals', label: 'Minerals', unit: ' lbs', color: '#84cc16' },
  { key: 'totalBodyWater', label: 'Total Body Water', unit: ' L', color: '#38bdf8' },
  { key: 'intracellularWater', label: 'Intracellular Water', unit: ' L', color: '#22d3ee' },
  { key: 'extracellularWater', label: 'Extracellular Water', unit: ' L', color: '#67e8f9' },
  { key: 'softLeanMass', label: 'Soft Lean Mass', unit: ' lbs', color: '#a3e635' },
  { key: 'leanBodyMass', label: 'Lean Body Mass', unit: ' lbs', color: '#4ade80' },
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
  if (val == null) return '—'
  return typeof val === 'number' ? val.toFixed(dec) : String(val)
}

export default function ScanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [scan, setScan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'scans', id))
      .then((docSnap) => {
        if (docSnap.exists()) {
          setScan({ id: docSnap.id, ...docSnap.data() })
        } else {
          setError('Scan not found.')
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Failed to load scan.')
        setLoading(false)
      })
  }, [id])

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'scans', id))
      navigate('/history')
    } catch (err) {
      setError(err.message || 'Failed to delete scan.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 w-32 rounded" style={{ backgroundColor: '#1e1e3a' }} />
        <div className="h-6 w-48 rounded" style={{ backgroundColor: '#1e1e3a' }} />
        <div className="h-48 rounded-xl" style={{ backgroundColor: '#111128' }} />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl" style={{ backgroundColor: '#111128' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm"
          style={{ color: '#64748b' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#1a0a0a', border: '1px solid #ef4444' }}>
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!scan) return null

  const visibleMetrics = METRIC_CONFIG.filter((m) => scan[m.key] != null)

  return (
    <div className="p-4 space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm pt-2"
        style={{ color: '#64748b' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
          {formatDate(scan.date)}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Scan details</p>
      </div>

      {/* Scan image */}
      {scan.imageUrl && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111128' }}>
          <img
            src={scan.imageUrl}
            alt="InBody scan"
            className="w-full object-contain max-h-64"
          />
        </div>
      )}

      {/* Weight hero */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2a 100%)',
          border: '1px solid #2e2e5a',
        }}
      >
        <p className="text-xs" style={{ color: '#64748b' }}>Weight</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-5xl font-bold" style={{ color: '#f1f5f9' }}>
            {fmt(scan.weight)}
          </span>
          <span className="text-xl" style={{ color: '#94a3b8' }}>lbs</span>
        </div>
      </div>

      {/* Metrics grid */}
      {visibleMetrics.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: '#94a3b8' }}>
            ALL METRICS
          </p>
          <div className="grid grid-cols-2 gap-3">
            {visibleMetrics.map((m) => (
              <div
                key={m.key}
                className="rounded-lg p-3"
                style={{ backgroundColor: '#0f0f1a' }}
              >
                <p className="text-xs" style={{ color: '#64748b' }}>{m.label}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: m.color }}>
                  {fmt(scan[m.key])}
                  <span className="text-xs font-normal ml-0.5" style={{ color: '#94a3b8' }}>
                    {m.unit}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Segmental Lean Analysis */}
      {scan.segmentalLeanAnalysis && (
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}
        >
          <p className="text-xs font-semibold mb-3" style={{ color: '#94a3b8' }}>
            SEGMENTAL LEAN ANALYSIS
          </p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(scan.segmentalLeanAnalysis).map(([segment, val]) => (
              <div
                key={segment}
                className="rounded-lg p-3"
                style={{ backgroundColor: '#0f0f1a' }}
              >
                <p className="text-xs capitalize" style={{ color: '#64748b' }}>
                  {segment.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-base font-bold mt-0.5" style={{ color: '#f1f5f9' }}>
                  {val != null ? (typeof val === 'number' ? val.toFixed(1) : val) : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {scan.aiAnalysis && (
        <AIAnalysisCard analysis={scan.aiAnalysis} loading={false} />
      )}

      {/* Delete button */}
      <div className="pt-4 pb-2 space-y-3">
        {confirmDelete && (
          <div
            className="rounded-xl p-3 text-sm text-center"
            style={{ backgroundColor: '#2d0a0a', border: '1px solid #ef4444', color: '#fca5a5' }}
          >
            Are you sure? This action cannot be undone.
          </div>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{
            backgroundColor: confirmDelete ? '#ef4444' : 'transparent',
            color: '#ef4444',
            border: confirmDelete ? 'none' : '1px solid #ef444460',
            opacity: deleting ? 0.7 : 1,
          }}
        >
          {deleting ? (
            <>
              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              Deleting...
            </>
          ) : confirmDelete ? (
            'Confirm Delete'
          ) : (
            'Delete Scan'
          )}
        </button>
        {confirmDelete && !deleting && (
          <button
            onClick={() => setConfirmDelete(false)}
            className="w-full py-2 rounded-xl text-sm"
            style={{ color: '#64748b' }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
