import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PrintButton, { AutoPrint } from './PrintButton'

function getCF(customFields: { fieldName: string; value: string }[], name: string): string {
  return customFields.find(f => f.fieldName === name)?.value ?? ''
}

function calcAge(dob: Date | null): number | null {
  if (!dob) return null
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

export default async function PublicReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const { token } = await params
  const { print } = await searchParams

  const report = await prisma.playerReport.findUnique({
    where: { shareToken: token },
    include: {
      player: { include: { customFields: true } },
      agent: { include: { branding: true } },
    },
  })

  if (!report || !report.reportFinalized) return notFound()

  const p = report.player
  const branding = report.agent.branding
  const age = calcAge(p.dateOfBirth)
  const photo = getCF(p.customFields, 'photo')
  const foot = getCF(p.customFields, 'foot')
  const league = getCF(p.customFields, 'league')
  const contractExpiry = getCF(p.customFields, 'contractExpiry')
  const passports = getCF(p.customFields, 'passports')

  const generatedDate = new Date(report.updatedAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const autoPrint = print === '1'

  return (
    <>
      {/* Auto-print trigger */}
      {autoPrint && <AutoPrint />}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .report-card { box-shadow: none !important; border: none !important; }
        }
        body { background: #f0f4f8; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '32px 16px' }}>
        <div className="report-card" style={{
          maxWidth: 760,
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          overflow: 'hidden',
        }}>

          {/* Top accent bar */}
          <div style={{ height: 4, background: 'linear-gradient(90deg, #00c896, #00a878)' }} />

          {/* Scout branding header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 28px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {branding?.logoUrl && (
                <img
                  src={branding.logoUrl}
                  alt="Agency logo"
                  style={{ height: 44, width: 'auto', objectFit: 'contain', borderRadius: 6 }}
                />
              )}
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  {branding?.agencyName ?? report.agent.fullName}
                </p>
                {branding?.signatureLine && (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{branding.signatureLine}</p>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Player Report</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{generatedDate}</p>
            </div>
          </div>

          {/* Player header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '24px 28px', borderBottom: '1px solid #e2e8f0' }}>
            {photo ? (
              <img
                src={photo}
                alt={`${p.firstName} ${p.lastName}`}
                referrerPolicy="no-referrer"
                style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg, #00c896, #00a878)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 800, color: '#000',
              }}>
                {p.firstName[0]}{p.lastName[0]}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
                {p.firstName} {p.lastName}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: 13 }}>
                {p.position && (
                  <span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 12 }}>
                    {p.position}
                  </span>
                )}
                {p.clubName && <span style={{ color: '#475569' }}>⚽ {p.clubName}</span>}
                {league && <span style={{ color: '#00a878', fontWeight: 600 }}>{league}</span>}
                {p.nationality && <span style={{ color: '#475569' }}>🌍 {p.nationality}</span>}
                {passports && passports !== p.nationality && <span style={{ color: '#475569' }}>🛂 {passports}</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 8, fontSize: 12, color: '#64748b' }}>
                {age && <span>Age: <strong style={{ color: '#0f172a' }}>{age}</strong></span>}
                {p.heightCm && <span>Height: <strong style={{ color: '#0f172a' }}>{p.heightCm} cm</strong></span>}
                {foot && <span>Foot: <strong style={{ color: '#0f172a' }}>{foot}</strong></span>}
                {contractExpiry && <span>Contract: <strong style={{ color: '#0f172a' }}>{contractExpiry}</strong></span>}
                {p.marketValue && <span>Value: <strong style={{ color: '#0f172a' }}>€{(p.marketValue / 1_000_000).toFixed(1)}M</strong></span>}
              </div>
            </div>
          </div>

          {/* Report body */}
          <div style={{ padding: '28px 28px 24px' }}>
            <p style={{ margin: '0 0 16px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Player Analysis
            </p>
            <div style={{
              fontSize: 14, lineHeight: 1.75, color: '#1e293b',
              whiteSpace: 'pre-wrap', fontFamily: 'inherit',
            }}>
              {report.reportDraft}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{report.agent.fullName}</p>
              {branding?.agencyName && <p style={{ margin: '2px 0 0' }}>{branding.agencyName}</p>}
              <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                {branding?.phone && <span>{branding.phone}</span>}
                {branding?.email && <span>{branding.email}</span>}
                {branding?.website && <span>{branding.website}</span>}
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
              <p style={{ margin: 0 }}>Generated by ScoutLink</p>
              <p style={{ margin: '2px 0 0' }}>{generatedDate}</p>
            </div>
          </div>
        </div>

        {/* Print button — hidden on print */}
        <div className="no-print" style={{ textAlign: 'center', marginTop: 24 }}>
          <PrintButton />
        </div>
      </div>
    </>
  )
}
