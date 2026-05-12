export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-9 w-48 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-4 w-32 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-9 w-28 rounded-xl" style={{ background: 'rgba(0,200,150,0.12)' }} />
          <div className="h-9 w-32 rounded-xl" style={{ background: 'rgba(255,153,67,0.12)' }} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }}>
        {/* Column headers */}
        <div className="flex gap-4 px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {[100, 80, 70, 80, 90, 70].map((w, i) => (
            <div key={i} className="h-3 rounded flex-shrink-0" style={{ width: w, background: 'rgba(255,255,255,0.07)' }} />
          ))}
        </div>
        {/* Rows */}
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="flex gap-4 px-5 py-4 border-b items-center" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: 'rgba(0,200,150,0.12)' }} />
            {[80, 60, 55, 65, 70, 50].map((w, j) => (
              <div key={j} className="h-3 rounded flex-shrink-0" style={{ width: w, background: 'rgba(255,255,255,0.05)' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
