'use client'

import { useState } from 'react'
import WebsitesManager from './WebsitesManager'
import SearchParametersTab from './SearchParametersTab'

interface Website {
  id: string
  name: string
  url: string
  requiresLogin: boolean
  loginStatus: string
  username: string | null
  password: string | null
  isActive: boolean
  useForSearch: boolean
  country: string | null
  category: string | null
}

type Tab = 'websites' | 'parameters'

export default function SettingsClient({ websites }: { websites: Website[] }) {
  const [tab, setTab] = useState<Tab>('websites')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
        {([
          { key: 'websites',   label: 'Scouting Websites', icon: <IconGlobe /> },
          { key: 'parameters', label: 'Search Parameters',  icon: <IconList /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.key
              ? { background: 'rgba(0,200,150,0.15)', color: '#00c896', border: '1px solid rgba(0,200,150,0.25)' }
              : { color: 'var(--text-secondary)', border: '1px solid transparent' }
            }
          >
            <span className="w-4 h-4">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'websites'   && <WebsitesManager />}
      {tab === 'parameters' && <SearchParametersTab websites={websites} />}
    </div>
  )
}

function IconGlobe() {
  return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
}

function IconList() {
  return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg>
}
