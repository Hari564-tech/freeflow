# FeeFlow Design System (M5)

FeeFlow's UI is built on CSS variables in `src/styles.css` plus a small
reusable component library in `src/components/ui/`. All money uses
`Intl.NumberFormat('en-IN')` via `formatINR` (`src/format.ts`); amounts show
no decimals unless needed and negatives render in the danger colour.

## Tokens

Defined once in `:root` in `src/styles.css`; dark values under
`[data-theme="dark"]`. Old cream/teal names (`--teal`, `--card`, …) are kept
as aliases so legacy rules keep working.

| Token | Light | Dark |
| --- | --- | --- |
| `--primary-600` | `#4F46E5` | `#818CF8` |
| `--primary-700` | `#4338CA` | `#6366F1` |
| `--primary-50` | `#EEF2FF` | `#1E1B4B` |
| `--accent-500` | `#8B5CF6` | `#A78BFA` |
| `--ink-900` | `#0F172A` | `#E5E9F5` |
| `--ink-600` | `#475569` | `#8F9BB8` |
| `--ink-400` | `#94A3B8` | `#64748B` |
| `--bg` | `#F8FAFC` | `#0B1020` |
| `--surface` | `#FFFFFF` | `#121A2E` |
| `--surface-elevated` | `#FFFFFF` | `#1A2440` |
| `--border` | `#E2E8F0` | `#26314F` |
| success text / bg | `#047857` / `#ECFDF5` | `#34D399` / `rgba(52,211,153,.12)` |
| warning text / bg | `#B45309` / `#FFFBEB` | `#FBBF24` / `rgba(251,191,36,.12)` |
| danger text / bg | `#B91C1C` / `#FEF2F2` | `#F87171` / `rgba(248,113,113,.12)` |
| info bg | `#F0F9FF` | `rgba(56,189,248,.12)` |

Primary gradient (hero cards + main CTA):
`linear-gradient(135deg, #4F46E5, #8B5CF6)`.

## Type & spacing

- Headings: Plus Jakarta Sans, 600–800. Body: Inter, 400–600.
  (Google Fonts is blocked in the sandbox; system fallbacks apply.)
  Money and numbers: `font-variant-numeric: tabular-nums`.
- Scale: 12 / 14 / 16 / 20 / 24 / 32 / 40 px. Body 14–16 px on mobile,
  line-height 1.5 body / 1.2 headings.
- 4 px spacing grid. Radius: inputs/buttons 12 px, cards 16–20 px,
  sheets 24 px, pills 999 px.
- Shadows are soft and layered:
  `0 1px 2px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.06)`.
  Never combine a heavy border with a heavy shadow.
- Icons: Lucide (`lucide-react`), 20 px, stroke 1.75.

## Components (`src/components/ui/`)

