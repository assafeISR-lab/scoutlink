import ScoutLinkBallLoader from '@/components/ScoutLinkBallLoader'

export default function Loading() {
  return (
    <div>
      <div className="animate-pulse mb-8">
        <div className="h-9 w-64 rounded-xl mb-2" style={{ background: 'var(--hover-bg)' }} />
        <div className="h-4 w-80 rounded-lg" style={{ background: 'var(--subtle-bg)' }} />
      </div>

      {/* Stat card outlines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="animate-pulse rounded-2xl p-5 border" style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border)',
          }}>
            <div className="w-9 h-9 rounded-xl mb-4" style={{ background: 'var(--hover-bg)' }} />
            <div className="h-8 w-12 rounded-lg mb-2" style={{ background: 'var(--hover-bg)' }} />
            <div className="h-3 w-24 rounded" style={{ background: 'var(--subtle-bg)' }} />
          </div>
        ))}
      </div>

      {/* Activity feed with ball */}
      <div className="rounded-2xl border flex flex-col items-center justify-center gap-4 py-14" style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}>
        <ScoutLinkBallLoader size={80} />
        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Loading activity…</p>
      </div>
    </div>
  )
}
