import ScoutLinkBallLoader from '@/components/ScoutLinkBallLoader'

export default function Loading() {
  return (
    <div>
      <div className="animate-pulse flex items-start justify-between mb-8">
        <div>
          <div className="h-9 w-60 rounded-xl mb-2" style={{ background: 'var(--hover-bg)' }} />
          <div className="h-4 w-44 rounded-lg" style={{ background: 'var(--subtle-bg)' }} />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-28 rounded-xl" style={{ background: 'var(--hover-bg)' }} />
          <div className="h-9 w-36 rounded-xl" style={{ background: 'rgba(0,200,150,0.12)' }} />
        </div>
      </div>

      <div className="animate-pulse h-3 w-24 rounded mb-4" style={{ background: 'var(--hover-bg)' }} />

      {/* Database cards with ball */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-2xl border flex flex-col items-center justify-center gap-3 py-10" style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border)',
          }}>
            <ScoutLinkBallLoader size={56} />
          </div>
        ))}
      </div>
    </div>
  )
}
