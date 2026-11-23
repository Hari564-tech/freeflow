# FeeFlow — UI/UX, Responsiveness & Production-Readiness Audit — Fix Report (M4)

Date: Sat 21 Nov 2026. App: `feeflow/` (React + Vite + TypeScript, hand-written CSS, hash routing, 100% client-side, localStorage `feeflow_v2_state`). Audit ran in Playwright Chromium at 320 / 360 / 375 / 390 / 414 / 768 / 1024 / 1280 / 1440px on all 8 routes, plus interaction flows, plus visual review of screenshots at 375 / 768 / 1440.

Final result: **overflow detector 72/72 checks clean (scrollWidth == clientWidth everywhere), interaction suite 30/30 passed, `npm run build` exit 0, PATCH numbers unchanged.** No design, branding, colour, copy or feature was changed. No seed data, forecast logic or state shape was changed.

## 1. The 6 symptoms — root cause + exact fix

### Symptom 1 — Horizontal overflow / sideways scroll
**Root cause (three separate causes, not one):** (a) Alerts page — `.alert-buttons` had no `flex-wrap` and the action buttons were bare unstyled buttons, so the row ran past the viewport (scrollWidth 503–504px at 320–414px). (b) Students page — `.students-table` (9 columns, 682px) and Invoices `.invoices-table` (8 columns) were not wrapped in a scroll container (scrollWidth 714px at 320–414px). (c) At 320px only — Forecast: `.inline-form label` (inline-flex, gap 8px) measured 283px inside a 218px form because its number input kept the browser default width (~215px) and would not shrink; Settings: the Import JSON file input kept its intrinsic 303px width inside a 256px card. Both pushed `window.innerWidth` to 350/354 while the visual viewport stayed 320.
**Fix:** (a) Alerts action buttons given `btn btn-sm` classes. (b) Invoices and Students tables wrapped in `<div className="table-wrap">` (horizontal scroll inside the container; the wide tables themselves are by design — see §5). (c) `styles.css` M4 E block (lines 1495–1506): `.inline-form label { flex-wrap: wrap }` + `input { flex: 1 1 120px; min-width: 0 }` (120px basis keeps the side-by-side layout wherever it fits); `.settings-tab input[type="file"] { max-width: 100% }` (desktop stays 303px); `.bottom-link { min-width: 0 }`. The fixed bottom nav was a victim, not a cause — its `left: 0; right: 0` was not changed. **Verified:** 320px Forecast and Settings now `vw=320 sw=320`, real offenders 0; full re-run 72/72 `sw==vw`.

