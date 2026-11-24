# FeeFlow Design System (M6 — warm paper, single light theme)

FeeFlow's UI is built on CSS variables in `src/styles.css` plus a small
reusable component library in `src/components/ui/`. All money uses
`Intl.NumberFormat('en-IN')` via `formatINR` (`src/format.ts`) and the shared
`<Money />` component; amounts show no decimals unless needed and negatives
render in the danger colour. All amounts, percentages and dates use
`font-variant-numeric: tabular-nums` so ledger columns align.

This supersedes the M5 indigo/violet system: M6 restyled the app to a warm
paper ledger look (Mercury / Stripe / Wise inspired). There is NO dark mode
in M6 — single light theme only; the M5 theme toggle and dark rules are gone
(a few dead `[data-theme="dark"]` rules remain in styles.css, never applied).

## Tokens

Defined once in `:root` in `src/styles.css`.

| Token | Value | Use |
| --- | --- | --- |
| `--primary-600` | `#0E6251` | Deep Forest Teal — primary buttons, active nav, links |
| `--primary-700` | `#0A4D3F` | Hover / pressed |
| `--primary-50` | `#EAF5F1` | Soft teal tint, selected rows |
| `--accent-500` | `#B45309` | Warm Amber — attention / due soon |
| `--ink-900` | `#16181D` | Headings, key numbers |
| `--ink-600` | `#626872` | Body text (muted stone) |
| `--ink-400` | `#8A8F98` | Placeholders, captions |
| `--bg` | `#F8F7F4` | Warm paper canvas |
| `--surface` | `#FFFFFF` | Cards, sheets |
| `--border` | `#E6E4DD` | Hairline dividers, input borders |
| success text / bg | `#0E6251` / `#EAF5F1` | Paid, received, healthy cash |
| warning text / bg | `#B45309` / `#FEF3C7` | Due soon |
| danger text / bg | `#B42318` / `#FEE4E2` | Overdue, shortfall |
| `--info-bg` | `#EAF5F1` | Tips, neutral info |

Radius: inputs/buttons 12px, cards 16–20px, sheets 24px, pills 999px.
Shadows are soft and single-layer (`0 1px 2px` / `0 8px 24px` at 6% ink).
No gradients, no glows, no glassmorphism.

## Typography

Plus Jakarta Sans for UI text (Inter fallback). Scale 12/14/16/20/24/32/40.
Headings 600–800, body 400–600. Dates render as "12 Sep" / "12 Sep 2026",
never ISO strings.

## Layout

- Desktop: fixed left sidebar, 220px — Overview, Receivables & Invoices,
  Cash Forecast, Bills & Expenses, Students; What-if simulator under Cash
  Forecast; TRIAGE section (Alerts, Bad Day Mode); Settings and "Why switch
  from a notebook?" (pricing modal) in the footer. Top utility bar with
  search, `+ Quick Invoice` and `Bad Day Mode` buttons, bell badge, avatar.
- Mobile: collapsible header + sticky bottom navigation (Home, Students,
  centre `+` action, Money, Alerts with badge). Bad Day Mode is reached from
  Alerts / the dashboard, not a bottom-bar item.
- Content max-width 1200px. Sticky top summary on mobile.

## Components (`src/components/ui/`)

Button (primary / secondary / ghost / danger), IconButton, Input, Select,
Amount input, SegmentedControl, Chip, StatusPill (icon + label + colour,
never colour alone), Avatar, Card, StatCard, ListRow, Tabs, BottomSheet,
Drawer, Modal, Toast (with Undo on mark-paid), Skeleton, EmptyState,
Tooltip, ProgressBar, QRCard, ChartCard, WhatsAppBubble, ReceiptTemplate.
Feature components live in `src/components/` (DashboardTab, AlertsTab,
ChaseTab, WhatIfTab, ForecastTab, InvoicesTab, StudentsTab, BillsTab,
SettingsTab, PricingModal, ReceiptModal, QrModal, PaymentDrawer,
StudentDrawer, NewInvoiceModal, CollectionChart, ForecastChart, Tour).

## Key behaviours

- Status is never colour alone: every pill pairs an icon + label + colour.
- Every alert has a working action button; no dead-end notifications, no
  toasts for alerts.
- Optimistic UI: mark paid is instant, with a toast + Undo.
- Loading skeletons on every data screen; friendly one-line empty states.
- Forecast: 30/60/90-day horizons, ₹0 crunch line with red shading below
  zero, configurable safety buffer (default ₹10,000), Cash Events Timeline.
- What-if: Key Customer Late Slider (0–30 days), Bad-Day preset (5 families
  15 days late), expense shock / growth toggle, live comparison banner, and
  a computed recovery plan with a 1-click "Chase These Now" button.
- PWA: `public/manifest.json` + icons + `beforeinstallprompt` handler.
  Print stylesheet covers invoices and customer statements.
- Footer line: "Built for CodeBenders ACE Builders' Hackathon 2026".
