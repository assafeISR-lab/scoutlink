import ScoutLinkBallLoader from '@/components/ScoutLinkBallLoader'

export default function Loading() {
  return (
    <div>
      <div className="animate-pulse flex items-center justify-between mb-6">
        <div>
          <div className="h-9 w-48 rounded-xl mb-2" style={{ background: 'var(--hover-bg)' }} />
          <div className="h-4 w-32 rounded-lg" style={{ background: 'var(--subtle-bg)' }} />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-xl" style={{ background: 'var(--hover-bg)' }} />
          <div className="h-9 w-28 rounded-xl" style={{ background: 'rgba(0,200,150,0.1)' }} />
          <div className="h-9 w-32 rounded-xl" style={{ background: 'rgba(255,153,67,0.1)' }} />
        </div>
      </div>

      {/* Table with column headers + ball */}
      <div className="rounded-2xl border overflow-hidden" style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}>
        <div className="animate-pulse flex gap-6 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          {[100, 80, 70, 80, 90, 60].map((w, i) => (
            <div key={i} className="h-3 rounded flex-shrink-0" style={{ width: w, background: 'var(--hover-bg)' }} />
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-14">
          <ScoutLinkBallLoader size={80} />
          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Loading players…</p>
        </div>
      </div>
    </div>
  )
}