### Symptom 2 — White page on drag / overscroll
**Root cause:** `html` had no background at all, and there was no `overscroll-behavior`, so dragging past the top/bottom showed the browser's white canvas. Viewport meta was `initial-scale=1.0` and theme-color was `#0F766E` (did not match the page background).
**Fix:** background `#FAF8F3` on BOTH `html` and `body`; `overscroll-behavior: none` on `html,body`; viewport meta now exactly `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; `<meta name="theme-color" content="#FAF8F3">`; `100vh` → `100dvh` with `100vh` fallback, body `min-height: 100dvh`. **Verified:** `htmlBg`/`bodyBg` both `rgb(250, 248, 243)`, overscroll `none`; landscape 844×390 `sw=844 vw=844`.

### Symptom 3 — Shifting borders / layout moving on scroll
**Root cause:** same missing-background/overscroll cause as symptom 2, plus the mobile round's animation fill-mode regression had already been fixed earlier today (`both` → `backwards`) — re-checked and still correct: drawers/modals anchor to the viewport at 390px, and no transformed/filtered ancestor breaks the fixed bottom nav (verified by probe: no transform/filter/perspective/will-change on any ancestor).
**Fix:** the background + overscroll fixes above; no further change needed. **Verified:** mobile drawer spans full width (`w=390 x=0`); new-invoice modal overlay covers the full 390×844 viewport; drag/overscroll in mobile emulation shows no white strips and no shifting borders.

### Symptom 4 — Alignment / spacing / responsive
**Root cause:** 15 CSS classes were used in JSX with zero rules (`.kpi-grid`, `.kpi-card`, `.intro-card`, `.pricing-card`, `.drawer-actions`, `.form-actions`, `.owes-table`, `.students-table`, `.section-header`, `.toggle`, `.form-ok`, `.archived`, `.bills-tab`, `.students-tab`) — so KPI cards stacked vertically at 768/1440 instead of gridding. Body text was 15px and inputs ~13.5px (below the 16px iOS no-zoom threshold). `.slider-row` did not wrap. `.drawer` had no z-index.
**Fix:** all missing class rules added (Prompt B + B2); base font and input font set to 16px; `.slider-row` wraps; `.alert-buttons` wraps; `.drawer` z-index 1001. **Verified:** 768 dashboard shows the 2-column KPI grid, 1440 shows 4 columns; screenshots at 375/768/1440 reviewed — no clipped or overlapping text on any route.

### Symptom 5 — Click / tap / slide / interactions
**Root cause:** several small, separate gaps. (a) More menu had no Escape and no outside-click close. (b) NewInvoiceModal had no Escape close. (c) No body scroll lock on any overlay (More menu, PaymentDrawer, StudentDrawer, Tour, QrModal). (d) Dashboard "Who owes me" rows had an `onClick` on the `<tr>` — a nested interactive (row + View button). (e) Payment amount 0 and due-days 0 showed no error: the native `min="1"` blocked submit silently, so the app's own validation message never appeared. (f) Touch targets below 44px: `.btn` ~35px, `.btn-sm` ~24px, `.tab` ~37px, `.mobile-bell` 24px, `.m-select` 34px, `.m-link` 20px. (g) No focus trap in any of the 5 overlays; no `aria-sort` on sortable table headers; forecast chart tooltip was mouse-only. (h) CSV/JSON export revoked the object URL immediately after click (could break slow downloads); blocked print pop-up failed silently; Alerts wa.me link rendered even without a parent phone number.
**Fix:** (a) More menu closes on Escape and on outside mousedown. (b) NewInvoiceModal closes on Escape. (c) Scroll lock (save/restore `previousOverflow`) on all 5 overlays. (d) Row `onClick` removed; View button kept. (e) `noValidate` added to every form in `src/` (grep now shows zero forms without it), so the app's own validation messages show. (f) 44px minimum heights on buttons/tabs/bell/select/link. (g) New `useFocusTrap.ts` hook used in all 5 overlays; `aria-sort` on sortable headers; chart tap toggles the same hover tooltip as mouse. (h) Export revoke deferred with `setTimeout(..., 1000)`; blocked print shows an alert telling the user to allow pop-ups; wa.me link renders only when invoice + student + parentPhone + message all exist. **Verified:** interaction suite 30/30 (was 25/30) — the five pre-fix fails (due-days 0, More-menu Escape, More-menu outside tap, touch targets, reduced-motion) all pass now; every flow (student/bill add-edit-archive, template switch, JSON export/import, bottom nav, mobile create invoice, drawer, tour, QR, payment, print) completes end to end; zero page errors.

### Symptom 6 — API keys / env / integrations
**Root cause:** none — FeeFlow is 100% client-side with no backend and no API keys by design. Verified by searching the whole repo (`src/index.html`, `package.json`, `vite.config.ts`, all of `src/`): zero hardcoded keys/tokens/secrets/env usage, no `.env` files. `src/storage.ts` localStorage load/save is already wrapped in try/catch and falls back to seed data on empty/corrupted data (verified live: corrupt localStorage falls back to seed).
**Fix:** nothing to fix. No secret found, nothing to rotate, no `.env.example` needed (no env-dependent code was added). **Env names to set in the hosting dashboard: none** (see §4).

## 2. All other issues found — file, problem, fix

| # | File | Problem | Fix |
|---|------|---------|-----|
| 1 | `feeflow/index.html` | Viewport `initial-scale=1.0`; theme-color `#0F766E` mismatched the page bg | Viewport exactly `width=device-width, initial-scale=1, viewport-fit=cover`; theme-color `#FAF8F3` |
| 2 | `feeflow/vercel.json` | Did not exist — SPA refresh/deep link would 404 after deploy | Created with rewrites → `/index.html` |
| 3 | `feeflow/src/main.tsx` | No error boundary — a render crash would white-screen the app | ErrorBoundary added ("Something went wrong" + "Reload app") |
| 4 | `feeflow/src/styles.css` | `html` had no background; no `overscroll-behavior`; no `overflow-x: clip` | bg `#FAF8F3` on html+body; overscroll none; overflow-x clip |
| 5 | `feeflow/src/styles.css` | `100vh` only (mobile browser chrome jumps); body 15px, inputs ~13.5px (iOS zoom) | `100dvh` + `100vh` fallback, body min-height 100dvh; 16px base/inputs |
| 6 | `feeflow/src/styles.css` | `.btn` ~35px / `.btn-sm` ~24px / `.tab` ~37px — below 44px touch target | 44px min-height on buttons/tabs; `touch-action: manipulation` |
| 7 | `feeflow/src/styles.css` | 15 classes used with zero rules (incl. `.kpi-grid` — KPIs stacked vertically at 768/1440) | All missing class rules added |
| 8 | `feeflow/src/styles.css` | `.slider-row` no wrap; `.alert-buttons` no wrap; `.drawer` no z-index | Wrap added; `.drawer` z-index 1001 |
| 9 | `feeflow/src/styles.css` | No `:focus-visible` styles; images/SVG had no max-width | `:focus-visible` rings; `img/video max-width: 100%` |
| 10 | `feeflow/src/App.tsx` | More menu: no Escape close, no outside-click close, no scroll lock | `moreNavRef` + mousedown outside-close + Escape close; scroll lock with restore |
| 11 | `feeflow/src/components/NewInvoiceModal.tsx` | No Escape close | Escape handler added |
| 12 | `feeflow/src/components/PaymentDrawer.tsx` | No body scroll lock while open | Scroll lock added |
| 13 | `feeflow/src/components/StudentDrawer.tsx` | No `role`/`aria-modal`/`aria-label`; `openQr` uncaught; no scroll lock | `role="dialog" aria-modal="true" aria-label={student.name}`; `qrError` state + try/catch + message; scroll lock |
| 14 | `feeflow/src/components/Tour.tsx` | No body scroll lock while open | Scroll lock added |
| 15 | `feeflow/src/components/QrModal.tsx` | No body scroll lock while open | Scroll lock gated on `open` (modal stays mounted when closed) |
| 16 | `feeflow/src/components/DashboardTab.tsx` | `<tr onClick>` — nested interactive (row + View button) | Row onClick removed; View button kept |
| 17 | `feeflow/src/components/DashboardTab.tsx` | Sortable headers had no `aria-sort` | `aria-sort` from existing sortKey/sortDir; sort logic unchanged |
| 18 | `feeflow/src/components/InvoicesTab.tsx` | Table not wrapped (page overflow); CSV revoke immediate; `openQr` uncaught | `<div className="table-wrap">`; revoke via `setTimeout(..., 1000)`; `qrError` + try/catch + message |
| 19 | `feeflow/src/components/StudentsTab.tsx` | Table not wrapped (page overflow); form had no `noValidate` | `<div className="table-wrap">`; `noValidate` on the form |
| 20 | `feeflow/src/components/AlertsTab.tsx` | Bare unstyled action buttons (page overflow); wa.me link unguarded | Buttons now `btn btn-sm`; wa.me renders only with invoice + student + parentPhone + message |
| 21 | `feeflow/src/components/SettingsTab.tsx` | Export revoke immediate; both profile forms had no `noValidate` | Revoke via `setTimeout(..., 1000)`; `noValidate` on both forms |
| 22 | `feeflow/src/components/BillsTab.tsx` | Form had no `noValidate` | `noValidate` added |
| 23 | `feeflow/src/components/ForecastTab.tsx` | Form had no `noValidate` | `noValidate` added |
| 24 | `feeflow/src/print.ts` | Blocked print pop-up failed silently | Alert: "The print window was blocked. Please allow pop-ups for this site and try again." |
| 25 | `feeflow/src/useFocusTrap.ts` (new) | No focus trap in any of the 5 overlays (keyboard users could tab out of a modal) | New hook (Tab/Shift+Tab cycle, first-focusable on open); used in Tour, StudentDrawer, PaymentDrawer, NewInvoiceModal, QrModal |
| 26 | `feeflow/src/components/ForecastChart.tsx` | Chart tooltip was mouse-only — tapping the chart on mobile did nothing | Tap handler toggles the same hover state (tap again to dismiss); mouse hover unchanged |
| 27 | `feeflow/src/styles.css` | `.mobile-bell` 24px, `.m-select` 34px, `.m-link` 20px tall — below 44px | Min 44×44 / 44px heights added |
| 28 | `feeflow/src/styles.css` | Muted text contrast — checked, not changed | `--muted` measured 5.63:1 against `#FAF8F3` (≥4.5:1), left as-is |
| 29 | `feeflow/src/styles.css` (M4 E) | 320px Forecast form overflow (283px label in 218px form); 320px Settings file input overflow (303px in 256px card) | `.inline-form label` wraps + input `flex: 1 1 120px; min-width: 0`; file input `max-width: 100%`; `.bottom-link { min-width: 0 }` |
| 30 | `audit-tools/audit2b-interactions.js` | Harness bug, not the app: reduced-motion check compared the string literally (computed duration is `1e-05s`) | Parse duration numerically |
| 31 | `audit-tools/audit2b-interactions.js` | Harness bug, not the app: script assumed the More menu stays open after Escape, then timed out clicking 'Students' in a closed menu | Script re-opens the menu before each check; re-ran 30/30 |

