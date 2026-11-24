// FeeFlow M6-expanded — Bad Day Mode (the chase queue, upgraded).
// Calm, focused triage: one card per late customer, ranked by Amount Owed x
// Days Overdue. Header: "You need ₹X for Rent in N days. Chasing these M
// families unlocks ₹Y." Buttons: Send on WhatsApp & Next / Mark paid /
// Mark Promised Date (snoozes the alert to the promised date AND moves the
// invoice's forecast pay date to it).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, PartyPopper, Send } from 'lucide-react';
import type { AppData, AppState, Invoice } from '../types';
import { addDays, diffDays, formatDate, formatINR } from '../format';
import { buildReminderMessage, waLink } from '../reminders';
import { rankChase, type ChaseRow } from '../alerts';
import { navigate } from '../router';
import PaymentDrawer from './PaymentDrawer';
import ReceiptModal, { type ReceiptInfo } from './ReceiptModal';
import { Chip, EmptyState, ProgressBar, Skeleton, SkeletonRow, toast } from './ui';

type Props = {
  data: AppData;
  state: AppState;
  onStateChange: (next: AppState) => void;
  onChange: (next: AppData) => void;
};

const CLEARED_KEY = 'feeflow_chase_cleared';

// Real calendar date in Asia/Kolkata (the day the tutor is working).
function todayIst(): string {
  const now = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function readClearedIds(): string[] {
  try {
    const raw = window.localStorage.getItem(CLEARED_KEY);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { date?: unknown }).date === todayIst() &&
      Array.isArray((parsed as { ids?: unknown }).ids)
    ) {
      return (parsed as { ids: string[] }).ids;
    }
  } catch {
    // Corrupt save: start fresh.
  }
  return [];
}

function writeClearedIds(ids: string[]): void {
  try {
    window.localStorage.setItem(CLEARED_KEY, JSON.stringify({ date: todayIst(), ids }));
  } catch {
    // Storage unavailable: progress just won't survive a reload.
  }
}

// Next occurrence of a recurring bill on or after the reference date.
function nextRecurringDate(dayOfMonth: number, referenceDate: string): string {
  const [y, m] = referenceDate.split('-').map(Number);
  const day = String(dayOfMonth).padStart(2, '0');
  const thisMonth = `${y}-${String(m).padStart(2, '0')}-${day}`;
  if (thisMonth >= referenceDate) {
    return thisMonth;
  }
  const next = m === 12 ? [y + 1, 1] : [y, m + 1];
  return `${next[0]}-${String(next[1]).padStart(2, '0')}-${day}`;
}

// The bill the header warns about: the nearest RECURRING bill due in the
// next 30 days (rent first — a one-time purchase can wait, rent cannot).
// Falls back to a one-time bill only when no recurring bill is due.
function nextBill(data: AppData): { name: string; amount: number; date: string } | null {
  const ref = data.referenceDate;
  const horizonEnd = addDays(ref, 30);
  let best: { name: string; amount: number; date: string } | null = null;
  let bestOneTime: { name: string; amount: number; date: string } | null = null;
  for (const bill of data.bills) {
    const due =
      bill.kind === 'one-time' && bill.oneTimeDate !== undefined
        ? bill.oneTimeDate
        : bill.kind === 'recurring' && bill.dayOfMonth !== undefined
          ? nextRecurringDate(bill.dayOfMonth, ref)
          : null;
    if (due === null || due < ref || due > horizonEnd) {
      continue;
    }
    const entry = { name: bill.name, amount: bill.amount, date: due };
    if (bill.kind === 'recurring') {
      if (best === null || due < best.date) {
        best = entry;
      }
    } else if (bestOneTime === null || due < bestOneTime.date) {
      bestOneTime = entry;
    }
  }
  return best ?? bestOneTime;
}

const CHIP_TONE: Record<ChaseRow['reliability'], 'success' | 'warning' | 'danger'> = {
  Reliable: 'success',
  'Sometimes late': 'warning',
  Chronic: 'danger',
};

