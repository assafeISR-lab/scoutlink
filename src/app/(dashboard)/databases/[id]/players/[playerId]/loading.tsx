export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        {[60, 4, 80, 4, 100].map((w, i) => (
          <div key={i} className="h-3 rounded flex-shrink-0" style={{ width: w, background: 'rgba(255,255,255,0.07)' }} />
        ))}
      </div>

      {/* Page header */}
      <div className="mb-6">
        <div className="h-9 w-40 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="h-4 w-64 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* Player card */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }}>
        {/* Card header */}
        <div className="p-6 border-b flex items-center gap-5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="w-16 h-16 rounded-2xl flex-shrink-0" style={{ background: 'rgba(0,200,150,0.15)' }} />
          <div className="flex-1">
            <div className="h-7 w-48 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-5 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-xl" style={{ background: 'rgba(0,200,150,0.1)' }} />
            <div className="h-9 w-24 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        </div>

        {/* 3-col body */}
        <div className="grid grid-cols-3 divide-x p-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {[0,1,2].map(col => (
            <div key={col} className="p-5 space-y-3">
              <div className="h-3 w-20 rounded mb-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
              {[0,1,2,3].map(row => (
                <div key={row} className="flex justify-between">
                  <div className="h-3 w-20 rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  <div className="h-3 w-16 rounded" style={{ background: 'rgba(255,255,255,0.07)' }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
