# FeeFlow

**The one-person back office for home tutors.**

## The problem

A solo home tutor runs a real business with no back office: invoices go unsent, payments go unchased, and there is no single place to see who owes what, how much, and since when — or whether the cash coming in will cover next month's bills. FeeFlow is built for that tutor: one person, a handful of students, and a business that lives or dies on fees collected on time.

## Features (Level 2)

- **Dashboard** — total outstanding (₹13,500), total overdue (₹7,000), due in the next 30 days (₹6,500), and cash position (₹12,000 in hand, ₹10,000 safety buffer, lowest forecast balance ₹11,000 on 1 Dec). Sortable "Who owes me" table with Due date, Status and Aging, Share of Receivables and Quick Actions; labelled ageing breakdown; an urgent next-action line ("Chase Vikram Patel today: ₹4,000 is 16 days overdue"). Click any row for a Student Quick-View drawer with reliability badge, invoices, parent phone, WhatsApp reminder and UPI QR.
- **Invoices** — payment drawer per row (full or partial, UPI / Cash / Bank, date, UPI ref, note) with validation against duplicates and overpayments; filters (Unpaid default, All, Overdue, Sent, Partial, Paid), month filter, search; monthly invoice generation with duplicate prevention ("Created 8 invoices for Dec 2026 · 0 skipped as duplicates"); CSV export; real client-side SVG UPI QR codes with `upi://pay` deep links; printable invoices/receipts via `window.print`; new-invoice modal with due date = issue date + 5 days (configurable in Settings). Rows become cards under 640px.
- **Students / Customers** — add, edit and archive (archived people are hidden from the Dashboard and invoice generation, data kept); reliability badges computed from payment history (Always on time / Occasionally late / Needs follow-up); validation (fee above 0, phone at least 10 digits, billing day 1–28).
- **30 / 60 / 90-day cash forecast** — editable starting cash and safety buffer; interactive SVG running-balance chart with a dashed amber buffer line, teal above / crimson below, and rich hover tooltips (date, money in/out, events, closing balance, above/below buffer); chronological events ledger with All / In / Out filters; a short "How this forecast is calculated" note. Live values for the demo data: 30-day in ₹36,500 / out ₹19,799 / lowest ₹11,000 on 1 Dec / end ₹28,701; 90-day in ₹82,500 / out ₹44,397 / lowest ₹11,000 on 1 Dec / end ₹50,103. Nothing is hard-coded — every number is computed from the data.
- **What-if (own tab)** — presets (Vikram 15 days late, All December fees 7 days late, Overdue Nov fees still unpaid on rent day) plus custom controls (delay slider 0–20 days, lose-top-student toggle, unexpected expense 0–15,000); live impact comparison with a delta card (lowest balance, date, days below buffer, verdict) and a before/after chart. The overdue-unpaid preset shows lowest ₹4,000 on 1 Dec, ₹6,000 below buffer, verdict Shortfall. The December-late preset crosses the buffer (lowest ₹9,201 on 10 Dec).
- **Alerts** — categories Overdue, Due Soon, Cash Buffer Risk, Upcoming Large Expenses; tone selector (Polite / Friendly / Firm) with escalation by days overdue (gentle up to 7 days, firmer from 8, firm after 21); Send on WhatsApp (`wa.me` link), Copy message, Mark reminder sent with a timestamp ("Last reminded: 21 Nov, 1:05 PM"), Snooze 2 days and Dismiss, all persistent. Includes the "Chase Ananya and Vikram before 1 Dec" alert linked to the what-if preset.
- **Bills** — recurring and one-time bill CRUD feeding the forecast (rent ₹8,000/1st, electricity ₹800/5th, internet ₹999/10th, study materials ₹1,500/15th, transport ₹2,000/20th, study table ₹6,500 one-time 28 Nov).
- **Settings** — Business Profile editing, Template Switcher, due-days setting (default 5), JSON export/import with shape validation, Reset Demo Data, and a "Local-first: 100% stored in your browser" note.
- **Three fully separate business templates** — Home Tutor (Priya Sharma, 8 students), Freelance Designer (Rohan Mehta Design Studio, 5 clients), Neighbourhood Salon (Kavya Studio, 6 clients). Each has its own students/customers, invoices, bills, cash and buffer.
- **60-second guided tour** — auto-starts once on first visit to the Dashboard (never hijacks a deep link), with a header button to replay it; a dismissible intro card and a pricing card (Rs 199/month) on the Dashboard.
- **Routing** — hash routes `#/dashboard`, `#/invoices`, `#/students`, `#/forecast`, `#/alerts`, `#/bills`, `#/whatif`, `#/settings` (plus `#/whatif/overdue` for the chase alert) with back/forward/refresh persistence; red actionable-alert badge on Alerts; mobile bottom nav (Dashboard / Invoices / Forecast / Alerts / More); responsive at 1280px and 390px with no horizontal overflow.