export default function ChaseTab({ data, state, onStateChange, onChange }: Props) {
  const ref = data.referenceDate;
  const [loading, setLoading] = useState(true);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [receipt, setReceipt] = useState<ReceiptInfo | null>(null);
  const [remindedIds, setRemindedIds] = useState<string[]>(() => readClearedIds());
  const [promisedInputs, setPromisedInputs] = useState<Record<string, string>>({});

  // Brief loading skeleton on first mount (data is local, so this is short).
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(t);
  }, []);

  // The queue as it stood when the tab first opened today: the denominator
  // for "N of M cleared today". A ref, not state — payments shrink the live
  // queue, but the day's total must not shrink with it.
  const initialIdsRef = useRef<string[] | null>(null);
  if (initialIdsRef.current === null) {
    initialIdsRef.current = rankChase(data).map((r) => r.student.id);
  }

  const rows = useMemo(() => rankChase(data), [data]);
  const currentIds = useMemo(() => rows.map((r) => r.student.id), [rows]);

  function isSnoozed(studentId: string): boolean {
    const until = state.snoozedAlerts[`chase-${studentId}`];
    return until !== undefined && until > ref;
  }

  const snoozedIds = (initialIdsRef.current ?? []).filter((id) => isSnoozed(id));
  // Snoozed customers are deferred, not today's work: out of the denominator.
  const activeIds = (initialIdsRef.current ?? []).filter((id) => !snoozedIds.includes(id));
  const clearedIds = activeIds.filter(
    (id) => !currentIds.includes(id) || remindedIds.includes(id),
  );
  const queue = rows.filter((r) => !isSnoozed(r.student.id));
  const totalUnlock = rows.reduce((sum, r) => sum + r.amount, 0);
  const bill = nextBill(data);

  function markReminded(studentId: string): void {
    setRemindedIds((prev) => {
      if (prev.includes(studentId)) {
        return prev;
      }
      const next = [...prev, studentId];
      writeClearedIds(next);
      return next;
    });
  }

  function sendReminder(row: ChaseRow): void {
    const message = buildReminderMessage(data, row.invoice, row.student, state.tone, data.business);
    const href = waLink(row.student.parentPhone, message);
    window.open(href, '_blank', 'noopener');
    // Log the reminder (same record the Alerts tab reads).
    onStateChange({
      ...state,
      reminders: { ...state.reminders, [row.invoice.id]: new Date().toISOString() },
    });
    markReminded(row.student.id);
    // "… & Next": move to the next uncleared card.
    const nextRow = queue.find((r) => r.student.id !== row.student.id);
    if (nextRow !== undefined) {
      window.setTimeout(() => {
        document.getElementById(`chase-${nextRow.student.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }

  function markPromised(row: ChaseRow): void {
    const date = promisedInputs[row.student.id] ?? addDays(ref, 3);
    if (date < ref) {
      return;
    }
    // Snooze the chase alert to the promised date AND move the invoice's
    // forecast pay date to it (App passes promisedDates into the forecast).
    onStateChange({
      ...state,
      promisedDates: { ...state.promisedDates, [row.invoice.id]: date },
      snoozedAlerts: { ...state.snoozedAlerts, [`chase-${row.student.id}`]: date },
    });
    // The card leaves today's queue (it is deferred, not today's work), so
    // confirm the promise with a toast instead of leaving silence.
    toast(`${row.student.name} promised to pay by ${formatDate(date)} — forecast updated.`);
  }

  function undoSnooze(): void {
    const next = { ...state.snoozedAlerts };
    for (const id of snoozedIds) {
      delete next[`chase-${id}`];
    }
    onStateChange({ ...state, snoozedAlerts: next });
  }

  const pct = activeIds.length > 0 ? Math.round((clearedIds.length / activeIds.length) * 100) : 0;
  const allCleared = activeIds.length > 0 && clearedIds.length === activeIds.length;
  const allSnoozed = activeIds.length === 0 && snoozedIds.length > 0;

  return (
    <div className="chase-tab">
      <h2>Bad Day Mode</h2>
      {bill !== null && queue.length > 0 && (
        <p className="bad-day-head">
          You need <strong>{formatINR(bill.amount)}</strong> for {bill.name} in{' '}
          <strong>{diffDays(ref, bill.date)} days</strong>. Chasing these{' '}
          <strong>{queue.length} families</strong> unlocks{' '}
          <strong>{formatINR(totalUnlock)}</strong>.
        </p>
      )}
      {bill === null && queue.length > 0 && (
        <p className="muted">
          Chasing these {queue.length} families unlocks {formatINR(totalUnlock)}.
        </p>
      )}
      <p className="muted">
        The bad-day screen: every late payer, worst first. Clear them one by one.
      </p>

      {loading ? (
        <div aria-hidden="true">
          <Skeleton height={18} width="55%" />
          <Skeleton height={10} width="100%" />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : (
        <>
          <div className="card chase-progress">
            <div className="chase-progress-head">
              <strong>
                {clearedIds.length} of {activeIds.length} cleared today
              </strong>
              <span className="muted">{pct}%</span>
            </div>
            <ProgressBar value={pct} ariaLabel={`${clearedIds.length} of ${activeIds.length} cleared today`} />
          </div>

          {allCleared && (
            <div className="card chase-done">
              <PartyPopper size={40} aria-hidden="true" />
              <h3>All clear!</h3>
              <p>
                Every late fee is chased or paid. {formatINR(totalUnlock)} of overdue fees handled
                today — nice work.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => navigate('alerts')}>
                Back to Alerts
              </button>
            </div>
          )}

          {allSnoozed && (
            <EmptyState
              icon={<Check size={40} aria-hidden="true" />}
              title="Everything snoozed"
              body="Every late payer is snoozed until their promised date. Nothing left to chase today."
              action={
                <button type="button" className="btn btn-secondary" onClick={undoSnooze}>
                  Undo snooze
                </button>
              }
            />
          )}

          {queue.length === 0 && !allCleared && !allSnoozed && (
            <EmptyState
              icon={<Check size={40} aria-hidden="true" />}
              title="Nothing to chase"
              body="No one is late right now. Enjoy the quiet — it rarely lasts."
              action={
                <button type="button" className="btn btn-secondary" onClick={() => navigate('dashboard')}>
                  Back to Overview
                </button>
              }
            />
          )}

          <ul className="chase-list">
            {queue.map((row) => {
              const reminded = remindedIds.includes(row.student.id);
              const promised = state.promisedDates[row.invoice.id];
              return (
                <li key={row.student.id} id={`chase-${row.student.id}`} className="card chase-card">
                  <div className="chase-head">
                    <div>
                      <h3>{row.student.name}</h3>
                      <p className="muted">
                        {row.student.className} · {row.student.subject}
                      </p>
                    </div>
                    <Chip tone={CHIP_TONE[row.reliability]}>{row.reliability}</Chip>
                  </div>
                  <div className="chase-figures">
                    <div>
                      <span className="chase-label">Overdue</span>
                      <strong>{formatINR(row.amount)}</strong>
                    </div>
                    <div>
                      <span className="chase-label">Days late</span>
                      <strong>{row.daysOverdue}</strong>
                    </div>
                    <div>
                      <span className="chase-label">Avg days late</span>
                      <strong>{row.avgDaysLate === 0 ? '—' : row.avgDaysLate}</strong>
                    </div>
                    <div>
                      <span className="chase-label">Chase score</span>
                      <strong>{row.score}</strong>
                    </div>
                  </div>
                  <div className="chase-buttons">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => sendReminder(row)}
                      disabled={!row.student.parentPhone}
                    >
                      <Send size={16} aria-hidden="true" /> Send on WhatsApp &amp; Next
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPayInvoice(row.invoice)}
                    >
                      Mark paid
                    </button>
                  </div>
                  <div className="chase-promised">
                    <label>
                      Promised payment date
                      <input
                        type="date"
                        value={promisedInputs[row.student.id] ?? promised ?? addDays(ref, 3)}
                        min={ref}
                        onChange={(e) =>
                          setPromisedInputs((prev) => ({ ...prev, [row.student.id]: e.target.value }))
                        }
                      />
                    </label>
                    <button type="button" className="btn btn-sm" onClick={() => markPromised(row)}>
                      Mark Promised Date
                    </button>
                  </div>
                  {reminded && <p className="muted">Reminder sent today.</p>}
                  {promised !== undefined && (
                    <p className="muted">Promised to pay by {formatDate(promised)} — forecast updated.</p>
                  )}
                  {!row.student.parentPhone && (
                    <p className="muted">No parent phone on file — add one to send a reminder.</p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {payInvoice !== null && (
        <PaymentDrawer
          data={data}
          invoice={payInvoice}
          onChange={onChange}
          onClose={() => setPayInvoice(null)}
          onPaid={(invoice, payment) => {
            const student = data.students.find((s) => s.id === invoice.studentId);
            setReceipt({
              invoice,
              payment,
              studentName: student?.name ?? invoice.studentId,
              studentPhone: student?.parentPhone,
            });
          }}
        />
      )}

      <ReceiptModal receipt={receipt} profile={data.business} onClose={() => setReceipt(null)} />
    </div>
  );
}
