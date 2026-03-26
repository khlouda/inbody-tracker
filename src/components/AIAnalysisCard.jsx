export default function AIAnalysisCard({ analysis, loading }) {
  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        backgroundColor: '#0f0f2a',
        border: '2px solid rgba(99,102,241,0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: '#818cf8', fontSize: '16px' }}>✦</span>
        <span className="text-sm font-semibold" style={{ color: '#818cf8' }}>
          AI Analysis
        </span>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 rounded-full" style={{ backgroundColor: '#1e1e3a', width: '92%' }} />
          <div className="h-3 rounded-full" style={{ backgroundColor: '#1e1e3a', width: '85%' }} />
          <div className="h-3 rounded-full" style={{ backgroundColor: '#1e1e3a', width: '78%' }} />
          <div className="h-3 rounded-full" style={{ backgroundColor: '#1e1e3a', width: '88%' }} />
        </div>
      ) : analysis ? (
        <>
          <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
            {analysis}
          </p>
          {/* Subtle bottom gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 h-4 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, #0f0f2a, transparent)',
            }}
          />
        </>
      ) : (
        <p className="text-sm" style={{ color: '#64748b' }}>
          No analysis available yet.
        </p>
      )}
    </div>
  )
}
