# ScoutLink — Player Parameter Change Guide

When any player parameter is added, removed, or renamed, changes are needed in up to 11 files.
Work through the relevant checklist below, then run `npx tsc --noEmit` — TypeScript catches most missed spots.

---

## Terminology

| Term | Meaning |
|------|---------|
| **DB field** | Column on the `Player` Prisma model (e.g. `heightCm`, `position`) |
| **Custom field** | Stored in `CustomField` table as `fieldName/value` pair (e.g. `foot`, `instagram`, `playerPhone`) |
| **Scraped param** | Field pulled from Transfermarkt / Sofascore / FMInside |
| **Manual-only field** | Scout enters by hand (phone, social links, fees, etc.) |

---

## A — Adding a SCRAPED parameter

### 1. `src/app/(dashboard)/search/SearchParamsPanel.tsx`
- Add key to `PARAM_KEYS` array (keep groups in order)
- Add `key: 'Label'` to `PARAM_LABELS`
- Add `key: 'ScraperName'` to `PARAM_SOURCES`

### 2. `src/app/(dashboard)/databases/[id]/ColumnPicker.tsx`
- Add key to the right group in `GROUPS`
- If it should appear as a **table column**: add to `TABLE_COLUMNS` set and wire up in PlayersTable (§5)
- If profile-only: leave out of `TABLE_COLUMNS` — shows as "Profile only" badge automatically
- If label not in `PARAM_LABELS`, add to `EXTRA_LABELS` map at top of file

### 3. `src/app/(dashboard)/search/SearchClient.tsx`
- Add field to `PlayerResult` interface
- Add field to `PlayerEditData` interface
- Add to `editData` initializer (`useState<PlayerEditData>({...})`)
- Add `case 'key': return results.some(p => !!p.key)` in the `isFound()` switch inside the `CoveragePanel` section
- Add `'Label': 'paramKey'` to `FIELD_PARAM_KEY` map
- Add `show('key') && <EditableField .../>` in the correct card column
- Add to import payload: `...addCf('key', p => p.scraperField, firstEd?.editField)` in `customFields` inside `handleImport` (or to `body` if DB field)

### 4. `src/app/(dashboard)/databases/[id]/players/[playerId]/PlayerProfileCard.tsx`
- Add to `initialForm()` — custom field: `cf('key')`, DB field: `player.fieldName`
- Add `'key'` to `customFieldKeys` in `handleSave` (custom fields only)
- Add to `dbFields` set in `handleSave` (DB fields only)
- Add `<Row>` or `<LinkRow>` in the correct column

### 5. `src/app/(dashboard)/databases/[id]/PlayersTable.tsx` *(table columns only)*
- Add to `SortKey` type
- Add sort logic in the `useMemo` sort block
- Add `(show('key') ? 1 : 0)` to `visibleColCount`
- Add `<ColHeader>` in `<thead>`
- Add `{show('key') && <td>...</td>}` in player row

### 6. `src/components/PlayerFilterBar.tsx` *(filterable params only)*
- Add `| 'key'` to `FilterKey` type
- Add `keyMin/keyMax` or `keys` to `Filters` interface and `DEFAULT_FILTERS`
- Add to `FILTER_PARAMS` array
- Add chip detection in `getActiveChips`
- Add clear logic in `clearFilterForKey`
- Add display text in `chipValueSummary`
- Add range init in `FilterPanel` (rangeMin/rangeMax state)
- Add `handleApply` branch

### 7. `src/app/(dashboard)/databases/SearchAllLists.tsx` *(filterable params only)*
- Add filter check in `matchesFilters`
- Add to `rangeBounds` if range filter

### 8. `src/app/(dashboard)/databases/ImportPlayersModal.tsx`
- Add `{ key: 'cf_key', label: 'Label', group: 'Group' }` to `IMPORT_FIELDS`
- Add column name aliases to `AUTO_MAP`

### 9. `src/app/(dashboard)/databases/[id]/AddPlayerButton.tsx`
- Add to `Form` interface, `EMPTY`, `CUSTOM_FIELD_KEYS`, and UI (`<CardRow>`)

### 10. `src/app/(dashboard)/reports/[id]/ReportView.tsx`
- Add `{ key: 'fieldName', label: 'Label' }` to `cols`
- Add header to CSV `headers` array and value to CSV `rows` map

### 11. Scraper files `src/lib/scrapers/`
- Add extraction logic in relevant scraper(s)
- Add field to `ScrapedPlayer` type in `types.ts` if new

---

## B — Adding a MANUAL-ONLY field (phone, social links, fees, etc.)

