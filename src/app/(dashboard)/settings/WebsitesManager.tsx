'use client'

const SCRAPERS = [
  {
    name: 'Transfermarkt',
    url: 'https://www.transfermarkt.com',
    domain: 'transfermarkt.com',
    fields: ['Nationality', 'Passports', 'Preferred Foot', 'Age', 'Date of Birth', 'Height', 'Weight', 'Team / Club', 'League', 'Joining Date', 'Contract Expiry', 'Season Stats', 'Market Value'],
    color: '#1a6b3c',
    accent: '#2db570',
  },
  {
    name: 'Sofascore',
    url: 'https://www.sofascore.com',
    domain: 'sofascore.com',
    fields: ['Position', 'Heat Map', 'Key Strengths', 'Areas for Improvement'],
    color: '#1a3a6b',
    accent: '#3a7bd5',
  },
  {
    name: 'FMInside',
    url: 'https://www.fminside.net',
    domain: 'fminside.net',
    fields: ['FM Wages', 'Key Strengths', 'Areas for Improvement'],
    color: '#3a1a6b',
    accent: '#7b3ad5',
  },
]

export default function WebsitesManager() {
  return (
    <div className="rounded-2xl border border-white/5 overflow-hidden" style={{
      background: 'var(--card-bg)',
      boxShadow: 'var(--card-shadow)',
    }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(108,143,255,0.12)', border: '1px solid rgba(108,143,255,0.25)' }}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#6c8fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Scouting Websites</h2>
          <p className="text-xs text-white/30">3 data sources used for player scouting</p>
        </div>
      </div>

      {/* Scrapers */}
      <div className="divide-y divide-white/5">
        {SCRAPERS.map(s => (
          <div key={s.name} className="px-6 py-4 flex items-start gap-4">
            {/* Colour dot */}
            <div className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.accent }} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-sm font-semibold text-white">{s.name}</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md transition-colors hover:text-white/60"
                  style={{ color: 'var(--text-faint)', background: 'var(--hover-bg)' }}
                >
                  {s.domain} ↗
                </a>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.fields.map(f => (
                  <span
                    key={f}
                    className="text-[10px] px-2 py-0.5 rounded-md"
                    style={{ color: s.accent, background: `${s.accent}18`, border: `1px solid ${s.accent}30` }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Active badge */}
            <div
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
              style={{ background: 'rgba(0,200,150,0.1)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Active
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="px-6 py-3 border-t border-white/5" style={{ background: 'var(--subtle-bg)' }}>
        <p className="text-[10px] text-white/20">
          Data sources are fixed and managed automatically by ScoutLink. Configure which fields to show in Search Parameters.
        </p>
      </div>
    </div>
  )
}
