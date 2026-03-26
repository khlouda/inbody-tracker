import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore'
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
  { key: 'softLeanMass', label: 'Soft Lean Mass', unit: ' lbs', color: '#a3e635' },
  { key: 'leanBodyMass', label: 'Lean Body Mass', unit: ' lbs', color: '#4ade80' },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getDoc(doc(db, 'scans', id))
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() }
          setScan(data)
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

  const startEditing = () => {
    const vals = { date: scan.date || '' }
    METRIC_CONFIG.forEach((m) => {
      vals[m.key] = scan[m.key] != null ? String(scan[m.key]) : ''
    })
    setEditValues(vals)
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const updates = { date: editValues.date }
      METRIC_CONFIG.forEach((m) => {
        const raw = editValues[m.key]
        if (raw === '' || raw == null) {
          updates[m.key] = null
        } else {
          const num = parseFloat(raw)
          updates[m.key] = isNaN(num) ? null : num
        }
      })
      // Remove null keys to keep Firestore clean
      Object.keys(updates).forEach((k) => { if (updates[k] == null) delete updates[k] })
      await updateDoc(doc(db, 'scans', id), updates)
      setScan((prev) => ({ ...prev, ...updates }))
      setEditing(false)
    } catch (err) {
      setError(err.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
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
        <div className="h-48 rounded-xl" style={{ backgroundColor: '#111128' }} />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded-xl" style={{ backgroundColor: '#111128' }} />)}
        </div>
      </div>
    )
  }

  if (error && !scan) {
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </button>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#1a0a0a', border: '1px solid #ef4444' }}>
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!scan) return null

  const visibleMetrics = METRIC_CONFIG.filter((m) => scan[m.key] != null || editing)

  // ---- EDIT MODE ----
  if (editing) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setEditing(false)} className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            Cancel
          </button>
          <h1 className="text-lg font-bold" style={{ color: '#f1f5f9' }}>Edit Scan</h1>
          <div style={{ width: 48 }} />
        </div>

        {/* Date */}
        <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}>
          <label className="text-xs font-semibold" style={{ color: '#94a3b8' }}>SCAN DATE</label>
          <input
            type="date"
            value={editValues.date || ''}
            onChange={(e) => setEditValues((v) => ({ ...v, date: e.target.value }))}
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: '#0f0f1a', border: '1px solid #2e2e5a', color: '#f1f5f9', colorScheme: 'dark' }}
          />
        </div>

        {/* Metrics */}
        <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}>
          <label className="text-xs font-semibold" style={{ color: '#94a3b8' }}>METRICS</label>
          <div className="grid grid-cols-2 gap-3">
            {METRIC_CONFIG.map((m) => (
              <div key={m.key} className="rounded-lg p-3" style={{ backgroundColor: '#0f0f1a' }}>
                <label className="text-xs" style={{ color: '#64748b' }}>
                  {m.label} <span style={{ color: '#475569' }}>{m.unit.trim()}</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={editValues[m.key] ?? ''}
                  onChange={(e) => setEditValues((v) => ({ ...v, [m.key]: e.target.value }))}
                  className="w-full mt-1 rounded px-2 py-1.5 text-sm font-bold"
                  style={{ backgroundColor: '#111128', border: '1px solid #2e2e5a', color: m.color, outline: 'none' }}
                  placeholder="—"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: '#1a0a0a', border: '1px solid #ef4444', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSaveEdit}
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          style={{ backgroundColor: saving ? '#166534' : '#22c55e', color: '#fff' }}
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving...</>
          ) : 'Save Changes'}
        </button>
      </div>
    )
  }

  // ---- VIEW MODE ----
  return (
    <div className="p-4 space-y-4">
      {/* Back + Edit buttons */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </button>
        <button
          onClick={startEditing}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>{formatDate(scan.date)}</h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>Scan details</p>
      </div>

      {/* Weight hero */}
      <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #1a1a3e 0%, #0f0f2a 100%)', border: '1px solid #2e2e5a' }}>
        <p className="text-xs" style={{ color: '#64748b' }}>Weight</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-5xl font-bold" style={{ color: '#f1f5f9' }}>{fmt(scan.weight)}</span>
          <span className="text-xl" style={{ color: '#94a3b8' }}>lbs</span>
        </div>
      </div>

      {/* Metrics grid */}
      {visibleMetrics.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#94a3b8' }}>ALL METRICS</p>
          <div className="grid grid-cols-2 gap-3">
            {visibleMetrics.map((m) => (
              <div key={m.key} className="rounded-lg p-3" style={{ backgroundColor: '#0f0f1a' }}>
                <p className="text-xs" style={{ color: '#64748b' }}>{m.label}</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: m.color }}>
                  {fmt(scan[m.key])}
                  <span className="text-xs font-normal ml-0.5" style={{ color: '#94a3b8' }}>{m.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Segmental Lean Analysis */}
      {scan.segmentalLeanAnalysis && (
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111128', border: '1px solid #1e1e3a' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#94a3b8' }}>SEGMENTAL LEAN ANALYSIS</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(scan.segmentalLeanAnalysis).map(([segment, val]) => (
              <div key={segment} className="rounded-lg p-3" style={{ backgroundColor: '#0f0f1a' }}>
                <p className="text-xs capitalize" style={{ color: '#64748b' }}>{segment.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p className="text-base font-bold mt-0.5" style={{ color: '#f1f5f9' }}>
                  {val != null ? (typeof val === 'number' ? val.toFixed(1) : val) : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {scan.aiAnalysis && <AIAnalysisCard analysis={scan.aiAnalysis} loading={false} />}

      {/* Delete button */}
      <div className="pt-4 pb-2 space-y-3">
        {confirmDelete && (
          <div className="rounded-xl p-3 text-sm text-center" style={{ backgroundColor: '#2d0a0a', border: '1px solid #ef4444', color: '#fca5a5' }}>
            Are you sure? This cannot be undone.
          </div>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ backgroundColor: confirmDelete ? '#ef4444' : 'transparent', color: '#ef4444', border: confirmDelete ? 'none' : '1px solid #ef444460', opacity: deleting ? 0.7 : 1 }}
        >
          {deleting ? (<><div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />Deleting...</>) : confirmDelete ? 'Confirm Delete' : 'Delete Scan'}
        </button>
        {confirmDelete && !deleting && (
          <button onClick={() => setConfirmDelete(false)} className="w-full py-2 rounded-xl text-sm" style={{ color: '#64748b' }}>Cancel</button>
        )}
      </div>
    </div>
  )
}