## 3. Files changed

App code (all in `feeflow/`, IDE only):
- `index.html` — viewport meta, theme-color `#FAF8F3`
- `vercel.json` — new, rewrites → `/index.html`
- `src/main.tsx` — ErrorBoundary
- `src/styles.css` — background/overscroll/overflow safety net, 100dvh, 16px base, 44px targets, focus-visible, missing class rules, wrap rules, drawer z-index, 44px mobile targets, M4 E 320px block (lines 1495–1506)
- `src/App.tsx` — More-menu Escape/outside close, scroll lock
- `src/useFocusTrap.ts` — new hook
- `src/components/NewInvoiceModal.tsx` — Escape close, focus trap
- `src/components/PaymentDrawer.tsx` — scroll lock, focus trap
- `src/components/StudentDrawer.tsx` — role/aria, QR try/catch + error message, scroll lock, focus trap
- `src/components/Tour.tsx` — scroll lock, focus trap
- `src/components/QrModal.tsx` — scroll lock (gated on open), focus trap
- `src/components/DashboardTab.tsx` — row onClick removed, `aria-sort`
- `src/components/InvoicesTab.tsx` — table-wrap, CSV revoke timeout, QR try/catch
- `src/components/StudentsTab.tsx` — table-wrap, `noValidate`
- `src/components/AlertsTab.tsx` — `btn btn-sm` buttons, wa.me guard
- `src/components/SettingsTab.tsx` — export revoke timeout, `noValidate` on both forms
- `src/components/BillsTab.tsx` — `noValidate`
- `src/components/ForecastTab.tsx` — `noValidate`
- `src/components/ForecastChart.tsx` — touch tap tooltip
- `src/print.ts` — blocked pop-up alert

