export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-9 w-56 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-4 w-72 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="h-11 flex-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
        <div className="h-11 w-32 rounded-xl" style={{ background: 'rgba(0,200,150,0.15)' }} />
      </div>

      {/* Sites checkboxes row */}
      <div className="flex gap-3 mb-8">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-8 w-28 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }} />
        ))}
      </div>

      {/* Empty results hint */}
      <div className="rounded-2xl border p-12 text-center" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="w-12 h-12 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-4 w-48 rounded mx-auto" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  )
}