| Component | File | Variants / states |
| --- | --- | --- |
| `Button` | `primitives.tsx` | `primary` (gradient), `secondary`, `ghost`, `danger`; `disabled`; press-scale 0.97 |
| `IconButton` | `primitives.tsx` | icon-only, `aria-label` required |
| `Chip` | `primitives.tsx` | neutral / `good` / `warn` / `bad` |
| `StatusPill` | `primitives.tsx` | `paid` ✓, `due` (Due soon), `overdue` ⚠, `unpaid`, `partial`, `draft`, `unknown` — always icon + label + colour, never colour alone |
| `Avatar` | `primitives.tsx` | initials, deterministic tone (6 hues), `ring` = `paid` / `due` / `overdue` / `none` |
| `Card`, `StatCard` | `primitives.tsx` | `StatCard` = label + value + sub + optional trend arrow |
| `ProgressBar` | `primitives.tsx` | animated fill, `tone` primary / success / warning / danger |
| `Skeleton`, `SkeletonRow` | `primitives.tsx` | shimmer loading rows |
| `EmptyState` | `primitives.tsx` | icon + title + body + optional action |
| `Tooltip` | `primitives.tsx` | hover/focus tooltip, `aria-label` fallback |
| `Input`, `AmountInput` | `forms.tsx` | label + error slot; `AmountInput` has a ₹ prefix and `inputMode="decimal"` (numeric keypad) |
| `Select` | `forms.tsx` | labelled native select |
| `SegmentedControl` | `forms.tsx` | generic over string values, `aria-pressed` |
| `Tabs` | `forms.tsx` | `role="tablist"`, keyboard-focusable |
| `ListRow` | `forms.tsx` | leading / content / trailing slots |
| `BottomSheet`, `Drawer`, `Modal` | `overlays.tsx` | focus trap + Esc + overlay click + scroll lock; sheet slides up, drawer from the right |
| `toast()` / `Toasts` | `overlays.tsx` | undo toasts via `feeflow-toast` CustomEvent, 5 s auto-dismiss |
| `Confetti` | `overlays.tsx` | 24-piece burst, first payment of the session only (`feeflow_confetti_done` in sessionStorage) |
| `QRCard` | `comms.tsx` | large QR, UPI ID, Copy link, Share, Download PNG (SVG → canvas rasterisation) |
| `WhatsAppBubble` | `comms.tsx` | WhatsApp-style preview bubble with variable chips `{student}` `{amount}` `{due_date}` `{upi_link}` |
| `ReceiptTemplate` | `comms.tsx` | logo, receipt no, student, amount, date, mode, rotated PAID stamp |
| `ChartCard` | `comms.tsx` | title + action slot + loading skeleton |

`index.ts` re-exports the library. A shared `ReceiptModal`
(`src/components/ReceiptModal.tsx`) is used by Invoices and Dashboard after
a payment is recorded.

## Theme

- `feeflow_theme` in localStorage: `light` / `dark` / `system` (default).
  `system` follows `prefers-color-scheme` via a `matchMedia` listener.
- The theme is set on `document.documentElement.dataset.theme`; the
  `<meta name="theme-color">` follows (`#F8FAFC` / `#0B1020`).
- Both themes are exercised on every screen in QA
  (`audit-tools/verify-redesign.js`).

## Motion

150–250 ms, `cubic-bezier(0.22, 1, 0.36, 1)`. KPIs count up once on load;
progress bars animate in; list items stagger-fade (max 6); bottom sheets
slide up with spring; buttons press-scale 0.97; checkmark draws on payment.
`prefers-reduced-motion` disables all of it.

## Accessibility

- WCAG AA (4.5:1) for text in both themes — measured in QA for body text,
  muted text and all status pills.
- Status is never colour alone (icon + label + colour).
- Visible focus rings: 2 px primary, offset 2 px.
- Touch targets ≥ 44 px; semantic HTML; ARIA labels on icon-only controls;
  sheets/menus are keyboard-navigable (Esc closes, focus is trapped).

## Layout

- Mobile: sticky header with a summary strip that shrinks on scroll;
  bottom tab bar with 5 items — Home, Students, centre `+` floating action
  (Add student / New invoice / Record payment), Money (Invoices, Forecast,
  What-if, Bills), Alerts (badge = open alerts).
- Desktop (≥ 1024 px): collapsible left sidebar (248 px → 76 px, persisted
  in `feeflow_sidebar_collapsed`) + top bar with search, theme toggle and
  profile menu; content max-width 1200 px.
- What-if lives under Money / Forecast; Bills under Money; Settings via the
  profile menu / top bar.

## Before / after (M5)

- Before: cream `#FAF8F3` + teal `#0F766E`, top nav on desktop, 4-item
  bottom nav + More menu, status pills were colour + text only, no dark
  mode, no shared component library, overlapping cards at 360 px on some
  screens.
- After: indigo/violet token system with dark mode on every screen,
  sidebar + top bar on desktop, 5-item bottom tab bar with centre FAB,
  icon + label + colour status pills, `src/components/ui/` library,
  hero card + KPI chips + Needs-attention list on Home, 3-step
  create-invoice flow with live preview, WhatsApp-bubble reminder preview,
  per-student notes in the detail drawer, logo upload + theme + language in
  Settings. All logic, data and PATCH forecast numbers are unchanged.
