import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

function getCF(customFields: { fieldName: string; value: string }[], name: string): string {
  return customFields.find(f => f.fieldName === name)?.value ?? ''
}

function calcAge(dob: Date | null): string | null {
  if (!dob) return null
  return String(Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
}

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b', paddingBottom: 48 },
  // Top accent stripe
  stripe: { height: 4, backgroundColor: '#00c896' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '14 28 12 28', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, objectFit: 'contain' },
  agencyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  signatureLine: { fontSize: 9, color: '#64748b', marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerLabel: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  headerDate: { fontSize: 8, color: '#94a3b8', marginTop: 2 },
  // Player section
  playerSection: { flexDirection: 'row', alignItems: 'flex-start', padding: '16 28', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 16 },
  playerAvatar: { width: 64, height: 64, borderRadius: 8, objectFit: 'cover' },
  playerAvatarPlaceholder: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#00c896', alignItems: 'center', justifyContent: 'center' },
  playerAvatarInitials: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#000000' },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#0f172a', letterSpacing: -0.5, marginBottom: 6 },
  playerMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  positionBadge: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6366f1', backgroundColor: '#eef2ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  metaText: { fontSize: 9, color: '#475569' },
  metaGreen: { fontSize: 9, color: '#00a878', fontFamily: 'Helvetica-Bold' },
  playerStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4 },
  statItem: { fontSize: 9, color: '#64748b' },
  statValue: { fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  // Report body
  body: { padding: '20 28' },
  reportText: { fontSize: 10, lineHeight: 1.7, color: '#1e293b' },
  sectionHeader: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginTop: 12, marginBottom: 3 },
  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '10 28', borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  footerLeft: {},
  footerName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  footerMeta: { fontSize: 8, color: '#64748b', marginTop: 1 },
  footerRight: { alignItems: 'flex-end' },
  footerBrand: { fontSize: 8, color: '#94a3b8' },
})

// Parse the report text into segments so section headers render bold
function parseReportLines(text: string) {
  return text.split('\n').map((line, i) => {
    const isHeader = /^[A-Z][A-Z &]+:/.test(line.trim())
    return { line, isHeader, key: i }
  })
}

interface ReportDocProps {
  playerName: string
  firstName: string
  lastName: string
  position: string | null
  clubName: string | null
  league: string | null
  nationality: string | null
  age: string | null
  heightCm: number | null
  foot: string | null
  photo: string | null
  reportText: string
  agencyName: string | null
  logoUrl: string | null
  signatureLine: string | null
  scoutName: string
  phone: string | null
  email: string | null
  website: string | null
  generatedDate: string
}

function ReportDocument(p: ReportDocProps) {
  const lines = parseReportLines(p.reportText)
  const initials = `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Accent stripe */}
        <View style={styles.stripe} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {p.logoUrl && <Image src={p.logoUrl} style={styles.logo} />}
            <View>
              <Text style={styles.agencyName}>{p.agencyName ?? p.scoutName}</Text>
              {p.signatureLine && <Text style={styles.signatureLine}>{p.signatureLine}</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerLabel}>Scouting Report</Text>
            <Text style={styles.headerDate}>{p.generatedDate}</Text>
          </View>
        </View>

        {/* Player section */}
        <View style={styles.playerSection}>
          {p.photo
            ? <Image src={p.photo} style={styles.playerAvatar} />
            : (
              <View style={styles.playerAvatarPlaceholder}>
                <Text style={styles.playerAvatarInitials}>{initials}</Text>
              </View>
            )
          }
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{p.playerName}</Text>
            <View style={styles.playerMeta}>
              {p.position && <Text style={styles.positionBadge}>{p.position}</Text>}
              {p.clubName && <Text style={styles.metaText}>⚽ {p.clubName}</Text>}
              {p.league && <Text style={styles.metaGreen}>{p.league}</Text>}
              {p.nationality && <Text style={styles.metaText}>{p.nationality}</Text>}
            </View>
            <View style={styles.playerStats}>
              {p.age && <Text style={styles.statItem}>Age: <Text style={styles.statValue}>{p.age}</Text></Text>}
              {p.heightCm && <Text style={styles.statItem}>Height: <Text style={styles.statValue}>{p.heightCm} cm</Text></Text>}
              {p.foot && <Text style={styles.statItem}>Foot: <Text style={styles.statValue}>{p.foot}</Text></Text>}
            </View>
          </View>
        </View>

        {/* Report body */}
        <View style={styles.body}>
          {lines.map(({ line, isHeader, key }) => (
            <Text key={key} style={isHeader ? styles.sectionHeader : styles.reportText}>
              {line}
            </Text>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text style={styles.footerName}>{p.scoutName}</Text>
            <Text style={styles.footerMeta}>
              {[p.agencyName, p.phone, p.email, p.website].filter(Boolean).join('  ·  ')}
            </Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerBrand}>Generated by ScoutLink</Text>
            <Text style={styles.footerBrand}>{p.generatedDate}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: databaseId, playerId } = await params

  const db = await prisma.playerDatabase.findUnique({
    where: { id: databaseId },
    include: { access: { where: { agentId: user.id } } },
  })
  if (!db) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (db.ownerId !== user.id && db.access.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [report, player, agent] = await Promise.all([
    prisma.playerReport.findUnique({ where: { playerId } }),
    prisma.player.findUnique({ where: { id: playerId }, include: { customFields: true } }),
    prisma.agent.findUnique({ where: { id: user.id }, include: { branding: true } }),
  ])

  if (!report?.reportDraft) return NextResponse.json({ error: 'No report available' }, { status: 404 })
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const branding = agent?.branding
  const photo = getCF(player.customFields, 'photo')
  const playerName = [player.firstName, player.lastName].filter(Boolean).join(' ')
  const safeFilename = playerName.replace(/[^a-z0-9]/gi, '-').toLowerCase()

  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const pdfBuffer = await renderToBuffer(
    <ReportDocument
      playerName={playerName}
      firstName={player.firstName}
      lastName={player.lastName}
      position={player.position ?? null}
      clubName={player.clubName ?? null}
      league={getCF(player.customFields, 'league') || null}
      nationality={player.nationality ?? null}
      age={calcAge(player.dateOfBirth)}
      heightCm={player.heightCm ?? null}
      foot={getCF(player.customFields, 'foot') || null}
      photo={photo || null}
      reportText={report.reportDraft}
      agencyName={branding?.agencyName ?? null}
      logoUrl={branding?.logoUrl ?? null}
      signatureLine={branding?.signatureLine ?? null}
      scoutName={agent?.fullName ?? 'Scout'}
      phone={branding?.phone ?? null}
      email={branding?.email ?? null}
      website={branding?.website ?? null}
      generatedDate={generatedDate}
    />
  )

  return new Response(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}-scouting-report.pdf"`,
    },
  })
}
