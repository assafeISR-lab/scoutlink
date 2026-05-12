export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-9 w-36 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-4 w-64 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      <div className="rounded-2xl border p-6" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }}>
        {/* Month header */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-32 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="w-8 h-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {[0,1,2,3,4,5,6].map(i => (
            <div key={i} className="h-4 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>

        {/* Calendar grid */}
        {[0,1,2,3,4].map(row => (
          <div key={row} className="grid grid-cols-7 gap-1 mb-1">
            {[0,1,2,3,4,5,6].map(col => (
              <div key={col} className="h-14 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
