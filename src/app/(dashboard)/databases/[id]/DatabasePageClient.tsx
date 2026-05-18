'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PlayersTable, { PlayersTableHandle } from './PlayersTable'
import AddPlayerButton from './AddPlayerButton'
import ColumnPicker from './ColumnPicker'
import ImportPlayersModal from '../ImportPlayersModal'
import ListAISearch from './ListAISearch'

interface Player {
  id: string
  firstName: string
  lastName: string
  middleName: string | null
  position: string | null
  clubName: string | null
  nationality: string | null
  agentName: string | null
  dateOfBirth: string | null
  heightCm: number | null
  marketValue: number | null
  playsNational: boolean
  available: boolean
  createdAt: string
  customFields: { fieldName: string; value: string }[]
}

interface Props {
  players: Player[]
  databaseId: string
  databaseName: string
  ownerName: string
  isOwner: boolean
  canEdit: boolean
  columnConfig: string[] | null
  allDatabases: { id: string; name: string }[]
}

export default function DatabasePageClient({ players, databaseId, databaseName, ownerName, isOwner, canEdit, columnConfig: initialColumnConfig, allDatabases }: Props) {
  const tableRef = useRef<PlayersTableHandle>(null)
  const [colConfig, setColConfig] = useState<string[] | null>(initialColumnConfig)
  const [showImport, setShowImport] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  return (
    <>
      {/* Header — compact single row */}
      <div className="flex items-center gap-3 mb-4">
        {/* Left: breadcrumb + name + count */}
        <div className="flex items-center gap-2 min-w-0 mr-auto">
          <Link href="/databases" className="text-xs transition-colors flex-shrink-0" style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
            Lists
          </Link>
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-faint)' }}>/</span>
          <h1 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{databaseName}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium" style={{ background: 'var(--subtle-bg)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
            {players.length} {players.length !== 1 ? 'players' : 'player'}
          </span>
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-faint)' }}>
            · {isOwner ? 'Owner' : `Shared by ${ownerName}`}
          </span>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ColumnPicker
            databaseId={databaseId}
            columnConfig={colConfig}
            onUpdate={setColConfig}
          />
          {canEdit && (
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--subtle-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              Import
            </button>
          )}
          {players.length > 0 && (
            <button
              onClick={() => tableRef.current?.openCreateReport()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,159,67,0.12)', color: '#ff9f43', border: '1px solid rgba(255,159,67,0.25)' }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              Create Report
            </button>
          )}
          {canEdit && <AddPlayerButton databaseId={databaseId} />}
          {isOwner && (
            <>
              <div className="w-px h-5 flex-shrink-0" style={{ background: 'var(--border)' }} />
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                Delete List
              </button>
            </>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid rgba(239,68,68,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#ef4444">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white text-center mb-2">Delete &ldquo;{databaseName}&rdquo;?</h3>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
              This will permanently delete all {players.length} player{players.length !== 1 ? 's' : ''} in this list. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleting(true)
                  await fetch(`/api/databases/${databaseId}`, { method: 'DELETE' })
                  window.dispatchEvent(new Event('scoutlink:db-deleted'))
                  router.push('/databases')
                }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                {deleting ? 'Deleting…' : 'Delete List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-list AI search */}
      {players.length > 0 && <ListAISearch databaseId={databaseId} />}

      {/* Content */}
      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#00c89615', border: '1px solid #00c89630' }}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#00c896"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <p className="text-white/40 text-sm mb-1">No players yet</p>
          <p className="text-white/20 text-xs">Click "Add Player" to add your first player</p>
        </div>
      ) : (
        <PlayersTable
          ref={tableRef}
          players={players}
          databaseId={databaseId}
          databaseName={databaseName}
          canEdit={canEdit}
          columnConfig={colConfig}
        />
      )}

      {showImport && (
        <ImportPlayersModal
          onClose={() => setShowImport(false)}
          databases={allDatabases}
          preselectedDatabaseId={databaseId}
        />
      )}
    </>
  )
}
