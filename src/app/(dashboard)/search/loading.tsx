import ScoutLinkBallLoader from '@/components/ScoutLinkBallLoader'

export default function Loading() {
  return (
    <div>
      <div className="animate-pulse mb-8">
        <div className="h-9 w-56 rounded-xl mb-2" style={{ background: 'var(--hover-bg)' }} />
        <div className="h-4 w-72 rounded-lg" style={{ background: 'var(--subtle-bg)' }} />
      </div>

      {/* Search bar outline */}
      <div className="animate-pulse flex gap-3 mb-6">
        <div className="h-11 flex-1 rounded-xl" style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }} />
        <div className="h-11 w-32 rounded-xl" style={{ background: 'rgba(0,200,150,0.12)' }} />
      </div>

      {/* Site pills */}
      <div className="animate-pulse flex gap-3 mb-8">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-8 w-28 rounded-xl" style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }} />
        ))}
      </div>

      {/* Results area with ball */}
      <div className="rounded-2xl border flex flex-col items-center justify-center gap-4 py-20" style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}>
        <ScoutLinkBallLoader size={88} />
        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Searching players…</p>
      </div>
    </div>
  )
}