6 files needed — **do not skip `SearchParamsPanel.tsx` and `SearchClient.tsx`**, that is how the field gap between the search card and the profile card was introduced:

1. **`PlayerProfileCard.tsx`** — `initialForm`, `customFieldKeys`, UI `<Row>` or `<LinkRow>`
2. **`AddPlayerButton.tsx`** — `Form` interface, `EMPTY`, `CUSTOM_FIELD_KEYS`, UI
3. **`ImportPlayersModal.tsx`** — `IMPORT_FIELDS`, `AUTO_MAP`
4. **`ColumnPicker.tsx`** — add to `GROUPS` (not `TABLE_COLUMNS`), add label to `EXTRA_LABELS` if needed
5. **`SearchParamsPanel.tsx`** — the visibility gate for every field on the search card:
   - Add key to `PARAM_KEYS` array (in the right group)
   - Add `key: 'Label'` to `PARAM_LABELS`
   - Add `key: ''` to `PARAM_SOURCES` (empty string = manual-only, not scraped)
   - The auto-activation logic in `loadActive()` will enable the key for existing users automatically

6. **`SearchClient.tsx`** — this file must mirror every field that `PlayerProfileCard` shows:
   - Add field to `PlayerEditData` interface
   - Add to `editData` initializer (`useState<PlayerEditData>({...})`)
   - Add `'Label': 'paramKey'` to `FIELD_PARAM_KEY` map
   - Add `show('key') && <EditableField .../>` in the matching card column (Physical / Contract & Value / Scout Info) — `show('key')` uses the key from step 5
   - Add to `handleImport`: scout-entered fields go into `edCf` loop; DB fields (e.g. `agentName`) go into `body`
   - If it is a new DB field: also add `body.field?.trim() || null` to the `prisma.player.create` data block in `src/app/api/databases/[id]/players/route.ts`

---

## C — Removing a parameter

Work through all files from A or B above. Easy-to-miss spots:

- **`SearchParamsPanel.tsx`** — remove from `PARAM_KEYS`, `PARAM_LABELS`, `PARAM_SOURCES`
- **`SearchClient.tsx`** — `PlayerResult`, `PlayerEditData`, `isFound()`, `FIELD_PARAM_KEY`, editData init, card display, import payload
- **`PlayerFilterBar.tsx`** — `FilterKey` type, `Filters` interface, `DEFAULT_FILTERS`, `FILTER_PARAMS`, `getActiveChips`, `clearFilterForKey`, `chipValueSummary`, FilterPanel rangeMin/rangeMax init, `handleApply`
- **`PlayersTable.tsx`** — `SortKey` type, sort logic, `visibleColCount`, `<ColHeader>`, `<td>` row cell, filter check, range useMemo
- **`SearchAllLists.tsx`** — filter check + rangeBounds
- **`ReportView.tsx`** — `cols` + CSV headers + CSV row values

Always end with `npx tsc --noEmit`.

---

## D — Position normalization

Scrapers use different abbreviations (Sofascore: `CB`, FMInside: `dc`, raw: `DC`).
The canonical normalization map:

```
DC / CB  → Centre-Back
RB       → Right-Back
LB       → Left-Back
RWB      → Right Wing-Back
LWB      → Left Wing-Back
```

Applied in exactly these 4 places — keep them in sync if the map changes:

| File | Location |
|------|----------|
| `src/lib/scrapers/transfermarkt.ts` | `normalizePosition()` function |
| `src/lib/scrapers/fminside.ts` | `normalizePosition()` function |
| `src/app/(dashboard)/search/SearchClient.tsx` | `normalizePos()` at top — used in header chip, Physical column displayValue, import body |
| `src/app/(dashboard)/databases/[id]/players/[playerId]/PlayerProfileCard.tsx` | `displayPosition()` helper — used in header chip, Physical `<Row>` display prop |

---

## E — Quick reference: which file owns what

| Concern | File |
|---------|------|
| Param registry (keys, labels, sources) | `SearchParamsPanel.tsx` |
| Search result card display + import payload | `SearchClient.tsx` |
| Player profile display & inline edit | `PlayerProfileCard.tsx` |
| Player table columns, sort, filters | `PlayersTable.tsx` + `PlayerFilterBar.tsx` |
| Configure Columns drawer | `ColumnPicker.tsx` |
| Manual add-player form | `AddPlayerButton.tsx` |
| Excel/CSV import field mapping | `ImportPlayersModal.tsx` |
| Reports (print + CSV export) | `ReportView.tsx` |
| Cross-list search filters | `SearchAllLists.tsx` |
| Scraping logic | `src/lib/scrapers/*.ts` |
