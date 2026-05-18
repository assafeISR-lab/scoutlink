'use client'

import { useState } from 'react'
import ImportPlayersModal from './ImportPlayersModal'

interface Database { id: string; name: string }

export default function ImportDatabasesButton({ databases }: { databases: Database[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
        style={{ background: 'var(--subtle-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        Import
      </button>
      {open && (
        <ImportPlayersModal
          onClose={() => setOpen(false)}
          databases={databases}
        />
      )}
    </>
  )
}
