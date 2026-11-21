# FeeFlow

**The one-person back office for home tutors.**

## The problem

A solo home tutor runs a real business with no back office: invoices go unsent, payments go unchased, and there is no single place to see who owes what, how much, and since when — or whether the cash coming in will cover next month's bills. FeeFlow is built for that tutor: one person, a handful of students, and a business that lives or dies on fees collected on time.

## Features

- **Invoice-to-payment flow** — create an invoice, track it through sent, paid, and overdue, and record payments against it.
- **WhatsApp-style reminder drafts** — polite, ready-to-send reminder messages for overdue fees, drafted in the tone a tutor would actually send.
- **"Who owes me, how much, and since when" dashboard** — outstanding fees at a glance, broken down by student, amount, and how long each payment has been overdue.
- **30–90 day cash forecast** — projected cash in from invoices and cash out to bills, so the tutor can see whether next month is covered before it arrives.
- **What-if scenarios** — model what happens if a key customer pays 15 days late (and other delays), so a late fee is a planned-for event, not a surprise.
- **Alerts with a clear next action** — every alert names the one thing to do next, e.g. send a reminder, follow up, or plan around a shortfall.

## Tech stack

- React + Vite + TypeScript
- Persistence via localStorage — data stays on the tutor's own device
- No backend, no paid APIs, no fake AI

## How to run

```bash
cd feeflow
npm install
npm run dev        # serves on http://localhost:5173
```

Build and preview a production build:

```bash
npm run build
npm run preview
```

The app was built inside the Codebenders IDE (v1.109.0) with its Nexen AI builder — see `BUILD_LOG.md` for the full build history, prompts and iterations. `app-LOCAL-HALTED-DO-NOT-SUBMIT/` is an earlier local attempt set aside on the IDE-only instruction; it is NOT the deliverable.

## Data note

The app ships with synthetic demo data for a sample tutor, clearly labelled as demo data in-app. No real tutor, student, or payment data is included.

## Business model & pricing

**₹199/month for a solo tutor.** One missed fee collection costs a tutor far more than ₹199 — a single month's fee from one student is typically several times that — and the hours spent each month remembering who owes what, drafting reminders, and chasing payments are hours not spent teaching or finding new students, so a tool that keeps invoices sent, reminders ready, and the cash position visible pays for itself the first time it catches one fee that would otherwise have slipped.

## Demo video

`feeflow-demo.mp4` (62.5 seconds, 1920x1020, with voiceover) — a screen walkthrough of the working app: Dashboard → Invoices → Forecast (including the Vikram-pays-15-days-late what-if) → Alerts → Dashboard. No facecam.

## Submission links

- **Live deployed URL:** PENDING — Vercel deploy is blocked: every Vercel call returns 403 "Not authorized: Trying to access resource under scope hari564-techs-projects. You must re-authenticate to this scope." The deploy-ready staging pack is in `deploy-staging/` (verified serving locally, HTTP 200, app renders); it deploys as soon as team access is re-approved. Nexen Live in this IDE build says "Publishing is coming soon" and offers no publish path.
- **Public GitHub repo URL:** https://github.com/Hari564-tech/freeflow
- **Demo video:** https://drive.google.com/file/d/1cpcOrmA4l-geRxa3EUzAoGfgFITvPWuA/view?usp=drivesdk (62.5 seconds, 1920x1020, with voiceover) — a screen walkthrough of the working app: Dashboard → Invoices → Forecast (including the Vikram-pays-15-days-late what-if) → Alerts → Dashboard. No facecam.

---

**Entrant:** HARI CHANDRA SEKHAR KOLLURU — 3rd-year BTech CSE, RVIT Chebrolu (solo team)
**Event:** ACE Builders Hackathon 2026 — Problem Statement 1: "The One-Person Back Office"
