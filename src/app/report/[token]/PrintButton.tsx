'use client'

import { useEffect } from 'react'

export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 800)
    return () => clearTimeout(t)
  }, [])
  return null
}

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        background: 'linear-gradient(135deg, #00c896, #00a878)',
        color: '#fff', border: 'none', borderRadius: 10,
        padding: '10px 24px', fontSize: 14, fontWeight: 600,
        cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,200,150,0.3)',
      }}
    >
      Print / Save as PDF
    </button>
  )
}