Not changed (as instructed): `src/data.ts` (seed data), `src/forecast.ts` (forecast logic), `feeflow_v2_state` shape, design/branding/colours/copy/features.

Audit harness (not shipped code): `audit-tools/audit1-overflow.js`, `audit-tools/audit2b-interactions.js` (two script-bug fixes), `audit-tools/audit4-probe320.js` (new), `audit-tools/audit5-probe-nav.js` (new), `audit-tools/nexen-prompts-m4.md` (prompt record).

## 4. Environment variables + keys

- **Env names to set in the hosting dashboard: none.** FeeFlow is 100% client-side; there is no backend, no API key, no env-dependent code.
- **Keys to rotate: none.** No secret of any kind exists in the repo (verified by grep across the whole tree; no `.env` files).

## 5. Not fixed — and why

1. **Google Fonts console errors (9, one per width) — not a bug, not fixed.** The sandbox egress proxy blocks `fonts.googleapis.com` (`ERR_TUNNEL_CONNECTION_FAILED`). The app falls back to system sans here and loads the font normally on a real device / Vercel. Removing the font to silence a sandbox-only error would change the design. Page errors 0, failed non-font requests 0.
2. **Wide tables scroll inside their container — by design, not a defect.** The Students table is 883px wide and the forecast table 456px; both scroll horizontally inside `.table-wrap` on small screens. The page itself never overflows (`sw==vw` on all 72 checks). Shrinking 9 columns to fit 320px would make the table unreadable.
3. **"What-if" top-nav label wraps to two lines at 768px ("What- / if") — cosmetic, left on purpose.** Forcing `white-space: nowrap` on the 8-item top nav could push it wider than 768px and reintroduce the overflow this audit just removed. It wraps cleanly and the link still works.
4. **`og.png` is not in the repo — cosmetic, pre-existing.** It is a binary file and the GitHub connector is text-only, so it could not be pushed earlier. The `og:image` meta still references it; a deploy without it just shows no preview image. Not an audit regression.
5. **Prompt E was finished from the IDE integrated terminal, not by Nexen.** Nexen stalled ~15 minutes in an investigation loop (twice, even after a nudge) without making an edit. The 320px fix was applied from the IDE terminal (same fallback pattern as Level 2 and the mobile round) and logged honestly in `BUILD_LOG.md`. The code is identical in kind to what Nexen would have written; it was verified live afterwards.

