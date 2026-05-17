'use client'

import { useState, useRef, useEffect } from 'react'

interface Attr { name: string; value: string }

function parseFm(s: string): { strengths: Attr[]; improvements: Attr[] } {
  const parts = (s || '').split(' / ')
  const parseSection = (raw: string): Attr[] =>
    (raw || '').split(', ')
      .map(item => {
        const i = item.lastIndexOf(' ')
        if (i < 0) return { name: item.trim(), value: '' }
        const rawVal = item.slice(i + 1).trim()
        return { name: item.slice(0, i).trim(), value: rawVal.replace(/^[^0-9]+/, '') }
      })
      .filter(a => a.name.trim() !== '')
  return { strengths: parseSection(parts[0] ?? ''), improvements: parseSection(parts[1] ?? '') }
}

function serializeFm(strengths: Attr[], improvements: Attr[]): string {
  const ser = (arr: Attr[]) =>
    arr.filter(a => a.name.trim()).map(a => `${a.name.trim()} ${a.value.trim() || '0'}`).join(', ')
  const s = ser(strengths)
  const imp = ser(improvements)
  if (!s && !imp) return ''
  if (!imp) return s
  if (!s) return ` / ${imp}`
  return `${s} / ${imp}`
}

const initRows = (arr: Attr[]): Attr[] =>
  Array.from({ length: 7 }, (_, i) => arr[i] ?? { name: '', value: '' })

interface Props {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  autoFocus?: boolean
}

export default function FMAttributesEditor({ value, onChange, onBlur, autoFocus }: Props) {
  const parsed = parseFm(value)
  const [strengths, setStrengths] = useState<Attr[]>(() => initRows(parsed.strengths))
  const [improvements, setImprovements] = useState<Attr[]>(() => initRows(parsed.improvements))
  const containerRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && firstRef.current) firstRef.current.focus()
  }, [autoFocus])

  function update(type: 'strengths' | 'improvements', i: number, field: keyof Attr, val: string) {
    if (type === 'strengths') {
      const next = strengths.map((a, idx) => idx === i ? { ...a, [field]: val } : a)
      setStrengths(next)
      onChange(serializeFm(next, improvements))
    } else {
      const next = improvements.map((a, idx) => idx === i ? { ...a, [field]: val } : a)
      setImprovements(next)
      onChange(serializeFm(strengths, next))
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      onBlur?.()
    }
  }

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      onClick={e => e.stopPropagation()}
      className="rounded-lg p-2.5"
      style={{ background: 'rgba(0,200,150,0.04)', border: '1px solid rgba(0,200,150,0.2)' }}
    >
      {/* Key Strengths */}
      <p className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'rgba(0,200,150,0.7)' }}>
        Key Strengths
      </p>
      {strengths.map((a, i) => (
        <AttrInput
          key={i}
          attr={a}
          textColor="#00c896"
          focusColor="rgba(0,200,150,0.5)"
          rowRef={i === 0 ? firstRef : undefined}
          onChange={(f, v) => update('strengths', i, f, v)}
        />
      ))}

      <div className="h-px my-2" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Areas for Improvement */}
      <p className="text-[9px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: 'rgba(255,90,90,0.6)' }}>
        Areas for Improvement
      </p>
      {improvements.map((a, i) => (
        <AttrInput
          key={i}
          attr={a}
          textColor="rgba(255,90,90,0.9)"
          focusColor="rgba(255,90,90,0.5)"
          onChange={(f, v) => update('improvements', i, f, v)}
        />
      ))}
    </div>
  )
}

function AttrInput({ attr, textColor, focusColor, rowRef, onChange }: {
  attr: Attr
  textColor: string
  focusColor: string
  rowRef?: React.RefObject<HTMLInputElement | null>
  onChange: (field: keyof Attr, val: string) => void
}) {
  const base: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    color: 'var(--text-primary)',
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = focusColor
    e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
  }
  const onBlurInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
  }

  return (
    <div className="flex items-center gap-1 mb-[3px]">
      <input
        ref={rowRef}
        value={attr.name}
        onChange={e => onChange('name', e.target.value)}
        placeholder="Attribute name"
        className="flex-1 text-[10px] rounded px-1.5 py-[2px] focus:outline-none"
        style={{ ...base, caretColor: textColor }}
        onFocus={onFocus}
        onBlur={onBlurInput}
      />
      <input
        value={attr.value}
        onChange={e => {
          const n = e.target.value === '' ? '' : String(Math.min(100, Math.max(0, Number(e.target.value))))
          onChange('value', n)
        }}
        placeholder="—"
        type="number"
        min={0}
        max={100}
        className="text-[10px] rounded px-1 py-[2px] focus:outline-none text-center tabular-nums font-bold"
        style={{ ...base, width: 36, color: textColor, caretColor: textColor, colorScheme: 'dark' }}
        onFocus={onFocus}
        onBlur={onBlurInput}
      />
    </div>
  )
}
