export type ColType = 'date' | 'currency' | 'cm' | 'status'

export interface ReportColDef {
  key: string
  label: string
  type?: ColType
}

// Single source of truth for snapshot/report columns.
// These must match the list view TABLE_COLUMNS in ColumnPicker.tsx.
// Adding a column here automatically includes it in snapshot capture,
// the report table, and the CSV export — no other files need to change.
export const REPORT_COLS: ReportColDef[] = [
  { key: 'position',       label: 'Position' },
  { key: 'clubName',       label: 'Club' },
  { key: 'league',         label: 'League' },
  { key: 'nationality',    label: 'Nationality' },
  { key: 'age',            label: 'Age' },
  { key: 'dateOfBirth',    label: 'Date of Birth',   type: 'date' },
  { key: 'heightCm',       label: 'Height',           type: 'cm' },
  { key: 'marketValue',    label: 'Market Value',     type: 'currency' },
  { key: 'contractExpiry', label: 'Contract Expiry',  type: 'date' },
  { key: 'foot',           label: 'Foot' },
  { key: 'fmWages',        label: 'FM Wages' },
  { key: 'available',      label: 'Status',           type: 'status' },
]
