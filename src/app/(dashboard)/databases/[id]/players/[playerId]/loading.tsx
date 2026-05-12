import ScoutLinkBallLoader from '@/components/ScoutLinkBallLoader'

export default function Loading() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="animate-pulse flex items-center gap-2 mb-6">
        {[60, 6, 80, 6, 110].map((w, i) => (
          <div key={i} className="h-3 rounded flex-shrink-0" style={{ width: w, background: i % 2 === 0 ? 'var(--hover-bg)' : 'var(--subtle-bg)' }} />
        ))}
      </div>

      {/* Page header */}
      <div className="animate-pulse mb-6">
        <div className="h-9 w-40 rounded-xl mb-2" style={{ background: 'var(--hover-bg)' }} />
        <div className="h-4 w-64 rounded-lg" style={{ background: 'var(--subtle-bg)' }} />
      </div>

      {/* Player card */}
      <div className="rounded-2xl border overflow-hidden" style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
      }}>
        {/* Card header — ball as avatar */}
        <div className="p-6 border-b flex items-center gap-5" style={{ borderColor: 'var(--border)' }}>
          {/* Ball stands in for the player photo/avatar */}
          <ScoutLinkBallLoader size={64} />
          <div className="flex-1 animate-pulse">
            <div className="h-7 w-44 rounded-xl mb-2" style={{ background: 'var(--hover-bg)' }} />
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded-full" style={{ background: 'var(--subtle-bg)' }} />
              <div className="h-5 w-24 rounded-full" style={{ background: 'var(--subtle-bg)' }} />
            </div>
          </div>
          <div className="animate-pulse flex gap-2">
            <div className="h-9 w-28 rounded-xl" style={{ background: 'rgba(0,200,150,0.1)' }} />
            <div className="h-9 w-24 rounded-xl" style={{ background: 'var(--hover-bg)' }} />
          </div>
        </div>

        {/* 3-col body skeleton */}
        <div className="grid grid-cols-3 animate-pulse">
          {[0, 1, 2].map(col => (
            <div key={col} className="p-5 border-r last:border-r-0" style={{ borderColor: 'var(--border)' }}>
              <div className="h-3 w-20 rounded mb-4" style={{ background: 'var(--hover-bg)' }} />
              {[0, 1, 2, 3].map(row => (
                <div key={row} className="flex justify-between mb-3">
                  <div className="h-3 w-20 rounded" style={{ background: 'var(--subtle-bg)' }} />
                  <div className="h-3 w-16 rounded" style={{ background: 'var(--hover-bg)' }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
