import ScoutLinkBallLoader from '@/components/ScoutLinkBallLoader'

export default function Loading() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="animate-pulse flex items-center gap-2 mb-6">
        <div className="h-3 w-14 rounded" style={{ background: 'var(--hover-bg)' }} />
        <div className="h-3 w-2 rounded" style={{ background: 'var(--subtle-bg)' }} />
        <div className="h-3 w-36 rounded" style={{ background: 'var(--hover-bg)' }} />
      </div>

      {/* Report header card */}
      <div className="animate-pulse rounded-2xl border p-6 mb-6" style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="h-7 w-52 rounded-xl mb-2" style={{ background: 'var(--hover-bg)' }} />
            <div className="h-3 w-36 rounded" style={{ background: 'var(--subtle-bg)' }} />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-xl" style={{ background: 'var(--hover-bg)' }} />
            <div className="h-9 w-20 rounded-xl" style={{ background: 'rgba(255,80,80,0.08)' }} />
          </div>
        </div>
      </div>

      {/* Players area with ball */}
      <div className="rounded-2xl border flex flex-col items-center justify-center gap-4 py-14" style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}>
        <ScoutLinkBallLoader size={72} />
        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Loading report…</p>
      </div>
    </div>
  )
}
