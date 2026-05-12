export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-9 w-60 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="h-4 w-44 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-28 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-9 w-36 rounded-xl" style={{ background: 'rgba(0,200,150,0.15)' }} />
        </div>
      </div>

      <div className="h-3 w-24 rounded mb-4" style={{ background: 'rgba(255,255,255,0.07)' }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-2xl p-5 border" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="h-5 w-14 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <div className="h-5 w-36 rounded-lg mb-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-3 w-20 rounded mt-3 pt-3 border-t" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
