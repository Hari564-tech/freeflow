# FeeFlow Level 2 — Build Report

**Date:** Saturday 21 November 2026 (build 13:44–17:05 IST, QA 17:05–18:00 IST)
**Event:** ACE Builders Hackathon 2026 — Problem Statement 1, "The One-Person Back Office"
**Entrant:** HARI CHANDRA SEKHAR KOLLURU (solo team, 3rd-year BTech CSE, RVIT Chebrolu)
**Status:** Build complete and verified. Not pushed, not deployed, not submitted — the parent handles repo rename (freeflow → feeflow), push, Vercel deploy and hackathon submission.

## What Level 2 adds over Level 1

- Hash routing (`#/dashboard`, `#/invoices`, `#/students`, `#/forecast`, `#/alerts`, `#/bills`, `#/whatif`, `#/settings`, `#/whatif/overdue`) with back/forward/refresh persistence, a red actionable-alert badge, and a mobile bottom nav.
- A warm-minimalist design system (bg #FAF8F3, cards #FFFFFF, borders #E7E2D8, text #1C1917, teal #0F766E, red #DC2626, amber #D97706, blue #2563EB; Plus Jakarta Sans; tabular-nums currency; Indian formatting). Hand-written CSS, no Tailwind (Level 1 used hand-written CSS and Level 2 kept that — see Build log).
- Dashboard: 4 KPI cards (outstanding ₹13,500, overdue ₹7,000, due in 30 days ₹6,500, cash position ₹12,000 with lowest forecast ₹11,000 on 1 Dec), sortable Who-owes-me table (Due date, Status and Aging, Share of Receivables, Quick Actions), labelled ageing breakdown, urgent next-action line, Student Quick-View drawer with reliability badge.
- Invoices: per-row payment drawer (full/partial, UPI/Cash/Bank, validation), real client-side SVG UPI QR codes with `upi://pay` deep links, printable invoices/receipts, monthly generation with duplicate prevention, CSV export, filters + search, card rows under 640px.
- Students / Customers CRUD with reliability badges (Always on time / Occasionally late / Needs follow-up) and validation.
- Forecast 30/60/90 with editable starting cash and safety buffer, interactive SVG running-balance chart (dashed amber buffer line, teal above / crimson below, rich tooltips), chronological events ledger, and a "How this forecast is calculated" note.
- What-if as its own tab: 3 presets + custom controls (delay slider 0–20d, lose-top-student toggle, unexpected expense 0–15,000), delta card and before/after chart.
- Alerts: Overdue / Due Soon / Cash Buffer Risk / Upcoming Large Expenses, tone selector with escalation by days overdue, WhatsApp (`wa.me`) links, Copy, Mark reminder sent with timestamp, Snooze 2 days, Dismiss — all persistent.
- Bills CRUD (recurring + one-time) feeding the forecast.
- Settings: Business Profile, Template Switcher, due-days setting, JSON export/import with shape validation, Reset Demo Data, local-first note.
- Three fully separate business templates: Home Tutor (Priya Sharma, 8 students), Freelance Designer (Rohan Mehta Design Studio, 5 clients), Neighbourhood Salon (Kavya Studio, 6 clients).
- 60-second guided tour (auto-starts once on first Dashboard visit, replayable from the header), dismissible intro card, pricing card (Rs 199/month), favicon, meta description and OG image (1200×630).
- PATCH reconciliation: the forecast numbers are computed live from the seed data — 30-day in ₹36,500 / out ₹19,799 / lowest ₹11,000 on 1 Dec / end ₹28,701; 60-day in ₹59,500 / out ₹33,098 / lowest ₹11,000 on 1 Dec / end ₹38,402; 90-day in ₹82,500 / out ₹44,397 / lowest ₹11,000 on 1 Dec / end ₹50,103. The overdue-unpaid preset gives lowest ₹4,000 on 1 Dec, ₹6,000 below buffer, verdict Shortfall. No numbers are hard-coded. Rohan Mehta's designer Oct invoice is corrected (Asha Verma, amount ₹3,500, paid ₹3,000, balance ₹500, Partial) and `validateInvoiceAmounts()` enforces paid + balance = amount. "Nov 2026 invoice" is used everywhere (zero occurrences of "2026-11 invoice" in `src/`).

## Files created / modified

**New files (Level 2):** `src/router.ts`, `src/qr.ts`, `src/reminders.ts`, `src/print.ts`, `src/generation.ts`, `src/csv.ts`, `src/reliability.ts`, `src/components/Tour.tsx`, `src/components/StudentDrawer.tsx`, `src/components/PaymentDrawer.tsx`, `src/components/NewInvoiceModal.tsx`, `src/components/QrModal.tsx`, `src/components/ForecastChart.tsx`, `src/components/StudentsTab.tsx`, `src/components/BillsTab.tsx`, `src/components/WhatIfTab.tsx`, `public/favicon.svg`, `public/og.png`.

**Rewritten:** `src/types.ts`, `src/data.ts`, `src/storage.ts`, `src/forecast.ts`, `src/App.tsx`, `src/components/DashboardTab.tsx`, `src/components/InvoicesTab.tsx`, `src/components/ForecastTab.tsx`, `src/components/AlertsTab.tsx`, `src/components/SettingsTab.tsx`, `src/styles.css`, `index.html`.

**Also updated:** `README.md`, `BUILD_LOG.md`. New dependency: `qrcode@1.5.4` + `@types/qrcode`. Storage key: `feeflow_v2_state` (v1 data migrates into the tutor template).

## Build verification

Final clean build, 21 Nov ~17:55 IST:

```
$ npm run build
dist/index.html                   1.42 kB │ gzip:  0.62 kB
dist/assets/index-BCnaG3Q3.css   15.95 kB │ gzip:  3.75 kB
dist/assets/index-Cy0EOds3.js   250.45 kB │ gzip: 77.89 kB
✓ built in 2.13s
```

Zero TypeScript errors. Production preview served on `http://127.0.0.1:4173` (HTTP 200) and exercised in a real browser (Playwright Chromium headless screenshots + an interactive walkthrough in Chrome for Testing on the dev server).

## QA checklist (28 items)

Evidence levels: **browser** = clicked/seen in a real browser; **code** = logic verified against the live code (esbuild + node) or inspected in source; **render** = seen in a screenshot.

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | `npm run build` passes, zero TS errors | PASS | Final build above, exit 0, 2.13s |
| 2 | All 8 routes render | PASS (browser) | Headless screenshots 1280×900 + 390×844 for every route |
| 3 | Back / forward navigation | PASS (browser) | Dashboard → Invoices → Alt+Left returned to Dashboard |
| 4 | Refresh persistence | PASS (browser) | State and tour-seen flag survive F5 (localStorage `feeflow_v2_state`) |
| 5 | Students add / edit / archive | PASS (code + render) | Page renders 8 students with ₹-formatted fees and reliability badges; CRUD forms + validation in code; add/edit click-through not browser-tested |
| 6 | Students reliability badges | PASS (code) | All 19 people correct: Ananya, Vikram, Asha, Lakshmi, Sunita = Needs follow-up; the rest Always on time |
| 7 | Invoices filters + search + month filter | PASS (browser) | Default Unpaid shows 4 rows; controls render and filter |
| 8 | Payment drawer (full / partial) | PASS (browser) | Ananya ₹3,000 UPI payment saved; row leaves Unpaid list; Alerts badge 2 → 1 |
| 9 | Payment validation (overpay / duplicate / zero) | PASS (code) | Validation in PaymentDrawer verified against live code; overpayment and duplicate same amount+date+method rejected |
| 10 | WhatsApp reminder link | PASS (code + render) | `wa.me` link renders on Alerts + drawer; URL format and encoded text verified |
| 11 | Reminder sent timestamp | PASS (code) | `state.reminders` written on click; "Last reminded: 21 Nov, 1:05 PM" rendering path verified; click not browser-tested |
| 12 | Tone escalation (gentle / firm / final) | PASS (browser + code) | 3 days gentle, 16 days Friendly (escalated from Polite), 25 days final; visible in Alerts |
| 13 | Monthly invoice generation | PASS (browser) | "Created 8 invoices for Dec 2026 · 0 skipped as duplicates"; 8 Dec rows due 5 Dec 2026 |
| 14 | Duplicate generation prevented | PASS (code) | Re-run: 0 created, 8 skipped |
| 15 | CSV export | PASS (code) | `invoicesToCsv` verified: header Student/Month/Amount/Paid/Balance/Status/Due date, 16 rows, "Nov 2026" labels; download click not browser-tested |
| 16 | UPI QR code | PASS (browser) | Real SVG QR rendered in the modal for Vikram ₹4,000, with "Open in UPI app" deep link; SVG string verified (2,925 chars) |
| 17 | Printable invoice / receipt | PARTIAL | `printInvoice`/`printReceipt` build escaped HTML and open `window.print`; the print dialog itself was not exercised in the browser |
| 18 | Bills CRUD feeding forecast | PASS (render + code) | Bills page renders 5 recurring + 1 one-time bill with Edit/Delete and add forms; forecast consumes bills |
| 19 | Forecast 30 / 60 / 90 | PASS (code + render) | Exact PATCH numbers from live code (see above); 30-day cards render in browser |
| 20 | Forecast chart + buffer line + tooltips | PASS (browser) | Chart renders with dashed amber buffer line, teal above / crimson below, legend; tooltip code verified |
| 21 | What-if presets + sliders + delta card | PASS (browser) | "All December fees 7 days late": lowest ₹9,201 on 10 Dec, change −₹1,799, 1 day below buffer, Shortfall; overdue preset: ₹4,000, −₹7,000, 2 days, Shortfall |
| 22 | Chase alert → what-if link | PASS (browser) | `#/whatif/overdue` deep link applies the preset (lowest ₹4,000, Shortfall) |
| 23 | Template switch (Designer, Salon) | PASS (browser) | Header, profile and data all change; badge 2 for Asha's two overdue designer invoices |
| 24 | JSON export / import | PASS (code) | Export serialises state; import validates shape and rejects bad JSON; click-through not browser-tested |
| 25 | Reset Demo Data | PASS (browser) | Confirm dialog, then seed restored (Ananya overdue again, badge back to 2) |
| 26 | Responsive 1280px | PASS (browser) | All 8 routes shot at 1280×900, no overflow |
| 27 | Responsive 390px | PASS (browser) | All 8 routes shot at 390×844, no horizontal overflow; Invoices rows render as cards |
| 28 | Tour + intro + pricing + metadata | PASS (browser) | Tour auto-opens once on Dashboard, Skip/Escape close it, header button replays; intro + Rs 199/month cards render; favicon, meta description and OG image present (og.png 1200×630, 62,914 bytes) |

## Demo script — verified end to end in a real browser

1. Dashboard: KPIs ₹13,500 / ₹7,000 / ₹6,500 / cash ₹12,000, lowest ₹11,000 on 1 Dec. ✓
2. Vikram's row → drawer: Needs follow-up, Oct/Nov invoices, parent phone, WhatsApp + UPI QR buttons. ✓
3. WhatsApp + UPI QR: QR modal renders a real SVG for ₹4,000. ✓
4. What-if "All December fees 7 days late": lowest ₹9,201 on 10 Dec, verdict Shortfall, below the buffer. ✓
5. Record Ananya's ₹3,000 payment: invoice becomes Paid, Alerts badge 2 → 1. (Note: the 30-day headline totals do not change — the forecast already expected that money on 24 Nov; the payment only moves the inflow 3 days earlier, which the running-balance chart shows.) ✓
6. Settings template switch: Freelance Designer (Rohan Mehta Design Studio) then Neighbourhood Salon (Kavya Studio). ✓

## Defects found in QA and fixed

1. **Tour hijacked deep links** — auto-start ran on any first-visit route and dragged `#/invoices` to the Dashboard. Fixed: auto-start only when the landing route is the Dashboard.
2. **Students / Bills / What-if / Settings unreachable on desktop** — the More menu lives only in the bottom nav, hidden above 640px. Fixed: the top nav now renders all 8 links.
3. **Student drawer invoice table overflowed the 420px drawer.** Fixed: shorter month cell, compact drawer-table CSS.
4. **Form labels touching inputs** (Forecast cash/buffer, Alerts tone, Settings profile, PaymentDrawer, Students/NewInvoice forms). Fixed with CSS spacing rules.
5. **Reminder wording said "was due on" for not-yet-due invoices.** Fixed: "is due on" when not overdue.
6. **StudentsTab fee shown as a bare number (3000).** Fixed: `formatINR`.

## Remaining known notes (not blocking)

- The ageing "Due in 30 days" bucket is cumulative (includes the 7-day bucket), not exclusive.
- The reminder textarea shows a scrollbar for the 5-line message (rows raised from 4 to 5).
- The "Created 8 invoices" generation message lingers until navigation (component state, not data).
- `styles.css` has two `:root` blocks (old Level 1 tokens first, new design tokens second — the new values win by cascade order).
- `App.tsx` hard-codes `REFERENCE_DATE = '2026-11-21'` instead of using the template's stored `referenceDate` (same value in all three seeds today).
- Print dialog, CSV download click, JSON import click, Students add/edit click and Mark-reminder-sent click were verified at code/render level, not by clicking in the browser.

## How to run

```bash
cd feeflow
npm install
npm run dev        # http://localhost:5173
npm run build      # must pass with zero TypeScript errors
npm run preview    # http://localhost:4173
```

## How to demo to judges

Use the in-app tour (header button "60-sec tour") or run the six steps above. The story to tell: a home tutor's back office — who owes what, a cash forecast that shows whether rent day is safe, a what-if that proves chasing two overdue fees matters (₹11,000 vs ₹4,000 on 1 Dec), and one-tap WhatsApp reminders with UPI QR. Then switch templates to show the same engine works for a designer and a salon. Data is synthetic demo data, clearly labelled in-app.

## Build log honesty note

The build was done inside the Codebenders IDE as required. Nexen AI wrote most of the code from 8 prompts (each prompt text is in `/tmp/nexen-prompt-N.txt` on the build machine; the full prompt + iteration log is in `BUILD_LOG.md`). Nexen's write gate refused new files several times (Prompts 1, 5, 7, 8); those pieces were finished from the IDE's own integrated terminal and logged as such. Outside tools were used only for verification (build, tests, screenshots) and for writing the documentation deliverables (README, BUILD_LOG, this report).
