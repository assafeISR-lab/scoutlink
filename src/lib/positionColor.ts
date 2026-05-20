type PillStyle = { background: string; color: string; border: string }

const POS_STYLE: PillStyle = { background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }

const KNOWN = new Set([
  // Goalkeeper
  'gk', 'goalkeeper',

  // Defenders
  'cb', 'dc', 'rb', 'dr', 'lb', 'dl', 'rwb', 'wbr', 'lwb', 'wbl', 'wb',
  'centre-back', 'center-back', 'right-back', 'left-back',
  'right wing-back', 'left wing-back', 'wing-back',

  // Defensive / Central Midfielders
  'cdm', 'dm', 'cm', 'mc', 'zm', 'om', 'ml', 'mr',
  'defensive mid', 'midfielder', 'left mid', 'right mid', 'central midfielder',

  // Attacking Midfielders
  'cam', 'am', 'amc',
  'attacking mid', 'attacking midfielder', 'trequartista',

  // Defensive / Central Midfielders (extra)
  'midfield', 'midfeild', 'mid field', 'mid feild', 'central midfield',

  // Wingers
  'lw', 'rw', 'lm', 'rm', 'aml', 'amr',
  'left winger', 'right winger', 'left wing', 'right wing',

  // Forwards / Strikers
  'st', 'cf', 'ss', 'sc', 'fc',
  'striker', 'stricker', 'centre-forward', 'center-forward', 'second striker', 'forward',

  // Misc / combined
  'cn',
])

export function positionPillStyle(pos: string | null | undefined): PillStyle | null {
  if (!pos) return null
  const parts = pos.trim().toLowerCase().split(/[\/,]/)
  return parts.some(p => {
    const t = p.trim()
    return KNOWN.has(t) || KNOWN.has(t.replace(/\s+/g, ''))
  }) ? POS_STYLE : null
}