## Tech stack

- React + Vite + TypeScript (hand-written CSS design system, no Tailwind — see `BUILD_LOG.md`)
- Persistence via localStorage, key `feeflow_v2_state` — data stays on the tutor's own device
- Real client-side QR codes (`qrcode` package, SVG output), no backend, no paid APIs, no fake AI

## How to run

```bash
cd feeflow
npm install
npm run dev        # serves on http://localhost:5173
```

Build and preview a production build:

```bash
npm run build      # must pass with zero TypeScript errors
npm run preview    # serves dist/ on http://localhost:4173
```

The app was built inside the Codebenders IDE (v1.109.0) with its Nexen AI builder — see `BUILD_LOG.md` for the full build history, prompts and iterations, including the places where Nexen's write gate refused new files and the work was finished from the IDE's own integrated terminal (logged honestly). `app-LOCAL-HALTED-DO-NOT-SUBMIT/` is an earlier local attempt set aside on the IDE-only instruction; it is NOT the deliverable.

## The 60-second demo script

1. **Dashboard** — who owes you, what is overdue, cash position.
2. **Vikram's row** — open the drawer: reliability, invoices, parent phone.
3. **WhatsApp + UPI QR** — send a reminder, show the real QR for the ₹4,000 balance.
4. **What-if** — click "All December fees 7 days late": lowest ₹9,201 on 10 Dec, verdict Shortfall, below the buffer.
5. **Invoices** — record Ananya's ₹3,000 payment: her row leaves the Unpaid list, the Alerts badge drops 2 → 1, the forecast recalculates.
6. **Settings** — switch template to Freelance Designer, then Neighbourhood Salon: header, profile and data all change.

The in-app tour walks the same six steps. Start it from the "60-sec tour" button in the header.

## Data note

The app ships with synthetic demo data for a sample tutor, clearly labelled as demo data in-app. No real tutor, student, or payment data is included. All forecast numbers are computed live from that data — see `BUILD_LOG.md` for the PATCH reconciliation (30-day in 36,500 / out 19,799 / lowest 11,000 on 1 Dec / end 28,701; 90-day in 82,500 / out 44,397 / lowest 11,000 on 1 Dec / end 50,103).

## Business model & pricing

**₹199/month for a solo tutor.** One missed fee collection costs a tutor far more than ₹199 — a single month's fee from one student is typically several times that — and the hours spent each month remembering who owes what, drafting reminders, and chasing payments are hours not spent teaching or finding new students, so a tool that keeps invoices sent, reminders ready, and the cash position visible pays for itself the first time it catches one fee that would otherwise have slipped.

## Demo video

`feeflow-demo-motion.mp4` (50.0 seconds, 720x1280 vertical, with voiceover) — motion-graphics rebuild in the divyansh.fx_ reel style: white background, black + green kinetic type, clock sweep, hexagon icons, app showcase, payoff ellipse. Public link: https://drive.google.com/file/d/1XY2Q2dB_SjKEkOJlHvYLg7Bl-Cs_QgQg/view?usp=drivesdk. No facecam. The old 62.5s screen-recording demo (`feeflow-demo.mp4`) is superseded.

## Submission links

- **Live deployed URL:** PENDING — Vercel deploy is blocked: every Vercel call returns 403 "Not authorized: Trying to access resource under scope hari564-techs-projects. You must re-authenticate to this scope." The deploy-ready staging pack is in `deploy-staging/` (verified serving locally, HTTP 200, app renders); it deploys as soon as team access is re-approved. Nexen Live in this IDE build says "Publishing is coming soon" and offers no publish path.
- **Public GitHub repo URL:** https://github.com/Hari564-tech/freeflow
- **Demo video:** https://drive.google.com/file/d/1XY2Q2dB_SjKEkOJlHvYLg7Bl-Cs_QgQg/view?usp=drivesdk (50.0 seconds, 720x1280 vertical, with voiceover) — motion-graphics version in the reel style. The old 62.5s screen-recording demo is superseded.

---

**Entrant:** HARI CHANDRA SEKHAR KOLLURU — 3rd-year BTech CSE, RVIT Chebrolu (solo team)
**Event:** ACE Builders Hackathon 2026 — Problem Statement 1: "The One-Person Back Office"
