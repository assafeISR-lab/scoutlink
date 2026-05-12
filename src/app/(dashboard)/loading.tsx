export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Page heading */}
      <div className="mb-8">
        <div className="h-9 w-56 rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-4 w-72 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl p-5 border" style={{
            background: 'var(--card-bg)',
            borderColor: 'rgba(255,255,255,0.07)',
          }}>
            <div className="w-9 h-9 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="h-8 w-16 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <div className="h-3 w-28 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}
      </div>

      {/* Main content card */}
      <div className="rounded-2xl border p-6" style={{
        background: 'var(--card-bg)',
        borderColor: 'rgba(255,255,255,0.07)',
      }}>
        <div className="h-4 w-32 rounded mb-6" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="h-3 rounded flex-1" style={{ background: 'rgba(255,255,255,0.05)', maxWidth: `${60 + i * 8}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
