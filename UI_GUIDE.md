# ScoutLink UI Design Guide

Extracted from the live component tree. Follow this guide exactly when building new components — do not invent new patterns.

---

## 1. CSS Variable System

Defined in `globals.css`. **Always use CSS variables for colors — never hardcode light/dark values.**

**Light mode (`:root`):**
```
--page-bg:      linear-gradient(135deg, #f0f4f8 0%, #e8edf5 50%, #f0f5f2 100%)
--card-bg:      linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)
--card-solid:   #ffffff
--card-shadow:  0 4px 20px rgba(0,0,0,0.08)
--text-primary: #0f172a
--text-secondary: rgba(15,23,42,0.65)
--text-muted:   rgba(15,23,42,0.45)
--text-faint:   rgba(15,23,42,0.28)
--border:       rgba(0,0,0,0.08)
--border-strong: #e2e8f0
--hover-bg:     rgba(0,0,0,0.04)
--subtle-bg:    rgba(0,0,0,0.025)
--input-bg:     #f8fafc
--input-border: #e2e8f0
```

**Dark mode (`[data-theme="dark"]`):**
```
--page-bg:      linear-gradient(135deg, #0a0d14 0%, #0f1117 50%, #0a0f0d 100%)
--card-bg:      linear-gradient(135deg, #141720 0%, #111318 100%)
--card-solid:   #1a1d27
--card-shadow:  0 8px 32px rgba(0,0,0,0.3)
--text-primary: #ffffff
--text-secondary: rgba(255,255,255,0.65)
--text-muted:   rgba(255,255,255,0.4)
--text-faint:   rgba(255,255,255,0.22)
--border:       rgba(255,255,255,0.05)
--border-strong: #2a2d3a
--hover-bg:     rgba(255,255,255,0.06)
--subtle-bg:    rgba(255,255,255,0.02)
--input-bg:     #0f1117
--input-border: #2a2d3a
```

**Important:** Inside `.main-content`, Tailwind `text-white` resolves to `var(--text-primary)` in both themes. The sidebar always uses raw hex values since it is always dark.

---

## 2. Brand Colors

| Color | Hex | Usage |
|---|---|---|
| Brand green | `#00c896` | Primary CTA, active states, available badge, focus ring |
| Brand green dark | `#00a878` | Gradient end for green buttons |
| Orange | `#ff9f43` | Reports section accent |
| Blue | `#6c8fff` | Notes, count badges |
| Pink | `#ff6b9d` | Calendar events |
| Red | `#ef4444` | Danger/delete, not-available badge |
| Amber | `#f59e0b` | Monitor recommendation |
| Purple | `#a78bfa` | Help panel |

**Green opacity levels:**
- Background: `rgba(0,200,150,0.10)` or `rgba(0,200,150,0.12)`
- Border: `rgba(0,200,150,0.25)` or `rgba(0,200,150,0.30)`
- Box-shadow glow: `rgba(0,200,150,0.30)` default, `rgba(0,200,150,0.45)` on hover

---

## 3. Typography

| Use | Classes / Style |
|---|---|
| Page title | `text-xl font-semibold` + `color: var(--text-primary)` |
| Card/section heading | `text-sm font-semibold` + `color: var(--text-primary)` |
| Section sub-label (caps) | `text-[10px] uppercase tracking-widest font-medium` + `color: var(--text-muted)` |
| Profile section header | `text-[10px] uppercase font-bold pl-2 border-l-2` + `letterSpacing: '0.9px', color: var(--text-primary), borderColor: '#00c896'` |
| Player full name | `fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px'` + `color: var(--text-primary)` |
| Table header cell | `text-[10px] uppercase tracking-widest font-medium` + `color: var(--text-muted)` |
| Table row primary | `text-sm font-semibold` + `color: var(--text-primary)` |
| Table row secondary | `text-xs` + `color: var(--text-secondary)` |
| Table row muted/empty | `text-xs` + `color: var(--text-faint)` |
| Row index number | `fontSize: 11` + `color: var(--text-faint)` |
| Inline field label | `text-[10px]` + `color: var(--text-faint)` |
| Inline field value | `text-[11px]` + `color: var(--text-secondary)` |
| Form label | `text-xs font-medium` + `color: var(--text-muted)` |
| Body/paragraph | `text-sm` + `color: var(--text-primary)` |
| Helper/secondary body | `text-xs` + `color: var(--text-muted)` |

---

## 4. Layout

**Page shell:**
```tsx
<div className="min-h-screen flex" style={{ background: 'var(--page-bg)' }}>
  <Sidebar />
  <main className="main-content flex-1 p-8 overflow-auto" style={{ color: 'var(--text-primary)' }}>
    {children}
  </main>
</div>
```

**Page header (every dashboard page):**
```tsx
<div className="flex items-center gap-3 mb-4">
  <div className="mr-auto pl-3 border-l-2" style={{ borderColor: '#00c896' }}>
    <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Page Title</h1>
    <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>Subtitle or count</p>
  </div>
  {/* action buttons */}
</div>
```
The `border-l-2` accent bar is the universal page-title treatment. Use `#00c896` for most pages, `#ff9f43` for reports.

---

## 5. Card Pattern

**Standard card:**
```tsx
<div className="rounded-2xl border" style={{
  background: 'var(--card-bg)',
  borderColor: 'var(--border)',
  boxShadow: 'var(--card-shadow)',
}}>
```

**Card with header bar:**
```tsx
<div className="rounded-2xl border overflow-hidden">
  <div className="flex items-center justify-between px-4 py-3 border-b"
    style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
    ...
  </div>
  ...
</div>
```

**Empty / dashed state:**
```tsx
<div className="rounded-2xl border border-dashed p-12 text-center" style={{ borderColor: 'var(--border)' }}>
  <p className="text-sm" style={{ color: 'var(--text-faint)' }}>No items yet.</p>
</div>
```

**Section dividers inside cards:** `border-t` / `border-b` with `style={{ borderColor: 'var(--border)' }}`.

---

## 6. Button Patterns

### Primary green (create / save / confirm)
```tsx
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
  style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)' }}
  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,200,150,0.45)' }}
  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,200,150,0.25)' }}>
```
Modal version: `py-2.5 rounded-xl flex-1` (full-width in footer).

### Primary red (delete / danger)
```tsx
style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', boxShadow: '0 2px 12px rgba(239,68,68,0.25)' }}
onMouseEnter → boxShadow: '0 4px 20px rgba(239,68,68,0.45)'
```

### Secondary / Ghost (toolbar)
```tsx
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
  onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
```

### Cancel (modal)
```tsx
<button className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
  onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>
```

### Danger ghost (delete row action)
```tsx
style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
onMouseEnter → background: 'rgba(239,68,68,0.06)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)'
```

### Active / toggle state
```tsx
style={{ background: 'rgba(0,200,150,0.1)', color: '#00c896', border: '1px solid rgba(0,200,150,0.35)', boxShadow: '0 0 0 3px rgba(0,200,150,0.08)' }}
```

### Pill selector (list tabs, filter chips)
```tsx
// Active:
style={{ background: '#00c896', color: '#fff', border: '1px solid #00c896' }}
// Inactive:
style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
className="px-3 py-1 rounded-full text-xs font-medium transition-all"
```

### Tab button (settings-style)
```tsx
// Container:
className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}
// Active tab:
style={{ background: 'rgba(0,200,150,0.15)', color: '#00c896', border: '1px solid rgba(0,200,150,0.25)' }}
// Inactive tab:
style={{ color: 'var(--text-secondary)', border: '1px solid transparent' }}
```

### Small close / icon button
```tsx
<button className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
  style={{ color: 'var(--text-faint)', border: '1px solid var(--border)' }}
  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
```

---

## 7. Input / Form Fields

### Standard text input
```tsx
<input className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
  onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
  onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
```

### Compact inline input (profile card fields)
```tsx
<input className="text-[11px] text-right w-28 bg-transparent focus:outline-none border-b"
  style={{ color: 'var(--text-primary)', borderColor: '#00c896', caretColor: '#00c896' }} />
```

### Search input with leading icon
```tsx
<div className="relative flex items-center">
  <svg className="absolute left-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
  <input className="pl-8 py-1.5 rounded-lg text-sm focus:outline-none"
    style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
</div>
```

### Textarea
```tsx
<textarea className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
  onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
  onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
```

### Form label
```tsx
<label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
  Field Name
</label>
```

### Checkbox
```tsx
<input type="checkbox" className="w-3.5 h-3.5 accent-[#00c896]" />
```

### Inline field row (profile card display)
```tsx
<div className="flex items-center justify-between field-row py-1" style={{ borderBottom: '1px solid var(--border)' }}>
  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{label}</span>
  <span className="text-[11px] text-right" style={{ color: 'var(--text-secondary)' }}>{value || '—'}</span>
</div>
```

---

## 8. Modal Pattern

**Backdrop:**
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4"
  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
  onClick={onClose}>
```

**Card:**
```tsx
<div className="w-full max-w-sm rounded-2xl overflow-hidden"
  style={{
    background: 'var(--card-bg)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,200,150,0.08)',
  }}
  onClick={e => e.stopPropagation()}>
```

**Top accent bar (3px stripe — animated during loading):**
```tsx
<div style={{ height: 3, position: 'relative', overflow: 'hidden',
  background: loading ? 'rgba(0,200,150,0.15)' : 'linear-gradient(90deg, #00c896, #00a878)' }}>
  {loading && (
    <div style={{ position: 'absolute', top: 0, width: '45%', height: '100%',
      background: 'linear-gradient(90deg, transparent, #00c896, rgba(0,200,150,0.4))',
      animation: 'sl-progress 1.4s ease-in-out infinite' }} />
  )}
