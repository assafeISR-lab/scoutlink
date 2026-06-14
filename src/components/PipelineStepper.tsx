'use client'

import { useState } from 'react'

export const STAGE_ORDER = ['spotted', 'approached', 'represented', 'in_market', 'placed', 'passed']

export const PIPELINE_LABELS: Record<string, string> = {
  spotted:      'Spotted',
  approached:   'Approached',
  represented:  'Represented',
  in_market:    'In Market',
  placed:       'Placed',
  passed:       'Passed',
}

export const PIPELINE_STAGE_OPTIONS = [
  'Spotted', 'Approached', 'Represented', 'In Market', 'Placed', 'Passed',
]

export const PIPELINE_KEY_TO_LABEL: Record<string, string> = PIPELINE_LABELS
export const PIPELINE_LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(PIPELINE_LABELS).map(([k, v]) => [v, k])
)

const TERMINAL    = ['placed', 'passed']
const MAIN_STAGES = ['spotted', 'approached', 'represented', 'in_market']
const NOTCH       = 13    // px — depth of left notch / right arrow point
const CHEVRON_H   = 36    // px — height of each main chevron
const TERMINAL_H  = 17    // px — height of each terminal mini-chevron (2 × 17 + 2 gap = 36)

const LABEL_FONT: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase',
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  spotted:      'Player has been identified as a potential target',
  approached:   'Initial contact made with the player or their representative',
  represented:  'You currently represent this player',
  in_market:    'Player is actively available for transfer or signing',
  placed:       'Player has been successfully placed at a club',
  passed:       'Player is not being pursued further at this time',
}

const GROUP_LABEL: Record<string, string> = {}

interface Props {
  status: string | null
  onChange: (s: string) => void
  canEdit: boolean
  hints?: Partial<Record<string, string>>
}

// Defined at module level to prevent React from remounting on every parent render
function StageTooltip({ stageKey, isActive }: { stageKey: string; isActive: boolean }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(100% + 10px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      pointerEvents: 'none',
      minWidth: 170,
      maxWidth: 230,
    }}>
      <div style={{
        background: 'var(--card-solid)',
        border: '1px solid var(--border-strong)',
        borderRadius: 8,
        padding: '7px 11px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
      }}>
        <p style={{ ...LABEL_FONT, color: isActive ? '#00c896' : 'var(--text-primary)', marginBottom: 4 }}>
          {PIPELINE_LABELS[stageKey]}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45, fontWeight: 400 }}>
          {STAGE_DESCRIPTIONS[stageKey]}
        </p>
      </div>
      {/* Caret outer (border color) */}
      <div style={{
        position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '6px solid var(--border-strong)',
      }} />
      {/* Caret inner (fill color) */}
      <div style={{
        position: 'absolute', top: 'calc(100% - 1px)', left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid var(--card-solid)',
      }} />
    </div>
  )
}

function chevronClip(isFirst: boolean): string {
  if (isFirst) {
    return `polygon(0% 0%, calc(100% - ${NOTCH}px) 0%, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0% 100%)`
  }
  return `polygon(${NOTCH}px 0%, calc(100% - ${NOTCH}px) 0%, 100% 50%, calc(100% - ${NOTCH}px) 100%, ${NOTCH}px 100%, 0% 50%)`
}

