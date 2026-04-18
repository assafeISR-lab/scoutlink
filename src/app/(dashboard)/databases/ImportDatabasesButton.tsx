'use client'

import { useState } from 'react'
import ImportPlayersModal from './ImportPlayersModal'

interface Database { id: string; name: string }

export default function ImportDatabasesButton({ databases }: { databases: Database[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'rgba(108,143,255,0.12)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.25)' }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
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