## Verification summary (evidence in `verify-audit/`)

- Overflow detector `audit1-overflow.js`: **72/72 checks, true page overflow 0** (320px Forecast/Settings `sw=320`). 15 script-flagged cases remain — all wide tables inside `.table-wrap` (by design, §5.2). `audit1-overflow.json`.
- Interaction suite `audit2b-interactions.js`: **30/30 passed, 0 failed** (was 25/30 pre-fix). `audit2b-interactions.json`.
- `npm run build`: **exit 0**, 3.23s (D) / 2.88s (E), 133 modules, CSS 23.27 kB, JS 268.01 kB, zero TS errors.
- PATCH numbers re-verified live after all fixes — 30d in 36,500 / out 19,799 / lowest 11,000 on 1 Dec / end 28,701; 60d in 59,500 / out 33,098 / lowest 11,000 / end 38,402; 90d in 82,500 / out 44,397 / lowest 11,000 / end 50,103; what-if preset "Overdue Nov fees still unpaid on rent day" lowest 4,000, verdict Shortfall; dashboard KPIs outstanding 13,500 / overdue 7,000 / collected this month 9,500 / expected next 30 days 36,500. **All unchanged.**
- Screenshots reviewed: 375/768/1440 per route (24 files) + 390 modal/drawer + landscape 844×390. Dashboard, Students, Alerts, Forecast, Settings, Invoices, What-if all render correctly; mobile drawer full width; modal centred in viewport.
- Not in scope (not done here): no push, no deploy, no rename, no submit.
