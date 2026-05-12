export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-9 w-52 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-4 w-80 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-28 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
        ))}
      </div>
      <div className="h-64 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
    </div>
  )
}
