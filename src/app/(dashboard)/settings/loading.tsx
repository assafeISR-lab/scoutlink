export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-9 w-36 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-4 w-56 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 border-b pb-px" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        {[120, 96, 80].map((w, i) => (
          <div key={i} className="h-9 rounded-t-lg" style={{ width: w, background: i === 0 ? 'rgba(0,200,150,0.12)' : 'rgba(255,255,255,0.05)' }} />
        ))}
      </div>

      {/* Settings rows */}
      <div className="rounded-2xl border p-6" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="h-4 w-36 rounded mb-6" style={{ background: 'rgba(255,255,255,0.08)' }} />
        {[0,1,2].map(i => (
          <div key={i} className="flex items-center justify-between py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <div>
              <div className="h-4 w-32 rounded mb-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <div className="h-3 w-48 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
            <div className="h-8 w-20 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