export default function PipelineStepper({ status, onChange, canEdit, hints }: Props) {
  const currentIdx = STAGE_ORDER.indexOf(status ?? '')
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  function chevronBg(key: string): string {
    if (status === key) return '#00c896'
    if (STAGE_ORDER.indexOf(key) < currentIdx) return 'rgba(0,200,150,0.22)'
    if (hoveredKey === key) return 'var(--hover-bg)'
    return 'var(--subtle-bg)'
  }

  function chevronColor(key: string): string {
    if (status === key) return '#fff'
    if (STAGE_ORDER.indexOf(key) < currentIdx) return '#00c896'
    return 'var(--text-muted)'
  }

  const activeHints = Object.entries(hints ?? {}).filter(([, text]) => !!text)

  // group label row: lineHeight 13px + marginBottom 4px = 17px
  const GROUP_ROW_H = 17

  return (
    <div style={{
      padding: '12px 18px 12px',
      borderBottom: '1px solid var(--border-strong)',
      background: 'rgba(0,200,150,0.025)',
    }}>
      {/* Section header */}
      <p style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.9px',
        textTransform: 'uppercase',
        color: 'var(--text-primary)',
        borderLeft: '2px solid #00c896',
        paddingLeft: 8,
        marginBottom: 10,
        lineHeight: '12px',
      }}>
        CRM Pipeline
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>

        {/* Main flow stages */}
        {MAIN_STAGES.map((key, i) => {
          const isFirst    = i === 0
          const groupLabel = GROUP_LABEL[key]
          const active     = status === key
          const hint       = hints?.[key]

          return (
            <div key={key} style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              marginLeft: isFirst ? 0 : -NOTCH,
              position: 'relative',
              zIndex: i + 1,
            }}>
              {/* Group label or invisible spacer */}
              <span style={{
                ...LABEL_FONT,
                fontSize: 9,
                color: 'var(--text-primary)',
                lineHeight: '13px',
                marginBottom: 4,
                paddingLeft: isFirst ? 6 : NOTCH + 5,
                visibility: groupLabel ? 'visible' : 'hidden',
                whiteSpace: 'nowrap',
                display: 'block',
              }}>
                {groupLabel ?? 'x'}
              </span>

              {/* Chevron button */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                {hoveredKey === key && <StageTooltip stageKey={key} isActive={active} />}

                <button
                  type="button"
                  onClick={() => { if (canEdit) onChange(key) }}
                  style={{
                    width: '100%',
                    height: CHEVRON_H,
                    background: chevronBg(key),
                    clipPath: chevronClip(isFirst),
                    border: 'none',
                    cursor: canEdit ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingLeft: isFirst ? 8 : NOTCH + 4,
                    paddingRight: NOTCH + 6,
                    transition: 'background 0.15s ease',
                    position: 'relative',
                  }}
                >
                  <span style={{
                    ...LABEL_FONT,
                    fontSize: 10,
                    color: chevronColor(key),
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {PIPELINE_LABELS[key]}
                  </span>

                  {hint && (
                    <div style={{
                      position: 'absolute',
                      top: 6,
                      right: NOTCH + 5,
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#f59e0b',
                    }} />
                  )}
                </button>
              </div>
            </div>
          )
        })}

        {/* Terminal outcomes: Placed / Passed — two mini-chevrons stacked, connected into the flow */}
        <div style={{
          flexShrink: 0,
          marginLeft: -NOTCH,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          paddingTop: GROUP_ROW_H,
          zIndex: MAIN_STAGES.length + 1,
          position: 'relative',
          width: 76,
        }}>
          {TERMINAL.map(key => {
            const active    = status === key
            const isPlaced  = key === 'placed'
            const isHovered = hoveredKey === key
            const completed = STAGE_ORDER.indexOf(key) < currentIdx

            let bg: string
            let color: string
            if (active) {
              bg    = isPlaced ? '#00c896' : '#ef4444'
              color = '#fff'
            } else if (completed) {
              bg    = isPlaced ? 'rgba(0,200,150,0.22)' : 'rgba(239,68,68,0.12)'
              color = isPlaced ? '#00c896' : '#ef4444'
            } else {
              bg    = isHovered ? 'var(--hover-bg)' : 'var(--subtle-bg)'
              color = 'var(--text-muted)'
            }

            const clip = `polygon(${NOTCH}px 0%, 100% 0%, 100% 100%, ${NOTCH}px 100%, 0% 50%)`

            return (
              <div key={key} style={{ position: 'relative' }}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}>
                {isHovered && <StageTooltip stageKey={key} isActive={active} />}
                <button type="button"
                  onClick={() => { if (canEdit) onChange(key) }}
                  style={{
                    width: '100%',
                    height: TERMINAL_H,
                    background: bg,
                    clipPath: clip,
                    border: 'none',
                    cursor: canEdit ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: NOTCH + 5,
                    paddingRight: 6,
                    transition: 'background 0.15s ease',
                  }}>
                  <span style={{
                    ...LABEL_FONT,
                    fontSize: 9,
                    color,
                    whiteSpace: 'nowrap',
                  }}>
                    {PIPELINE_LABELS[key]}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Always-visible hints */}
      {activeHints.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {activeHints.map(([key, text]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: '#f59e0b' }}>💡</span>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', fontStyle: 'italic' }}>{text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
