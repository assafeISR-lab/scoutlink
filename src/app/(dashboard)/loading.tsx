export default function DashboardLoading() {
  return (
    <div style={{ width: '100%' }}>
      {/* Animated progress bar */}
      <div style={{ position: 'relative', height: 3, overflow: 'hidden', borderRadius: 2, background: 'var(--hover-bg)', marginBottom: 36 }}>
        <div style={{
          position: 'absolute',
          top: 0,
          width: '45%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, #00c896, rgba(0,200,150,0.4))',
          animation: 'sl-progress 1.4s ease-in-out infinite',
        }} />
      </div>

      {/* Page header skeleton */}
      <div className="animate-pulse flex items-center gap-3 mb-6">
        <div style={{ width: 3, height: 44, borderRadius: 2, background: 'rgba(0,200,150,0.25)' }} />
        <div>
          <div className="h-6 w-44 rounded-lg mb-2" style={{ background: 'var(--hover-bg)' }} />
          <div className="h-3.5 w-28 rounded" style={{ background: 'var(--subtle-bg)' }} />
        </div>
      </div>

      {/* Content area skeleton */}
      <div className="animate-pulse rounded-2xl border" style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        height: 'calc(100vh - 200px)',
      }} />
    </div>
  )
}
