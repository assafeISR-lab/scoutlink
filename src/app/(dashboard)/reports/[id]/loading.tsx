export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-3 w-14 rounded" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="h-3 w-1 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-3 w-32 rounded" style={{ background: 'rgba(255,255,255,0.07)' }} />
      </div>

      {/* Report header */}
      <div className="rounded-2xl border p-6 mb-6" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="h-7 w-56 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-3 w-40 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-9 w-20 rounded-xl" style={{ background: 'rgba(255,80,80,0.1)' }} />
          </div>
        </div>
      </div>

      {/* Player rows */}
      {[0,1,2,3].map(i => (
        <div key={i} className="rounded-2xl border p-4 mb-3 flex items-center gap-4" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: 'rgba(0,200,150,0.12)' }} />
          <div className="flex-1">
            <div className="h-4 w-36 rounded-lg mb-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-3 w-24 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
          <div className="h-3 w-16 rounded flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      ))}
    </div>
  )
}
