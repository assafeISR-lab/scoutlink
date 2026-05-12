export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-9 w-36 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-4 w-52 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      <div className="space-y-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="rounded-2xl border p-5 flex items-center gap-4" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,153,67,0.12)' }} />
            <div className="flex-1">
              <div className="h-4 w-48 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="h-3 w-32 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div className="h-3 w-20 rounded flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
