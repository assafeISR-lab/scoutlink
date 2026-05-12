export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-9 w-64 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-4 w-80 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl p-5 border" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="w-9 h-9 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-8 w-14 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-3 w-28 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-6" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="h-3 w-28 rounded mb-6" style={{ background: 'rgba(255,255,255,0.08)' }} />
        {[80, 65, 72, 55, 68].map((w, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }} />
            <div className="h-3 rounded flex-1" style={{ background: 'rgba(255,255,255,0.05)', maxWidth: `${w}%` }} />
            <div className="h-2 w-8 rounded flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
