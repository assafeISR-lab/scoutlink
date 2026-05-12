import ScoutLinkBallLoader from '@/components/ScoutLinkBallLoader'

export default function Loading() {
  return (
    <div>
      <div className="animate-pulse mb-8">
        <div className="h-9 w-36 rounded-xl mb-2" style={{ background: 'var(--hover-bg)' }} />
        <div className="h-4 w-56 rounded-lg" style={{ background: 'var(--subtle-bg)' }} />
      </div>

      {/* Tab bar outline */}
      <div className="animate-pulse flex gap-2 mb-6 pb-px border-b" style={{ borderColor: 'var(--border)' }}>
        {[130, 110, 90].map((w, i) => (
          <div key={i} className="h-9 rounded-t-lg" style={{
            width: w,
            background: i === 0 ? 'rgba(0,200,150,0.1)' : 'var(--subtle-bg)',
          }} />
        ))}
      </div>

      <div className="rounded-2xl border flex flex-col items-center justify-center gap-4 py-16" style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}>
        <ScoutLinkBallLoader size={72} />
        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Loading settings…</p>
      </div>
    </div>
  )
}
