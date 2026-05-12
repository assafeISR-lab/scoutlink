export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 w-48 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-4 w-64 rounded-lg mb-8" style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="rounded-2xl border h-64" style={{ background: 'var(--card-bg)', borderColor: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}
