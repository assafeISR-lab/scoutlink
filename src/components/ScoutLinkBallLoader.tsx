interface Props {
  size?: number
}

export default function ScoutLinkBallLoader({ size = 80 }: Props) {
  const border = Math.max(1, Math.round(size / 44))

  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      {/* Sphere — radial gradient simulates directional light from top-left */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `radial-gradient(circle at 38% 32%,
          #c8fff1 0%,
          #00c896 22%,
          #007a5e 50%,
          #003025 76%,
          #001510 100%)`,
        animation: 'sl-glow 2s ease-in-out infinite',
      }} />

      {/* Fixed highlight — light source stays still while ball spins */}
      <div style={{
        position: 'absolute',
        top: '10%', left: '16%',
        width: '30%', height: '22%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.7) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: `blur(${Math.max(2, Math.round(size / 28))}px)`,
        pointerEvents: 'none',
      }} />

      {/* Seam lines clipped to sphere — perspective makes rotateY look 3D */}
      <div style={{
        position: 'absolute', inset: 0,
        borderRadius: '50%', overflow: 'hidden',
        perspective: `${size * 3}px`,
        perspectiveOrigin: '50% 50%',
      }}>
        {/* Seam A — equatorial */}
        <div style={{
          position: 'absolute', inset: '7%', borderRadius: '50%',
          border: `${border}px solid rgba(0,0,0,0.45)`,
          animation: 'sl-sa 3s linear infinite',
        }} />
        {/* Seam B — tilted +58° */}
        <div style={{
          position: 'absolute', inset: '7%', borderRadius: '50%',
          border: `${border}px solid rgba(0,0,0,0.38)`,
          animation: 'sl-sb 3s linear infinite',
        }} />
        {/* Seam C — tilted -40°, offset phase */}
        <div style={{
          position: 'absolute', inset: '7%', borderRadius: '50%',
          border: `${border}px solid rgba(0,0,0,0.28)`,
          animation: 'sl-sc 4s linear infinite',
        }} />
      </div>
    </div>
  )
}