</div>
```
Use red gradient for danger modals: `linear-gradient(90deg, #ef4444, #dc2626)`.

**Header (inside `p-6`):**
```tsx
<div className="flex items-center gap-3 mb-5">
  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
    style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)' }}>
    <svg className="w-5 h-5" fill="#00c896" />
  </div>
  <div>
    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Title</h2>
    <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>Subtitle</p>
  </div>
</div>
```

**Footer (2 buttons):**
```tsx
<div className="flex gap-2.5">
  <button className="flex-1 py-2.5 rounded-xl text-sm font-medium ...">Cancel</button>
  <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold ...">Confirm</button>
</div>
```

**Error message:**
```tsx
<div className="flex items-center gap-2 px-3 py-2 rounded-lg"
  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
  <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
</div>
```

---

## 9. Slide-In Panel / Drawer

```tsx
<div className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl"
  style={{
    width: 420,
    background: 'var(--card-bg)',
    borderLeft: '1px solid var(--border)',
    transform: open ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)',
  }}>
  {/* top accent bar — same 3px pattern as modal */}
  <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 gap-3"
    style={{ borderBottom: '1px solid var(--border)' }}>
    {/* header */}
  </div>
  <div className="flex-1 overflow-y-auto px-5 py-5">
    {/* body */}
  </div>
</div>
{/* backdrop */}
<div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
```

---

## 10. Status / Badge Pills

**Available (green):**
```tsx
className="text-[11px] px-1.5 py-0.5 rounded font-medium"
style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.3)' }}
```

**Not Available (red):**
```tsx
style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
```

**Position pill:** use `positionPillStyle(position)` from `src/lib/positionColor.ts`.

**Inline tag (list names, database labels):**
```tsx
className="text-[11px] px-2 py-0.5 rounded-full"
style={{ background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
```

**Evaluation recommendation colors:**
- Sign / Top Talent: `color: '#00c896'`, bg `rgba(0,200,150,0.12)`, border `rgba(0,200,150,0.3)`
- Monitor: `color: '#f59e0b'`, bg `rgba(245,158,11,0.12)`, border `rgba(245,158,11,0.3)`
- Reject: `color: '#ef4444'`, bg `rgba(239,68,68,0.12)`, border `rgba(239,68,68,0.3)`

**AI score badge:**
```tsx
className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
// color: '#00c896' ≥80%, '#ff9f43' ≥60%, '#ef4444' <60%
```

---

## 11. Table Pattern

```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
      <th className="pl-4 pr-2 py-2.5 text-right text-[10px] uppercase tracking-widest font-medium w-8"
        style={{ color: 'var(--text-faint)' }}>#</th>
      <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest font-medium"
        style={{ color: 'var(--text-muted)' }}>Column</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b last:border-0 transition-colors cursor-pointer"
      style={{ borderColor: 'var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <td className="pl-4 pr-2 py-2.5 text-right tabular-nums select-none"
        style={{ color: 'var(--text-faint)', fontSize: 11 }}>1</td>
      <td className="px-4 py-2.5">...</td>
    </tr>
  </tbody>
</table>
```

**Selected row:**
```tsx
style={{ background: 'rgba(0,200,150,0.06)', boxShadow: 'inset 3px 0 0 #00c896' }}
```

---

## 12. Loading States

**Spinner (small, inline):**
```tsx
<div className="w-4 h-4 rounded-full border-2 animate-spin"
  style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />
```

**Progress bar (2px strip, bottom of element):**
```tsx
<div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, overflow: 'hidden' }}>
  <div style={{
    position: 'absolute', width: '45%', height: '100%',
    background: 'linear-gradient(90deg, transparent, #00c896, rgba(0,200,150,0.4))',
    animation: 'sl-progress 1.4s ease-in-out infinite',
  }} />
</div>
```

---

## 13. Toast Notification

```tsx
<div style={{
  position: 'fixed', bottom: 28, left: '50%',
  transform: `translateX(-50%) translateY(${show ? 0 : 16}px)`,
  opacity: show ? 1 : 0, transition: 'opacity 0.25s ease, transform 0.25s ease',
  zIndex: 100, pointerEvents: 'none',
}}>
  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium"
    style={{ background: 'var(--card-bg)', border: '1px solid rgba(0,200,150,0.4)',
      color: 'var(--text-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
    <div className="w-4 h-4 rounded-full flex items-center justify-center"
      style={{ background: 'rgba(0,200,150,0.2)', border: '1px solid rgba(0,200,150,0.5)' }}>
      {/* checkmark svg fill="#00c896" */}
    </div>
    <span>{message}</span>
  </div>
</div>
```

---

## 14. Icon Conventions

All icons: inline SVG with `viewBox="0 0 24 24" fill="currentColor"` (or `fill="none" stroke="currentColor"`).

| Context | Size |
|---|---|
| Toolbar / row action | `w-3.5 h-3.5` |
| Nav item | `w-4 h-4` |
| Modal header | `w-5 h-5` |
| Small row icon button | `w-3 h-3` |

---

## 15. Spacing & Border Radius Reference

| Context | Value |
|---|---|
| Page padding | `p-8` |
| Card body padding | `p-4` |
| Card header padding | `px-4 py-3` or `px-5 py-4` |
| Modal padding | `p-6` |
| Table cell | `px-4 py-2.5` |
| Toolbar button | `px-3 py-1.5` |
| Modal footer button | `py-2.5` (flex-1) |
| Gap between toolbar buttons | `gap-2` or `gap-3` |
| Gap between form fields | `gap-4` |
| Between cards | `mb-4` or `mb-8` |

| Element | Border radius |
|---|---|
| Cards, modals, panels | `rounded-2xl` |
| Inputs, modal buttons | `rounded-xl` |
| Toolbar buttons, small elements | `rounded-lg` |
| Pill selectors, badges, toast | `rounded-full` |
| Icon containers in modals | `rounded-xl` |

---

## 16. Tip / Info Box

```tsx
<div className="px-4 py-3 rounded-xl text-sm"
  style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Tip: </span>
  Tip text here.
</div>
```

---

## 17. Search Bar

**Toolbar search (compact, with leading icon):**
```tsx
<div className="relative flex items-center">
  <svg className="absolute left-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-faint)' }} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
  <input className="w-full pl-8 py-1.5 rounded-lg text-sm focus:outline-none transition-colors"
    style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    placeholder="Search players…"
    onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
</div>
```

**Large AI / global search (inline container style):**
```tsx
<div className="relative flex items-center gap-2 flex-1 rounded-lg px-3 py-2"
  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
  <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-faint)' }} viewBox="0 0 24 24" fill="currentColor">...</svg>
  <input className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
    style={{ color: 'var(--text-primary)' }}
    placeholder="Search across all lists…"
    onFocus={e => e.currentTarget.parentElement.style.borderColor = '#00c896'}
    onBlur={e => e.currentTarget.parentElement.style.borderColor = 'var(--input-border)'} />
</div>
```

Focus border: apply to the **wrapper div**, not the input — same green `#00c896` rule.

---

## 18. Evaluation Components

All evaluation components live in `EvaluationSection.tsx`. Use these exact patterns when building anything related to scouting evaluations.

### Rating Selector
```tsx
<div className="flex items-center gap-2">
  <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
  <div className="flex gap-1">
    {[1,2,3,4,5].map(n => (
      <button key={n} onClick={() => onChange(value === n ? 0 : n)}
        className="w-7 h-7 rounded-lg text-xs font-bold transition-all"
        style={value >= n
          ? { background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#000', boxShadow: '0 2px 8px rgba(0,200,150,0.3)' }
          : { background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
        }>{n}</button>
    ))}
  </div>
  <input type="text" placeholder="Add a note…"
    className="flex-1 px-2.5 py-1 rounded-lg text-xs focus:outline-none"
    style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
</div>
```
- Active rating buttons: green gradient, black text, green glow
- Inactive: `var(--subtle-bg)`, muted text, border
- Clicking the same number again clears it (toggle off)

### Pill Selector (Recommendation / Confidence / Next Action)
```tsx
<div className="flex flex-wrap gap-1.5">
  {options.map(opt => (
    <button onClick={() => onChange(value === opt.value ? '' : opt.value)}
      className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
      style={active
        ? { background: opt.bg, color: opt.color, border: `1px solid ${opt.border}` }  // colored variant
        : { background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
      }>{opt.label}</button>
  ))}
</div>
```

**Recommendation options** (colored):
- Top Talent: `color: '#00c896'`, bg `rgba(0,200,150,0.12)`, border `rgba(0,200,150,0.3)`
- Monitor: `color: '#f59e0b'`, bg `rgba(245,158,11,0.12)`, border `rgba(245,158,11,0.3)`
- Reject: `color: '#ef4444'`, bg `rgba(239,68,68,0.12)`, border `rgba(239,68,68,0.3)`

**Confidence / Next Action** (standard green when active):
- Active: `background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.3)'`

### Risk Flags (checkboxes + amber chips)
```tsx
// Checkbox row:
<label className="flex items-center gap-2 cursor-pointer">
  <input type="checkbox" className="w-3.5 h-3.5 accent-[#f59e0b]"
    checked={value} onChange={e => onChange(e.target.checked)} />
  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Risk label</span>
</label>

// Active flag chip (display):
<span className="text-[10px] px-2 py-0.5 rounded font-medium"
  style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
  ⚠ Risk label
</span>
```
Risk flags always use amber (`#f59e0b`) — not green or red.

### Evaluation Card (collapsed header)
```tsx
<div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
  style={{ background: expanded ? 'var(--subtle-bg)' : 'transparent' }}
  onClick={() => setExpanded(e => !e)}>
  <div className="flex-1 min-w-0">
    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{date}</p>
    <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-faint)' }}>{competition} · {opponent}</p>
  </div>
  {/* avg rating */}
  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>avg</span>
  <span className="text-sm font-bold" style={{ color: '#00c896' }}>{avg}</span>
  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>/5</span>
  {/* recommendation pill */}
  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
    style={{ background: rec.bg, color: rec.color, border: `1px solid ${rec.border}` }}>{rec.label}</span>
  {/* scout name */}
  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{agentName}</span>
  {/* chevron — rotates when expanded */}
  <svg className="w-3.5 h-3.5 transition-transform"
    style={{ color: 'var(--text-faint)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
    viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
</div>
```

### Evaluation Form section header
```tsx
<p className="text-[10px] uppercase font-bold mb-3 pl-2 border-l-2"
  style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Match Context</p>
```
Used for every sub-section inside an evaluation form (Match Context, Scout Ratings, Recommendation, Risk Flags, Observation Notes).

### Evaluation Form wrapper
```tsx
<form className="flex flex-col gap-5 p-5 rounded-2xl"
  style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>
```
The form sits inside a subtle-bg rounded container, not a white card.

---

## 19. BoolRow Toggle

A pill button that toggles between two states (e.g. Available / Not Available, Yes / No). Changes color based on value.

```tsx
<button
  onClick={onToggle}
  className="text-[11px] font-medium px-1.5 py-0.5 rounded tracking-wider uppercase transition-all"
  style={{
    background: value ? 'rgba(0,200,150,0.12)' : 'rgba(239,68,68,0.1)',
    color:      value ? '#00c896'              : '#ef4444',
    border:     `1px solid ${value ? 'rgba(0,200,150,0.3)' : 'rgba(239,68,68,0.25)'}`,
  }}
  onMouseEnter={e => { e.currentTarget.style.opacity = '0.7' }}
  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
  {value ? trueLabel : falseLabel}
</button>
```

**Neutral variant** (when neither state is negative — e.g. "National / Club"):
```tsx
style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
```

---

## 20. Click-to-Edit Inline Field

A field row that shows a value with a faint pencil icon on hover. Clicking opens an inline input.

```tsx
<div className="flex items-center justify-between gap-2 group cursor-text"
  onClick={() => setActive(true)}
  style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
  <div className="flex items-center gap-1">
    {/* ✎ indicator — shown when field was manually edited */}
    {manual && hasValue && <span style={{ color: '#00c896', fontSize: 9 }}>✎</span>}
    <span className="text-[11px] font-medium text-right"
      style={{ color: hasValue ? 'var(--text-primary)' : 'var(--text-faint)' }}>
      {display ?? '—'}
    </span>
    {/* pencil icon — visible on row hover */}
    <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-30 transition-opacity flex-shrink-0"
      viewBox="0 0 24 24" fill="#00c896">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
  </div>
</div>
```

When active, replace the value span with an `<input>` styled as:
```tsx
<input className="text-[11px] text-right w-28 bg-transparent focus:outline-none border-b"
  style={{ color: 'var(--text-primary)', borderColor: '#00c896', caretColor: '#00c896' }} />
```

---

## 21. Filter Chip with X

Active filter chips displayed in the filter bar. Green-tinted, with a small X button to remove.

```tsx
<div className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] cursor-pointer select-none transition-all"
  style={{ background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)' }}
  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,200,150,0.2)'; e.currentTarget.style.borderColor = 'rgba(0,200,150,0.45)' }}
  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,200,150,0.12)'; e.currentTarget.style.borderColor = 'rgba(0,200,150,0.25)' }}
  onClick={onEdit}>
  <span className="font-semibold" style={{ color: '#00c896' }}>{filterLabel}</span>
  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{filterValue}</span>
  <button
    className="w-4 h-4 rounded flex items-center justify-center text-[10px] transition-all ml-0.5"
    style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}
    onClick={e => { e.stopPropagation(); onRemove() }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.2)'; e.currentTarget.style.color = '#ff6b6b' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
    ✕
  </button>
</div>
```

---

## 22. AND / OR Toggle

Two-button segmented control for switching filter combination mode. AND = green, OR = blue.

```tsx
<div className="flex rounded-md overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border-strong)' }}>
  <button onClick={() => setMode('AND')} className="px-2.5 py-1 text-[11px] font-semibold transition-colors"
    style={{ background: mode === 'AND' ? 'rgba(0,200,150,0.18)' : 'transparent',
             color:      mode === 'AND' ? '#00c896'              : 'var(--text-faint)' }}>
    AND
  </button>
  <button onClick={() => setMode('OR')} className="px-2.5 py-1 text-[11px] font-semibold transition-colors"
    style={{ background: mode === 'OR' ? 'rgba(108,143,255,0.18)' : 'transparent',
             color:      mode === 'OR' ? '#6c8fff'                : 'var(--text-faint)' }}>
    OR
  </button>
</div>
```

---

## 23. Add Filter Button

Dashed-border button that opens a filter parameter picker. Becomes solid green when open.

```tsx
<button onClick={onToggle}
  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12.5px] transition-all"
  style={{
    background:  open ? 'rgba(0,200,150,0.08)' : 'transparent',
    border:      `1px dashed ${open ? '#00c896' : 'var(--border-strong)'}`,
    color:       open ? '#00c896' : 'var(--text-muted)',
  }}
  onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'var(--subtle-bg)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
  onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}>
  + Add Filter {open && <span className="text-[10px]">▴</span>}
</button>
```

---

## 24. Player Avatar with Initials Fallback

Used in player profile headers and table rows. Shows photo if available, otherwise green gradient circle with initials.

```tsx
<div
  className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
  style={photoUrl
    ? { border: '1px solid var(--border)' }
    : { background: 'linear-gradient(135deg, #00c896, #00a878)', boxShadow: '0 0 12px rgba(0,200,150,0.25)' }}>
  {photoUrl
    ? <img src={photoUrl} alt={name} referrerPolicy="no-referrer" className="w-full h-full object-cover"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
    : <span className="text-lg font-bold text-black">{firstName[0]}{lastName[0]}</span>
  }
</div>
```

**Small variant** (table rows — 8×8, `rounded-lg`, `text-xs`):
```tsx
<div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
  style={{ background: 'linear-gradient(135deg, #00c896, #00a878)' }}>
  <span className="text-xs font-bold text-black">{firstName[0]}{lastName[0]}</span>
</div>
```

---

## 25. List Pill Tabs with Counts

Used in the databases view to filter by list. "All Lists" + individual list pills, each showing player count in faint text.

```tsx
{/* All Lists pill */}
<button onClick={() => setSelected([])}
  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
  style={isAll ? { background: '#00c896', color: '#fff', border: '1px solid #00c896' }
               : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
  onMouseEnter={e => { if (!isAll) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--subtle-bg)' } }}
  onMouseLeave={e => { if (!isAll) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' } }}>
  All Lists
</button>

{/* Individual list pill */}
<button onClick={() => togglePill(db.id)}
  className="px-3 py-1 rounded-full text-xs font-medium transition-all"
  style={active ? { background: '#00c896', color: '#fff', border: '1px solid #00c896' }
                : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
  {db.name}
  <span className="ml-1.5 opacity-40">{db.playerCount}</span>
</button>
```

---

## 26. Split Panel Layout

Left list + right detail panel with animated width transition and a 3px vertical divider.

```tsx
<div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, height: 'calc(100vh - 116px)' }}>
  {/* Left panel */}
  <div style={{
    flexShrink: 0,
    width: rightPanelOpen ? '44%' : '100%',
    transition: 'width 0.35s cubic-bezier(.4,0,.2,1)',
    height: '100%', display: 'flex', flexDirection: 'column',
  }}>
    {/* list content */}
  </div>

  {/* Divider */}
  <div style={{
    flexShrink: 0,
    width: rightPanelOpen ? 3 : 0,
    alignSelf: 'stretch',
    background: 'var(--border-strong)',
    margin: rightPanelOpen ? '0 12px' : 0,
    borderRadius: 2,
    transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
  }} />

  {/* Right panel */}
  <div style={{
    flex: 1, minWidth: 0, height: '100%', overflow: 'hidden',
    opacity: rightPanelOpen ? 1 : 0,
    pointerEvents: rightPanelOpen ? 'auto' : 'none',
    transition: 'opacity 0.3s ease',
  }}>
    {/* detail content */}
  </div>
</div>
```

---

## 27. Calendar Event Chip

Colored chip with a left border matching the event type color. Used in month and week calendar views.

```tsx
<div className="text-[10px] px-1.5 py-0.5 rounded-md font-medium truncate"
  style={{ background: eventType.bg, color: eventType.color, borderLeft: `2px solid ${eventType.color}` }}>
  {event.title}
</div>
```

**Event type color system:**
```ts
const EVENT_TYPES = [
  { value: 'task',     label: 'Task',     color: '#00c896', bg: 'rgba(0,200,150,0.10)'   },
  { value: 'reminder', label: 'Reminder', color: '#ff9f43', bg: 'rgba(255,159,67,0.10)'  },
  { value: 'meeting',  label: 'Meeting',  color: '#6c8fff', bg: 'rgba(108,143,255,0.10)' },
  { value: 'call',     label: 'Call',     color: '#a29bfe', bg: 'rgba(162,155,254,0.10)' },
  { value: 'deadline', label: 'Deadline', color: '#ef4444', bg: 'rgba(239,68,68,0.10)'   },
]
```

---

## 28. Date Range Inputs

"From" / "To" date input pair used in reports and calendar filters. Focus color matches the section accent (orange for reports, green elsewhere).

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>From</span>
  <input type="date" value={from} onChange={e => setFrom(e.target.value)}
    className="px-3 py-1.5 rounded-xl text-sm focus:outline-none"
    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
    onFocus={e => e.currentTarget.style.borderColor = '#ff9f43'}
    onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>To</span>
  <input type="date" value={to} onChange={e => setTo(e.target.value)}
    className="px-3 py-1.5 rounded-xl text-sm focus:outline-none"
    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
    onFocus={e => e.currentTarget.style.borderColor = '#ff9f43'}
    onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'} />
</div>
```

---

## 29. Two-Zone Request Card (ClubRequestCard)

Request cards in the Clubs section use a two-zone layout. Both zones are always visible — no accordion needed for core actions.

**Clubs accent color:** `#6c8fff` (blue). Transfer type pills: buy=green (`#00c896`), loan=orange (`#ff9f43`), free=blue (`#6c8fff`).

### Top zone — click to expand/collapse:
```tsx
<div className="px-4 pt-4 pb-3 cursor-pointer"
  onClick={() => setExpanded(e => !e)}
  style={{ background: expanded ? 'var(--subtle-bg)' : 'transparent' }}>

  {/* Row 1: Team badge + position (bold) + transfer pill + age + icon buttons (right-aligned) */}
  <div className="flex items-center gap-2 flex-wrap">
    {teamLevel && (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
        style={{ background: 'rgba(108,143,255,0.12)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.3)' }}>
        {teamLevel}
      </span>
    )}
    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{position || 'Any position'}</span>
    {transferType && (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md capitalize"
        style={
          transferType === 'buy'  ? { background: 'rgba(0,200,150,0.1)',   color: '#00c896', border: '1px solid rgba(0,200,150,0.25)' } :
          transferType === 'loan' ? { background: 'rgba(255,159,67,0.1)',  color: '#ff9f43', border: '1px solid rgba(255,159,67,0.25)' } :
                                    { background: 'rgba(108,143,255,0.1)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.25)' }
        }>{transferType}</span>
    )}
    {(ageMin || ageMax) && (
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {ageMin && ageMax ? `${ageMin}–${ageMax} yrs` : ageMax ? `≤${ageMax} yrs` : `≥${ageMin} yrs`}
      </span>
    )}
    {/* Edit + Delete icon buttons — right-aligned, always visible */}
    <div className="flex items-center gap-1.5 ml-auto" onClick={e => e.stopPropagation()}>
      {/* 28×28 ghost edit icon button */}
      {/* 28×28 ghost delete icon button — shows inline Cancel/Delete confirm when deleteConfirm===true */}
      {/* Chevron — rotates 180deg when expanded */}
    </div>
  </div>

  {/* Row 2: Budget + Nationality + notes (only when present) */}
  {(budget || nationality || notes) && (
    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
      {budget && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Budget: <strong style={{ color: 'var(--text-secondary)' }}>€{(budget/1000).toFixed(0)}k/yr</strong>
      </span>}
      {nationality && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Nationality: <strong style={{ color: 'var(--text-secondary)' }}>{nationality}</strong>
      </span>}
    </div>
  )}
</div>
```

### Bottom strip — always visible:
```tsx
<div className="flex items-center gap-2 px-4 py-2.5 flex-wrap"
  style={{ borderTop: '1px solid var(--border)', background: 'var(--subtle-bg)' }}>

  <span className="text-[10px] uppercase font-bold flex-shrink-0"
    style={{ color: 'var(--text-faint)', letterSpacing: '0.6px' }}>Proposals</span>

  {/* Proposal chips grouped by status — only show statuses with count > 0 */}
  {proposals.length === 0 ? (
    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
      style={{ background: 'transparent', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
      None yet
    </span>
  ) : (
    Object.entries(statusCounts).map(([status, count]) => {
      const sc = STATUS_COLORS[status]
      return (
        <span key={status} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
          {count} {sc.label}
        </span>
      )
    })
  )}

  {/* Action buttons — right-aligned */}
  <div className="ml-auto flex items-center gap-2">
    {/* "Close" ghost button (open requests only) + green "Find Players" gradient button */}
    {/* OR "Reopen" ghost button (closed requests) */}
    <button onClick={handleFindPlayers} disabled={matching}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff',
        boxShadow: '0 2px 8px rgba(0,200,150,0.25)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,200,150,0.45)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,200,150,0.25)' }}>
      Find Players
    </button>
  </div>
</div>
```

`STATUS_COLORS` maps proposal status → `{ bg, color, border, label }`. Find it in `ClubRequestCard.tsx`.

---

## 30. Stage Filter Tabs (AllRequestsView)

Used in "All Clubs Requests" to filter by proposal pipeline stage. Color-coded, shows live counts.

```tsx
const STAGE_TABS = [
  { value: 'all_open',      label: 'All Open',      bg: 'rgba(108,143,255,0.15)', color: '#6c8fff', border: 'rgba(108,143,255,0.4)' },
  { value: 'no_proposals',  label: 'No Proposals',  bg: 'var(--hover-bg)',         color: 'var(--text-muted)',   border: 'var(--border-strong)' },
  { value: 'proposed',      label: 'Proposed',      bg: 'rgba(108,143,255,0.15)', color: '#6c8fff', border: 'rgba(108,143,255,0.4)' },
  { value: 'in_discussion', label: 'In Discussion', bg: 'rgba(255,159,67,0.15)',  color: '#ff9f43', border: 'rgba(255,159,67,0.4)' },
  { value: 'offer',         label: 'Offer',         bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', border: 'rgba(245,158,11,0.4)' },
  { value: 'signed',        label: '✓ Signed',      bg: 'rgba(0,200,150,0.15)',   color: '#00c896', border: 'rgba(0,200,150,0.4)' },
  { value: 'all',           label: 'All',           bg: 'var(--hover-bg)',         color: 'var(--text-muted)',   border: 'var(--border-strong)' },
]

// Render:
<div className="flex items-center gap-1 flex-wrap">
  {STAGE_TABS.map(tab => (
    <button key={tab.value} onClick={() => setStageTab(tab.value)}
      className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
      style={stageTab === tab.value
        ? { background: tab.bg, color: tab.color, border: `1px solid ${tab.border}` }
        : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
      {tab.label}
    </button>
  ))}
</div>
```

The tabs replace a visible status filter row. A "Filter" ghost button sits alongside the tabs to toggle a collapsible filter panel for position/transfer/age/budget/etc.

Use `#00c896` focus color for non-reports contexts.

---

## 29. Coming Soon Placeholder

Dashed-border card for unbuilt features. Uses the section accent color (orange for reports).

```tsx
<div className="rounded-2xl flex flex-col items-center justify-center text-center px-8 py-16"
  style={{ background: 'var(--subtle-bg)', border: '1px dashed rgba(255,159,67,0.3)', minHeight: 280 }}>
  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
    style={{ background: 'rgba(255,159,67,0.08)', border: '1px solid rgba(255,159,67,0.2)' }}>
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#ff9f43">...</svg>
  </div>
  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Coming Soon</p>
  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>Description of the upcoming feature.</p>
</div>
```

For green-accented sections use `rgba(0,200,150,0.3)` dashed border and `#00c896` icon fill.

---

## 30. Search Match Highlight

Highlights query matches inline within text using a `<mark>` element with green background.

```tsx
// Component:
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(0,200,150,0.25)', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// Usage:
<Highlight text={player.name} query={searchQuery} />
```

---

## 31. Delete Confirmation Modal

Same structure as the standard modal but with a **red accent bar**, red icon container, a resource chip showing what will be deleted, and a warning line.

```tsx
{/* Backdrop */}
<div className="fixed inset-0 z-50 flex items-center justify-center p-4"
  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
  onClick={() => !deleting && onClose()}>

  {/* Card */}
  <div className="w-full max-w-sm rounded-2xl overflow-hidden"
    style={{
      background: 'var(--card-bg)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,68,68,0.08)',
    }}
    onClick={e => e.stopPropagation()}>

    {/* Red accent bar */}
    <div style={{ height: 3, position: 'relative', overflow: 'hidden',
      background: deleting ? 'rgba(239,68,68,0.15)' : 'linear-gradient(90deg, #ef4444, #dc2626)' }}>
      {deleting && (
        <div style={{ position: 'absolute', top: 0, width: '45%', height: '100%',
          background: 'linear-gradient(90deg, transparent, #ef4444, rgba(239,68,68,0.4))',
          animation: 'sl-progress 1.4s ease-in-out infinite' }} />
      )}
    </div>

    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ef4444">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Delete List</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>This action cannot be undone</p>
        </div>
      </div>

      {/* Resource chip — shows what will be deleted */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl"
        style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{resourceName}</span>
        <span className="ml-auto text-xs" style={{ color: 'var(--text-faint)' }}>{count} players</span>
      </div>

      <p className="text-xs mb-5" style={{ color: 'var(--text-faint)' }}>
        All players and notes will be permanently removed.
      </p>

      {/* Footer */}
      <div className="flex gap-2.5">
        <button onClick={onClose} disabled={deleting}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
          style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>
          Cancel
        </button>
        <button onClick={onDelete} disabled={deleting}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', boxShadow: '0 2px 12px rgba(239,68,68,0.25)' }}
          onMouseEnter={e => { if (!deleting) e.currentTarget.style.boxShadow = '0 4px 20px rgba(239,68,68,0.45)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(239,68,68,0.25)' }}>
          {deleting ? 'Deleting…' : 'Delete List'}
        </button>
      </div>
    </div>
  </div>
</div>
```

**Key differences from standard modal:**
- Box shadow uses `rgba(239,68,68,0.08)` instead of green
- Icon container: `rgba(239,68,68,0.1)` background, `rgba(239,68,68,0.25)` border, red icon fill
- Resource chip: `rgba(239,68,68,0.05)` background, `rgba(239,68,68,0.15)` border
- Confirm button: red gradient, red glow shadow

---

## 32. Column Picker (Configure Columns Drawer)

A 340px slide-in drawer with grouped column toggles. Triggered by a toolbar button with a blue count badge.

### Trigger Button
```tsx
<button onClick={() => setOpen(true)}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
  onMouseEnter={e => { e.currentTarget.style.background = 'var(--subtle-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-faint)' }}
  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/>
  </svg>
  Columns
  {/* Blue count badge */}
  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
    style={{ background: 'rgba(108,143,255,0.2)', color: '#6c8fff' }}>
    {selectedCount}
  </span>
</button>
```

### Drawer Structure
```tsx
{/* Backdrop */}
<div className="fixed inset-0 z-40"
  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
  onClick={onClose} />

{/* Drawer */}
<div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
  style={{ width: 340, background: 'var(--card-bg)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '-8px 0 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,200,150,0.08)' }}>

  {/* Green accent bar */}
  <div style={{ height: 3, flexShrink: 0, background: 'linear-gradient(90deg, #00c896, #00a878)' }} />

  {/* Header */}
  <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
    <div>
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Configure Columns</h2>
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{selected} of {total} columns selected</p>
    </div>
    {/* Close button */}
    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
      style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}>
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    </button>
  </div>

  {/* Quick actions */}
  <div className="flex gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
    <button className="text-xs px-3 py-1.5 rounded-lg font-medium"
      style={{ background: 'rgba(0,200,150,0.1)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}>
      Select All
    </button>
    <button className="text-xs px-3 py-1.5 rounded-lg font-medium"
      style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
      Clear All
    </button>
  </div>

  {/* Column groups (scrollable) */}
  <div className="flex-1 overflow-y-auto">
    {groups.map(group => (
      <div key={group.label} className="border-b" style={{ borderColor: 'var(--border)' }}>
        {/* Group header */}
        <div className="px-5 py-2.5" style={{ background: 'var(--subtle-bg)' }}>
          <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-faint)' }}>
            {group.label}
          </p>
        </div>
        {/* Column rows */}
        {group.keys.map(key => <CheckRow key={key} label={key} checked={selected.has(key)} onToggle={() => toggle(key)} />)}
      </div>
    ))}
  </div>

  {/* Footer */}
  <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>
    <div className="flex gap-3">
      <button className="flex-1 py-2.5 rounded-xl text-sm font-medium"
        style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Cancel</button>
      <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', color: '#fff', boxShadow: '0 2px 12px rgba(0,200,150,0.25)' }}>Save</button>
    </div>
  </div>
</div>
```

### CheckRow (column toggle row)
```tsx
// Active column (toggleable):
<label className="flex items-center gap-3 px-5 py-2.5 cursor-pointer transition-colors"
  style={{ background: checked ? 'rgba(0,200,150,0.04)' : 'transparent' }}
  onMouseEnter={e => { e.currentTarget.style.background = checked ? 'rgba(0,200,150,0.06)' : 'var(--hover-bg)' }}
  onMouseLeave={e => { e.currentTarget.style.background = checked ? 'rgba(0,200,150,0.04)' : 'transparent' }}>
  <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
    style={{ background: checked ? '#00c896' : 'transparent', border: `2px solid ${checked ? '#00c896' : '#6b7280'}` }}>
    {checked && <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#000"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
  </div>
  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
</label>

// Profile-only column (non-toggleable, greyed out):
<div className="flex items-center justify-between px-5 py-2.5">
  <div className="flex items-center gap-3">
    <div className="w-4 h-4 rounded flex-shrink-0"
      style={{ border: '1.5px solid rgba(255,255,255,0.25)', background: 'transparent' }} />
    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
  </div>
  <span className="text-[9px] px-1.5 py-0.5 rounded font-medium tracking-wide uppercase"
    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
    Profile only
  </span>
</div>
```

**Checkbox states:**
- Unchecked: `border: '2px solid #6b7280'`, transparent background
- Checked: `border: '2px solid #00c896'`, `background: '#00c896'`, black checkmark (`fill="#000"`)
- Row background when checked: `rgba(0,200,150,0.04)`, hover: `rgba(0,200,150,0.06)`

---

## 33. Add Filter Parameter Dropdown

The dropdown panel that opens when clicking "+ Add Filter". **Always dark** — uses hardcoded dark colors, not CSS variables (intentional, works in both light and dark themes).

```tsx
<div className="absolute rounded-xl border overflow-hidden"
  style={{
    top: 'calc(100% + 6px)', left: 14,
    width: 300,
    background: '#1a1d27',
    borderColor: '#2a2d3a',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    zIndex: 9999,
  }}>

  {/* Search input */}
  <div className="p-2.5 border-b" style={{ borderColor: '#2a2d3a' }}>
    <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
      placeholder="Search parameters…"
      className="w-full px-2.5 py-1.5 rounded-lg text-sm focus:outline-none"
      style={{ background: '#0f1117', border: '1px solid #2a2d3a', color: '#ffffff' }}
      onFocus={e => e.currentTarget.style.borderColor = '#00c896'}
      onBlur={e => e.currentTarget.style.borderColor = '#2a2d3a'} />
  </div>

  {/* Scrollable group list */}
  <div style={{ maxHeight: 340, overflowY: 'auto', padding: '6px 0' }}>
    {groups.map(([group, params]) => (
      <div key={group}>
        {/* Group header */}
        <div className="px-3 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.28)' }}>
          {group}
        </div>
        {/* Parameter rows */}
        {params.map(p => {
          const active = activeKeys.has(p.key)
          return (
            <button key={p.key} onClick={() => onSelect(p.key)}
              className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-left transition-colors"
              style={{ color: active ? '#00c896' : 'rgba(255,255,255,0.75)', background: 'transparent' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <span>{active ? '✓ ' : ''}{p.label}</span>
              {/* Type tag */}
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: tag.bg, color: tag.color }}>
                {tag.label}
              </span>
            </button>
          )
        })}
      </div>
    ))}
    {/* Empty state */}
    {groups.length === 0 && (
      <p className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No parameters match</p>
    )}
  </div>
</div>
```

### Type Tag Colors
```ts
const TAG = {
  range: { label: 'range', color: '#00c896', bg: 'rgba(0,200,150,0.1)'   },  // green
  multi: { label: 'multi', color: '#7b9fff', bg: 'rgba(100,150,255,0.1)' },  // blue
  text:  { label: 'text',  color: '#ffc840', bg: 'rgba(255,200,80,0.1)'  },  // gold
}
```

Tag element: `className="text-[10px] px-1.5 py-0.5 rounded"`

### States
- **Default row:** `color: 'rgba(255,255,255,0.75)'`, transparent background
- **Hover:** `background: 'rgba(255,255,255,0.06)'`
- **Active (already selected):** `color: '#00c896'`, `✓ ` prefix, hover disabled
- **Group header:** `color: 'rgba(255,255,255,0.28)'`
- **Empty state:** `color: 'rgba(255,255,255,0.3)'`

> **Note:** This dropdown is always dark (`#1a1d27` background) regardless of app theme — by design.

---

## 34. Dropdown / Autocomplete

Always use `createPortal` to `document.body` with `position: fixed` + `getBoundingClientRect()` to avoid clipping by `overflow-hidden` parents.

```tsx
createPortal(
  <div style={{
    position: 'fixed',
    top: rect.bottom + 2,
    left: rect.left,
    width: rect.width,
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    maxHeight: 160,
    overflowY: 'auto',
    borderRadius: 8,
    zIndex: 9999,
  }}>
    {items.map(item => (
      <button className="w-full text-left text-[10px] px-3 py-1.5"
        style={{ color: 'var(--text-primary)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        {item}
      </button>
    ))}
  </div>,
  document.body
)

---

## 35. Player Profile — Header

Top strip of every player profile card. Avatar + name (fontSize 19, weight 800) + pills row + action buttons.

```tsx
<div className="flex items-start gap-4" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
  {/* Avatar — green gradient if no photo, border-only if photo */}
  <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center text-lg font-bold text-black flex-shrink-0"
    style={hasPhoto ? { border: '1px solid var(--border)' } : { background: 'linear-gradient(135deg, #00c896, #00a878)', boxShadow: '0 0 16px rgba(0,200,150,0.3)' }}>
    {hasPhoto ? <img src={photo} /> : <>{firstName[0]}{lastName[0]}</>}
  </div>
  {/* Name + pills */}
  <div className="flex-1 min-w-0">
    <h1 className="leading-tight mb-1.5" style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
      {fullName}
    </h1>
    <div className="flex items-center flex-wrap" style={{ gap: '4px 6px' }}>
      {/* Position pill — positionPillStyle() */}
      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={positionPillStyle(pos)}>Centre-Back</span>
      <span style={{ color: 'var(--text-faint)' }}>·</span>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{clubName}</span>
      {/* League — green when set */}
      <span style={{ color: 'var(--text-faint)' }}>·</span>
      <span className="text-xs" style={{ color: '#00c896' }}>{league}</span>
      <span style={{ color: 'var(--text-faint)' }}>·</span>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{nationality}</span>
      <span style={{ color: 'var(--text-faint)' }}>·</span>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{age} yrs</span>
    </div>
  </div>
  {/* Action buttons */}
  <div className="flex items-center gap-2 flex-shrink-0">{actionButtons}</div>
</div>
```

Pills row rules: position uses indigo pill, league uses `#00c896`, all other pills use `text-secondary`.

---

## 36. Position Pill (`positionPillStyle`)

All known football positions use a **single indigo style** from `positionPillStyle(pos)` in `src/lib/positionColor.ts`. Returns `null` for unknown strings — render as plain `text-secondary` text instead.

```tsx
// Indigo style (returned for known positions):
{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }

// Usage:
const s = positionPillStyle(pos)
return s
  ? <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={s}>{pos}</span>
  : <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{pos}</span>
```

---

## 37. Profile Field Rows (Row / LinkRow / DescRow)

Three row variants used inside the 3-column profile card body.

### Row (standard click-to-edit)
```tsx
<div className="field-row flex items-center justify-between gap-2 group cursor-text"
  onClick={() => setLocalActive(true)}
  style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
  <div className="flex items-center gap-1">
    {manual && hasValue && <span style={{ color: '#00c896', fontSize: 9 }}>✎</span>}
    <span className="text-[11px] font-medium text-right"
      style={{ color: hasValue ? (highlight ? '#00c896' : 'var(--text-primary)') : 'var(--text-faint)' }}>
      {display ?? '—'}
    </span>
    <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-30 transition-opacity" viewBox="0 0 24 24" fill="#00c896">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04..."/>
    </svg>
  </div>
</div>
```

**Inline edit input** (when active):
```tsx
<input className="text-[11px] font-medium text-right focus:outline-none rounded px-2 py-1"
  style={{ width: 100, color: 'var(--text-primary)', background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896' }}
  onBlur={() => { setLocalActive(false); onQuickSave?.() }} />
```

**`highlight` prop** — renders value in `#00c896` instead of `text-primary`. Used for Market Value and Availability.

**`manual` prop** — shows green ✎ indicator before the value when the field was manually edited.

### LinkRow (URL field)
```tsx
// Has URL → clickable link:
<a className="text-[11px] font-medium flex items-center gap-0.5 hover:underline" style={{ color: '#00c896' }}>
  {label} ↗
</a>
// No URL → dash + faint pencil on hover (same group pattern as Row)
```

### DescRow (multi-line description)
Used at the bottom of the Scout Info column. Displays in a subtle-bg box; edits to a textarea on click.

```tsx
// Display state:
<div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
  <p className="text-[9px] uppercase font-semibold" style={{ color: 'var(--text-faint)', letterSpacing: '0.7px' }}>Description</p>
  <div className="text-[11px] whitespace-pre-wrap"
    style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)', borderRadius: 7,
      padding: '7px 9px', minHeight: 64, lineHeight: 1.55,
      color: hasValue ? 'var(--text-secondary)' : 'var(--text-faint)',
      fontStyle: hasValue ? 'normal' : 'italic' }}>
    {display ?? 'No description yet. Click to add…'}
  </div>
</div>

// Edit state (textarea):
<textarea rows={3} className="text-[11px] focus:outline-none rounded px-2 py-1 resize-none"
  style={{ color: 'var(--text-primary)', background: 'rgba(0,200,150,0.06)',
    border: '1px solid rgba(0,200,150,0.35)', caretColor: '#00c896' }}
  onBlur={() => { setLocalActive(false); onQuickSave?.() }} />
```

---

## 38. LinkChips (Source Chips)

Source URL chips on player profiles (Transfermarkt, Sofascore, FMInside, Instagram, etc.). Three states per chip.

**Section label** (above chip row):
```tsx
<p className="text-[9px] uppercase tracking-[.7px] font-semibold mt-2.5 mb-1.5 pt-2.5 border-t"
  style={{ color: 'var(--text-faint)', borderColor: 'var(--border)' }}>Links</p>
```

**Has URL — split chip** (left = open site, right = edit icon):
```tsx
<a href={url} target="_blank" rel="noopener noreferrer"
  className="text-[10px] font-medium px-2 py-0.5 hover:opacity-80"
  style={{ color: '#00c896', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)',
    borderRadius: '6px 0 0 6px', textDecoration: 'none' }}>
  {label}
</a>
<button onClick={() => setEditing(label)}
  className="flex items-center justify-center px-1.5 py-0.5 hover:opacity-80"
  style={{ color: '#00c896', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)',
    borderLeft: 'none', borderRadius: '0 6px 6px 0' }}>
  {/* pencil icon w-[9px] */}
</button>
```

**No URL — dashed placeholder** (click opens edit):
```tsx
<button className="text-[10px] font-medium px-2 py-0.5"
  style={{ color: 'var(--text-faint)', background: 'transparent',
    border: '1px dashed var(--border)', borderRadius: '6px' }}>
  {label}
</button>
```

**Editing state — inline input** (replaces chip):
```tsx
<input className="text-[10px] rounded-md px-2 py-0.5 focus:outline-none"
  style={{ background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.4)',
    color: 'var(--text-primary)', width: 150, caretColor: '#00c896' }}
  onBlur={() => { setEditing(null); onBlur?.() }} />
```

---

## 39. HighlightsField (Multi-URL Video Links)

Stored as a JSON array of URL strings (`JSON.stringify([...])`). Each URL renders as a green chip with an external-link icon and a remove ✕ button.

```tsx
{/* Section header — same style as LinkChips section label */}
<p className="text-[9px] uppercase tracking-[.7px] font-semibold mb-1.5"
  style={{ color: 'var(--text-faint)' }}>Highlights</p>

{/* Video link chip */}
<a href={url} target="_blank" rel="noopener noreferrer"
  className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md flex-1 min-w-0 hover:opacity-80"
  style={{ color: '#00c896', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)', textDecoration: 'none' }}>
  {/* play icon + "Video N" label + external link icon */}
</a>

{/* Remove button */}
<button className="w-4 h-4 flex items-center justify-center rounded"
  style={{ color: 'var(--text-faint)' }}
  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}>
  {/* ✕ icon 8×8 */}
</button>

{/* Add highlight button */}
<button className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md"
  style={{ color: 'var(--text-faint)', background: 'transparent', border: '1px dashed var(--border)' }}
  onMouseEnter={e => { e.currentTarget.style.color = '#00c896'; e.currentTarget.style.borderColor = 'rgba(0,200,150,0.4)' }}
  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
  + Add highlight
</button>

{/* Add input (when adding = true) */}
<input autoFocus placeholder="https://…"
  className="flex-1 text-[10px] rounded-md px-2 py-0.5 focus:outline-none"
  style={{ background: 'rgba(0,200,150,0.07)', border: '1px solid rgba(0,200,150,0.4)',
    color: 'var(--text-primary)', caretColor: '#00c896' }} />
```

---

## 40. Player Profile — Full Card Layout

The overall structure of the profile card. Four vertical zones stacked:

```
┌──────────────────────────────────────────────────────────┐
│  Header (card-bg)  — avatar · name · pills · buttons     │
├──────────────┬──────────────────┬────────────────────────┤
│  Physical    │  Contract &      │  Scout Info            │
│  (card-bg)   │  Value (card-bg) │  (card-bg)             │
├──────────────┼──────────────────┼────────────────────────┤
│  Heat Map    │  Season Stats    │  FM Attributes         │
│  (subtle-bg) │  (subtle-bg)     │  (subtle-bg)           │
├──────────────┴──────────────────┴────────────────────────┤
│  Evaluations (card-bg)                                    │
└──────────────────────────────────────────────────────────┘
```

**3-column body** (Physical | Contract & Value | Scout Info):
```tsx
<div className="grid grid-cols-3">
  <div className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
    <p className="text-[10px] uppercase font-bold mb-3 pl-2 border-l-2" style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Physical</p>
    {/* Row components */}
  </div>
  {/* repeat for other 2 cols — last col has no borderRight */}
</div>
```

**Bottom data grid** (Heat Map | Season Stats | FM Attributes):
```tsx
<div className="grid grid-cols-3" style={{ background: 'var(--subtle-bg)', borderTop: '1px solid var(--border)' }}>
  <div className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
    <p className="text-[9px] uppercase font-bold mb-2" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Heat Map</p>
    <HeatmapDisplay json={form.heatmap} />
  </div>
  <div className="p-4" style={{ borderRight: '1px solid var(--border)' }}>
    <p …>Season Stats</p>
    <SeasonStatsEditor … /> {/* or SeasonStatsGrid if read-only */}
  </div>
  <div className="p-4">
    <p …>FM Attributes</p>
    <FMRadarChart … /> {/* or FMAttributesEditor when editing */}
  </div>
</div>
```

Key difference between zones: body uses `var(--card-bg)`, bottom grid uses `var(--subtle-bg)`.

---

## 41. Web Scout — Search Card Header

The search result card header differs from the player profile header in two key ways: the avatar is **neutral** (not a green gradient), and the right-side action is an **Import to List** button (not Save/Delete).

```tsx
<div className="flex items-start gap-4" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
  {/* Neutral avatar — var(--hover-bg) bg, first letter in text-faint */}
  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
    style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
    <span className="text-xl font-bold" style={{ color: 'var(--text-faint)' }}>{firstName[0]}</span>
  </div>
  {/* Name + pills — same font/size as profile card */}
  <div className="flex-1 min-w-0">
    <h3 className="leading-tight mb-1.5"
      style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
      {fullName}
    </h3>
    <div className="flex items-center gap-1.5 flex-wrap mb-2">
      {/* position indigo pill · club · league (#00c896) · nationality · age — all text-faint on search card */}
    </div>
  </div>
  {/* Import button — default state */}
  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
    style={{ background: 'var(--subtle-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
    Import to List
  </button>
</div>
```

**Import button states:**

| State | background | color | border |
|---|---|---|---|
| Default (no list selected) | `var(--subtle-bg)` | `var(--text-primary)` | `var(--border)` |
| Active (list selected) | `rgba(0,200,150,0.1)` | `#00c896` | `rgba(0,200,150,0.35)` |

Active state also changes the label to "Add to [List Name]".

**Key differences from profile card header:**
- Avatar: neutral `var(--hover-bg)` bg + `text-faint` letter vs green gradient
- Right action: Import button vs Save/Delete buttons
- Pills row text colors: nationality and age use `text-faint` (not `text-secondary`)

---

## 42. CardField (Read-Only Field Row)

A display-only field row used in the search result card for data that the scout cannot edit inline (Added date, Sent by, scraper-derived values).

```tsx
<div className="flex items-center justify-between gap-2"
  style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
  <span className="text-[11px] font-semibold text-right"
    style={{ color: value ? (highlight ? '#00c896' : 'var(--text-primary)') : 'var(--text-faint)' }}>
    {value ?? '—'}
  </span>
</div>
```

**Key differences from `Row` (profile card):**
- `font-semibold` value (profile card uses `font-medium`)
- No `group cursor-text` class — not clickable
- No pencil icon
- No `manual` / ✎ indicator

**`highlight` prop** — renders value in `#00c896`. Used for Market Value.

---

## 43. EditableField (Search Card Click-to-Edit)

The search card's editable field row. Looks nearly identical to `Row` from the profile card but has three differences: `font-semibold` value, pencil opacity `group-hover:opacity-40` (not 0.30), and no `manual`/✎ indicator. Edit-state label turns green, input uses slightly stronger green tints.

### Display state
```tsx
<div className="flex items-center justify-between gap-2 group cursor-text"
  style={{ borderBottom: '1px solid var(--border)', padding: '4px 0' }}>
  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
  <div className="flex items-center gap-1">
    <span className="text-[11px] font-semibold text-right"
      style={{ color: value ? (highlight ? '#00c896' : 'var(--text-primary)') : 'var(--text-faint)' }}>
      {value ?? '—'}
    </span>
    {/* Pencil — opacity-40 on hover (profile card uses opacity-30) */}
    <svg className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0"
      viewBox="0 0 24 24" fill="#00c896">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
    </svg>
  </div>
</div>
```

### Active (edit) state — single-line
```tsx
<div className="flex items-center justify-between gap-2" style={{ padding: '4px 0' }}>
  {/* Label turns green when active */}
  <span className="text-[11px] flex-shrink-0" style={{ color: 'rgba(0,200,150,0.8)' }}>{label}</span>
  <input className="text-[11px] font-medium text-right focus:outline-none rounded px-1.5 py-0.5"
    style={{
      flex: 1, maxWidth: 130,
      background: 'rgba(0,200,150,0.07)',
      border: '1px solid rgba(0,200,150,0.3)',
      color: 'var(--text-primary)',
      caretColor: '#00c896',
    }}
    onFocus={e => {
      e.currentTarget.style.background = 'rgba(0,200,150,0.12)'
      e.currentTarget.style.borderColor = 'rgba(0,200,150,0.6)'
    }}
    onBlur={e => {
      e.currentTarget.style.background = 'rgba(0,200,150,0.07)'
      e.currentTarget.style.borderColor = 'rgba(0,200,150,0.3)'
    }} />
</div>
```

### Active (edit) state — multiline
```tsx
<div className="flex flex-col gap-1">
  <span className="text-[11px]" style={{ color: 'rgba(0,200,150,0.8)' }}>{label}</span>
  <textarea rows={3} className="text-[11px] focus:outline-none rounded px-1.5 py-1 resize-none"
    style={{
      width: '100%',
      background: 'rgba(0,200,150,0.07)',
      border: '1px solid rgba(0,200,150,0.3)',
      color: 'var(--text-primary)',
      caretColor: '#00c896',
    }} />
</div>
```

**Summary of differences vs profile `Row`:**

| Detail | `EditableField` (search card) | `Row` (profile card) |
|---|---|---|
| Value font-weight | `font-semibold` | `font-medium` |
| Pencil hover opacity | `opacity-40` | `opacity-30` |
| Manual ✎ indicator | None | Yes (when `manual` prop set) |
| Active label color | `rgba(0,200,150,0.8)` | `var(--text-muted)` (unchanged) |
| Active input bg | `rgba(0,200,150,0.07)` | `rgba(0,200,150,0.06)` |
| Active input border | `rgba(0,200,150,0.3)` | `rgba(0,200,150,0.35)` |

---

## 44. Plays in the National team — Filled Pill (Search Card Variant)

The search result card uses a **filled `rounded-full` pill** for "Plays in the National team" — not the `BoolRow` neutral variant used on the profile card. Lives in the Contract & Value section.

```tsx
{/* True — green fill */}
<button className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
  style={{ background: '#00c896', color: '#fff', border: '1px solid #00c896' }}>
  Yes
</button>

{/* False — neutral */}
<button className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
  style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
  No
</button>
```

**Contrast with profile card `BoolRow`:** Profile card uses `rounded` (not `rounded-full`), `font-medium`, and applies green/red semantics (green = available, red = not available). This search card pill is neutral for "No" and always green-filled for "Yes" regardless of positive/negative framing.

---

## 45. PlayerFilesSection (File Attachments)

`src/components/PlayerFilesSection.tsx` — appears below Evaluations in the player profile card. Lists attached files; owners/contributors can upload (max 20 MB) and delete.

### Header row
```tsx
<div className="flex items-center justify-between mb-3">
  <div className="flex items-center gap-2">
    <p className="text-[9px] uppercase font-bold" style={{ letterSpacing: '0.9px', color: 'var(--text-muted)' }}>Files</p>
    {files.length > 0 && (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
        style={{ background: 'var(--subtle-bg)', color: 'var(--text-faint)', border: '1px solid var(--border)' }}>
        {files.length}
      </span>
    )}
  </div>
  {/* Attach file button — dashed, greens on hover */}
  <button className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg"
    style={{ color: 'var(--text-muted)', background: 'transparent', border: '1px dashed var(--border)' }}>
    + Attach file
  </button>
</div>
```

### File row
```tsx
<div className="flex items-center gap-2.5 px-3 py-2 rounded-xl group"
  style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>
  {/* Type icon — color: var(--text-faint), w-4 h-4 */}
  <span style={{ color: 'var(--text-faint)' }}><FileIcon mimeType={file.mimeType} /></span>

  <div className="flex-1 min-w-0">
    {/* Name — links to fileUrl in new tab */}
    <a href={file.fileUrl} target="_blank" className="text-[11px] font-medium truncate block hover:underline"
      style={{ color: 'var(--text-primary)' }}>{file.fileName}</a>
    <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
      {fmtSize(file.fileSize)} · {date} · {uploaderName}
    </p>
  </div>

  {/* Open icon (group-hover) */}
  <a href={file.fileUrl} target="_blank"
    className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100"
    style={{ color: 'var(--text-faint)', background: 'var(--hover-bg)' }}>
    {/* external link svg w-3 h-3 — turns #00c896 on mouseEnter */}
  </a>

  {/* Delete icon (group-hover, canWrite only) */}
  <button className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100"
    style={{ color: 'var(--text-faint)', background: 'var(--hover-bg)' }}
    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}>
    {/* trash svg w-3 h-3 */}
  </button>
</div>
```

**File type icons** (all `w-4 h-4`, color inherited from parent `text-faint` span):
- `image/*` → photo icon
- `application/pdf` → PDF icon  
- `*spreadsheet* | *excel* | *csv*` → grid icon
- everything else → generic document icon

**`fmtSize` helper:**
```ts
function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
```

**Storage:** Supabase bucket `player-files`. Path per file: `{playerId}/{uuid}`. Original name stored in `PlayerFile.fileName` DB field.

---

## 46. Image Upload Button with Preview

Used in Settings → My Branding for logo upload. Hidden `<input type="file">` triggered by a visible button. On file select, converts to base64 data URL via `FileReader` and stores in state — no storage bucket needed for small images.

```tsx
const fileInputRef = useRef<HTMLInputElement>(null)
const [uploading, setUploading] = useState(false)
const [imageUrl, setImageUrl] = useState('')  // base64 data URL

async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { /* error */ return }
  if (file.size > 5 * 1024 * 1024) { /* error */ return }
  setUploading(true)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  setImageUrl(dataUrl)
  setUploading(false)
  if (fileInputRef.current) fileInputRef.current.value = ''
}

// Hidden input
<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

// Preview box (64×64)
<div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden"
  style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>
  {imageUrl
    ? <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
    : <svg className="w-6 h-6" style={{ color: 'var(--text-faint)' }} ... />
  }
</div>

// Upload trigger button (ghost style)
<button onClick={() => fileInputRef.current?.click()} disabled={uploading}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
  onMouseEnter={e => { if (!uploading) { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' } }}
  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
  {uploading
    ? <><div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: '#00c896', borderTopColor: 'transparent' }} />Uploading…</>
    : <><svg className="w-3.5 h-3.5" ...>upload icon</svg>{imageUrl ? 'Replace' : 'Upload'}</>
  }
</button>

// Remove link (shown when image set)
{imageUrl && (
  <button onClick={() => setImageUrl('')} className="text-xs px-2 py-1 rounded-lg"
    style={{ color: 'var(--text-faint)' }}
    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}>
    Remove
  </button>
)}
```

**Notes:**
- File input is always `className="hidden"` — never shown directly
- Preview wrapper is fixed 64×64 with `objectFit: 'contain'` and 4px inner padding
- Spinner uses brand green: `borderColor: '#00c896', borderTopColor: 'transparent'`
- Base64 data URLs can be stored directly in a DB `String` field — suitable for small images (logos, avatars). Don't use for large files.

---

## 47. Download Link Styled as Button

An `<a>` tag with the `download` attribute that triggers a file save dialog. Use instead of `<button>` when the action is a file download from an API endpoint.

```tsx
<a
  href="/api/databases/[id]/players/[playerId]/player-report/pdf"
  download
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
  style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', textDecoration: 'none' }}
  onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v6h5.66V9h3.84L12 2z"/>
  </svg>
  Save PDF
</a>
```

**Key rules:**
- Always `textDecoration: 'none'` — otherwise the browser underlines it as a link
- `download` attribute (no value) uses the filename from the `Content-Disposition` response header
- Style identically to ghost secondary buttons (section 6) so it blends into button rows
- The API route must return `Content-Disposition: attachment; filename="..."` and correct `Content-Type`

---

## 48. Tracking Info / Agent Info Split

The third column of the player card is divided into two sub-sections separated by a divider:

**Tracking Info** — observation/tracking data: Added, Sent by, Referral, Links, Highlights, Description

**Agent Info** — representation/business data: Agent, Agent Phone, I Represent the Player, Mandate Since

Note: "Plays in the National team" is in the Contract & Value column (not Tracking Info).

```tsx
{/* Tracking Info */}
<p className="text-[10px] uppercase font-bold mb-2 pl-2 border-l-2"
  style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Tracking Info</p>
{/* ... tracking rows ... */}

{/* Agent Info */}
<div className="mt-3 pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
  <p className="text-[10px] uppercase font-bold mb-2 pl-2 border-l-2"
    style={{ letterSpacing: '0.9px', color: 'var(--text-primary)', borderColor: '#00c896' }}>Agent Info</p>
  {/* ... agent rows ... */}
</div>
```

Applied consistently in: `PlayerPanelCard.tsx`, `PlayerProfileCard.tsx`, `SearchClient.tsx`.

---

## 49. Player Card Header Action Buttons (Panel)

Save Profile, Delete Profile, and ✕ live inside the player card header right-side button group — not in an outer panel header bar.

```tsx
{/* Save Profile — three states */}
<button
  onClick={() => { (document.activeElement as HTMLElement)?.blur(); flush() }}
  disabled={saving || !isDirty}
  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all"
  style={saving || isDirty
    ? { background: 'rgba(0,200,150,0.1)', color: '#00c896', border: '1px solid rgba(0,200,150,0.35)', cursor: saving ? 'default' : 'pointer' }
    : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'default' }}
  onMouseEnter={e => { if (!saving && isDirty) { e.currentTarget.style.background = 'rgba(0,200,150,0.18)' } }}
  onMouseLeave={e => { e.currentTarget.style.background = saving || isDirty ? 'rgba(0,200,150,0.1)' : 'transparent' }}>
  {saving
    ? <><div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />Saving…</>
    : <><svg .../>Save Profile</>
  }
</button>

{/* Delete Profile */}
<button style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
  onMouseEnter → rgba(239,68,68,0.06) bg + #ef4444 text + red border
  onMouseLeave → reset>
  Delete Profile
</button>

{/* Close ✕ */}
<button className="w-6 h-6 flex items-center justify-center rounded-md"
  style={{ color: 'var(--text-faint)', border: '1px solid var(--border)' }}
  onMouseEnter → text-secondary + border-strong
  onMouseLeave → reset>
  ✕ svg
</button>
```

**Save button states:**
- Inactive (no changes): ghost style, `cursor: 'default'`, full opacity — always visible
- Dirty (unsaved changes): `rgba(0,200,150,0.1)` bg + green border + pointer cursor
- Saving: spinner + "Saving…", `cursor: 'default'`
- Never use `disabled:opacity` — the button stays fully visible in all states

---

## 50. Clubs Page — Team Pills Row

The right panel of the Clubs page has a team-level tab row above the requests section. Uses blue (`#6c8fff`) as the accent color throughout.

```tsx
{/* Pills row */}
<div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b"
  style={{ borderColor: 'var(--border)', background: 'var(--subtle-bg)' }}>

  {/* All pill */}
  <button onClick={() => setSelectedLevel(null)}
    className="px-3 py-1 rounded-full text-xs font-medium transition-all"
    style={!selectedLevel
      ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
      : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
    All
  </button>

  {/* Team level pills — clean, no inline ✕ */}
  {teamLevels.map(level => (
    <button key={level} onClick={() => setSelectedLevel(level)}
      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
      style={active
        ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
        : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
      {level}
      {count > 0 && <span className="ml-1.5 text-[10px] opacity-70">{count}</span>}
    </button>
  ))}

  {/* Manage Teams settings button — right-aligned */}
  <button onClick={() => setManageTeamsOpen(true)}
    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ml-auto"
    style={{ background: 'transparent', color: 'var(--text-faint)', border: '1px solid var(--border)' }}
    onMouseEnter={e => { e.currentTarget.style.color = '#6c8fff'; e.currentTarget.style.borderColor = 'rgba(108,143,255,0.4)'; e.currentTarget.style.background = 'rgba(108,143,255,0.06)' }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}>
    {/* gear svg */}
    Manage Teams
  </button>
</div>
```

**Team contact card** (shown below pills when a specific team is selected):
```tsx
<div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
  <div className="flex items-center justify-between gap-3">
    {/* Avatar icon + contact details or "No contact yet" */}
    <button onClick={() => openContactEdit(selectedLevel)}>
      {currentContact ? 'Edit' : '+ Add Contact'}
    </button>
  </div>
</div>
```

**Key rules:**
- Team pills never have inline ✕ buttons — removal is through the "Manage Teams" modal only
- "Manage Teams" button always sits at the far right of the pills row (`ml-auto`)
- Blue (`#6c8fff`) is the clubs accent — used the same way green (`#00c896`) is used in Studio

---

## 51. Manage Teams Modal

Modal for adding/removing team levels for a club. Has three sections: active teams (removable), suggested teams to add back, and a custom name input.

**Active teams** — blue chips with ✕:
```tsx
{draft.map(level => (
  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
    style={{ background: 'rgba(108,143,255,0.12)', color: '#6c8fff', border: '1px solid rgba(108,143,255,0.3)' }}>
    {level}
    <button onClick={() => setDraft(prev => prev.filter(l => l !== level))}
      className="opacity-50 hover:opacity-100 transition-opacity ml-0.5 text-[10px]">✕</button>
  </span>
))}
```

**Add Back section** — dashed pills for removed standard levels:
```tsx
<button onClick={() => setDraft(prev => sortLevels([...prev, level]))}
  className="text-[11px] px-2 py-0.5 rounded-full font-medium transition-all"
  style={{ background: 'var(--subtle-bg)', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}
  onMouseEnter → rgba(108,143,255,0.08) bg + #6c8fff color + rgba(108,143,255,0.3) border>
  + {level}
</button>
```

**Default levels** (exported from `TeamPicker.tsx`):
```ts
export const DEFAULT_LEVELS = [
  'First Team', 'U23', 'U21', 'U20', 'U19', 'U18', 'U17', 'U16', 'U15', 'U14',
]
```

**Key rule:** Changes are draft-only until "Save" is clicked — no live updates on individual remove/add actions.

---

## 52. Two-Row Labeled Filter Bar (Clubs)

Used in ClubPanel and AllRequestsView. Two visually distinct rows inside a single rounded card — one for **request-level filters**, one for **proposal filters**. Each row has a colored section label on the left, followed by filter controls, then an optional Reset button on the right.

```tsx
<div className="flex flex-col gap-0 rounded-xl overflow-hidden"
  style={{ background: 'var(--subtle-bg)', border: '1px solid var(--border)' }}>

  {/* ── REQUESTS row ── */}
  <div className="flex items-center gap-3 flex-wrap px-3 py-2.5"
    style={{ borderBottom: '1px solid var(--border)' }}>

    {/* Section label — blue */}
    <span className="text-[10px] uppercase font-bold flex-shrink-0"
      style={{ color: '#6c8fff', letterSpacing: '0.7px' }}>Requests</span>

    {/* Pill group with sub-label */}
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Status</span>
      {(['', 'open', 'closed'] as const).map(val => (
        <button key={val}
          className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all"
          style={active ? { background: '#6c8fff', color: '#fff', border: '1px solid #6c8fff' }
                        : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          {val || 'All'}
        </button>
      ))}
    </div>

    <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

    {/* Text input filter */}
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Position</span>
      <input type="text" placeholder="any…"
        className="text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
        style={{
          background: 'var(--input-bg)',
          border: value ? '1px solid #6c8fff' : '1px solid var(--input-border)',
          color: 'var(--text-primary)',
          width: 80,
        }} />
    </div>

    <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0 }} />

    {/* Age range */}
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium flex-shrink-0" style={{ color: 'var(--text-faint)' }}>Age</span>
      <input type="number" placeholder="min" style={{ width: 50, /* same input style */ }} />
      <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>–</span>
      <input type="number" placeholder="max" style={{ width: 50 }} />
    </div>

    {/* Reset — only when any filter is active */}
    {hasActiveFilters && (
      <button onClick={reset}
        className="ml-auto text-[11px] px-2 py-0.5 rounded-lg transition-all"
        style={{ color: 'var(--text-faint)', background: 'transparent', border: '1px solid var(--border)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--hover-bg)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent' }}>
        Reset
      </button>
    )}
  </div>

  {/* ── PROPOSALS row ── */}
  <div className="flex items-center gap-2 flex-wrap px-3 py-2.5">
    {/* Section label — green */}
    <span className="text-[10px] uppercase font-bold flex-shrink-0"
      style={{ color: '#00c896', letterSpacing: '0.7px' }}>Proposals</span>

    <button /* All pill */ />
    {PROPOSAL_STATUSES.map(({ value, label, color, bg, border }) => (
      <button key={value}
        className="px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all"
        style={active
          ? { background: bg, color, border: `1px solid ${border}` }
          : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
        {label}{count > 0 && <span className="ml-1 text-[10px] opacity-60">{count}</span>}
      </button>
    ))}
  </div>
</div>
```

**Rules:**
- Outer container: `rounded-xl overflow-hidden` — **not** `rounded-2xl` (filter bars are compact)
- REQUESTS label: `color: '#6c8fff'` (blue) — matches the Clubs accent color
- PROPOSALS label: `color: '#00c896'` (green) — matches proposal/player accent
- Divider between filter groups: `width: 1, height: 14` — shorter than the standard 16px
- Text inputs turn `border: '1px solid #6c8fff'` when they have a value (active state feedback)
- Reset button uses `ml-auto` to push to far right — only rendered when at least one filter is non-default
- Proposal status pills use their own per-status colors when active (see PROPOSAL_STATUSES constant in ClubPanel.tsx and AllRequestsView.tsx)
- All filters are **client-side** — applied to already-fetched data, no re-fetch on change

**PROPOSAL_STATUSES constant** (defined in both ClubPanel.tsx and AllRequestsView.tsx):
```ts
const PROPOSAL_STATUSES = [
  { value: 'proposed',      label: 'Proposed',      color: '#6c8fff', bg: 'rgba(108,143,255,0.1)',  border: 'rgba(108,143,255,0.3)'  },
  { value: 'in_discussion', label: 'In Discussion', color: '#ff9f43', bg: 'rgba(255,159,67,0.1)',   border: 'rgba(255,159,67,0.3)'   },
  { value: 'offer',         label: 'Offer',         color: '#00c896', bg: 'rgba(0,200,150,0.1)',    border: 'rgba(0,200,150,0.3)'    },
  { value: 'signed',        label: '✓ Signed',      color: '#00c896', bg: 'rgba(0,200,150,0.15)',   border: 'rgba(0,200,150,0.5)'    },
  { value: 'rejected',      label: 'Rejected',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)'    },
]
```

---

## 53. Underline Tab Navigation (Panel-Level)

Used at the top of the Clubs right panel. Two or more tab labels side by side, left-anchored, with a 2px bottom border underline on the active tab and a 1px separator line spanning the full width underneath.

```tsx
<div className="flex items-center gap-4 mb-3 flex-shrink-0"
  style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>

  <button onClick={() => setViewMode('clubs')}
    className="px-1 pb-2 text-sm font-semibold transition-all"
    style={viewMode === 'clubs'
      ? { color: '#6c8fff', borderBottom: '2px solid #6c8fff', marginBottom: -9 }
      : { color: 'var(--text-muted)', borderBottom: '2px solid transparent', marginBottom: -9 }}>
    Club Requests
  </button>

  <button onClick={() => setViewMode('requests')}
    className="px-1 pb-2 text-sm font-semibold transition-all"
    style={viewMode === 'requests'
      ? { color: '#6c8fff', borderBottom: '2px solid #6c8fff', marginBottom: -9 }
      : { color: 'var(--text-muted)', borderBottom: '2px solid transparent', marginBottom: -9 }}>
    All Clubs Requests
  </button>
</div>
```

**Rules:**
- `marginBottom: -9` on each button makes the 2px active underline sit exactly on the separator line (overlap trick)
- `paddingBottom: 8` on the container + `pb-2` on the button align the text baseline
- Inactive tabs: `color: 'var(--text-muted)'`, `borderBottom: '2px solid transparent'` (keeps layout stable)
- Active tabs use the section accent color — `#6c8fff` for Clubs, `#00c896` for player-focused panels
- Tabs are left-anchored (`flex items-center gap-4`) — **not** `justify-between` or centered
- The content area below must be `flex: 1, overflowY: 'auto'` in a flex-column parent so the tab bar never scrolls away
