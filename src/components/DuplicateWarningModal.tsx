'use client'

export interface DuplicateMatch {
  matchedId: string
  matchedName: string
  clubName: string | null
  switched: boolean
}

interface Props {
  match: DuplicateMatch
  inputName: string
  listName?: string
  onSkip: () => void
  onCreateAnyway: () => void
}

export default function DuplicateWarningModal({ match, inputName, listName, onSkip, onCreateAnyway }: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onSkip}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Amber accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #f59e0b, #d97706)' }} />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#f59e0b">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Player Already Exists</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                {listName ? <>Already in <span style={{ color: '#f59e0b' }}>{listName}</span></> : 'Already exists in this list'}
              </p>
            </div>
          </div>

          {/* Match info */}
          <div
            className="px-3 py-2.5 rounded-xl mb-4"
            style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{match.matchedName}</span>
              {match.clubName && (
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{match.clubName}</span>
              )}
            </div>
            {match.switched && (
              <p className="text-[11px] mt-1" style={{ color: '#f59e0b' }}>
                ⚠ Name entered as "{inputName}" — first/last names may be switched
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2.5">
            <button
              onClick={onSkip}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              Cancel
            </button>
            <button
              onClick={onCreateAnyway}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)' }}
            >
              Add Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
