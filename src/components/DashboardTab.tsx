import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, MessageCircle, QrCode, UserPlus } from 'lucide-react';
import type { AppData, BusinessProfile, Invoice, Student, TemplateId } from '../types';
import { amountPaid, balance, buildForecast, cashOnHand, isOverdue, type Forecast } from '../forecast';
import { diffDays, formatDate, formatDateTime, formatINR } from '../format';
import { navigate } from '../router';
import { buildReminderMessage, waLink } from '../reminders';
import { buildUpiLink, monthLabel, qrSvgForUpi } from '../qr';
import CollectionChart, { type CollectionPoint } from './CollectionChart';
import NewInvoiceModal from './NewInvoiceModal';
import PaymentDrawer from './PaymentDrawer';
import QrModal from './QrModal';
import ReceiptModal, { type ReceiptInfo } from './ReceiptModal';
import StudentDrawer from './StudentDrawer';
import { Avatar, Money, ProgressBar, SegmentedControl, Skeleton, SkeletonRow, StatusPill } from './ui';
import { computeAlerts } from '../alerts';

type SortKey = 'name' | 'owed' | 'due' | 'status' | 'share';
type SortDir = 'asc' | 'desc';
type Horizon = 30 | 60 | 90;

type OwedRow = {
  student: Student;
  owed: number;
  dueDate: string; // earliest unpaid due date
  days: number; // days overdue (positive) or days until due (negative)
};

type ActivityItem = {
  key: string;
  student: Student;
  subline: string;
  kind: 'paid' | 'overdue';
  date: string;
  amount: number;
  days: number; // days overdue (overdue rows only)
};

type UpcomingRow = {
  key: string;
  student: Student;
  subline: string;
  dueDate: string;
  amount: number;
};

const AVATAR_CLASSES = ['av-mint', 'av-lav', 'av-peach', 'av-sky'];
const COUNT_MS = 600;

// Earliest due date first; on the same date, the larger balance first.
function byDueThenBalance(a: Invoice, b: Invoice): number {
  if (a.dueDate !== b.dueDate) {
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return balance(b) - balance(a);
}

function compareRows(a: OwedRow, b: OwedRow, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.student.name.localeCompare(b.student.name);
    case 'due':
      return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
    case 'status':
      return a.days - b.days;
    default:
      return a.owed - b.owed;
  }
}

function statusText(days: number): string {
  if (days > 0) {
    return `${days} days overdue`;
  }
  if (days === 0) {
    return 'Due today';
  }
  if (-days <= 30) {
    return `Due in ${-days} days`;
  }
  return 'Not yet due';
}

function sumBalance(list: Invoice[]): number {
  return list.reduce((sum, inv) => sum + balance(inv), 0);
}

// 'D Mon YYYY' from formatDate -> 'D Mon'.
function dayMonth(iso: string): string {
  return formatDate(iso).replace(/\s\d{4}$/, '');
}

function initialsOf(name: string): string {
  const [first = '', second = ''] = name.trim().split(/\s+/);
  if (second !== '') {
    return (first.charAt(0) + second.charAt(0)).toUpperCase();
  }
  return first.slice(0, 2).toUpperCase();
}

// Asia/Kolkata = UTC + 5h30m; read the hour from the shifted clock.
function greetingFor(now: Date): string {
  const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
  const hour = ist.getUTCHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

function parseHorizon(value: string): Horizon {
  if (value === '60') {
    return 60;
  }
  if (value === '90') {
    return 90;
  }
  return 30;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Animates from the previously shown value (0 on first mount) to value, ease-out cubic.
function useCountUp(value: number): number {
  const [shown, setShown] = useState<number>(0);
  const shownRef = useRef<number>(0);

  useEffect(() => {
    const from = shownRef.current;
    if (prefersReducedMotion()) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      if (t >= 1) {
        shownRef.current = value;
        setShown(value);
        return;
      }
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (value - from) * eased);
      shownRef.current = next;
      setShown(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return shown;
}

// Cumulative 'in' amounts by date, from the reference date to the horizon end.
function collectionPoints(forecast: Forecast): CollectionPoint[] {
  const points: CollectionPoint[] = [{ date: forecast.referenceDate, value: 0 }];
  let running = 0;
  for (const e of forecast.events) {
    if (e.kind !== 'in') {
      continue;
    }
    running += e.amount;
    const last = points[points.length - 1];
    if (last.date === e.date) {
      last.value = running;
    } else {
      points.push({ date: e.date, value: running });
    }
  }
  const tail = points[points.length - 1];
  if (tail.date === forecast.horizonEnd) {
    tail.value = forecast.totalIn;
  } else {
    points.push({ date: forecast.horizonEnd, value: forecast.totalIn });
  }
  return points;
}

function TemplateIcon({ templateId }: { templateId: TemplateId }) {
  switch (templateId) {
    case 'tutor':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 9l10-5 10 5-10 5-10-5z" />
          <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
          <path d="M22 9v6" />
        </svg>
      );
    case 'designer':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20L8 12L16 4L20 8L12 16Z" />
          <path d="M8 12L12 16" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l2-5h14l2 5" />
          <path d="M4 9v11h16V9" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
  }
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

export default function DashboardTab({
  data,
  profile,
  onStartTour,
  onChange,
  dueDays,
  templateId,
  templateLabel,
  promisedDates,
  paidBills,
  reminders,
}: {
  data: AppData;
  profile: BusinessProfile;
  onStartTour?: () => void;
  onChange: (next: AppData) => void;
  dueDays: number;
  templateId: TemplateId;
  templateLabel: string;
  promisedDates?: Record<string, string>;
  paidBills?: Record<string, string>;
  reminders?: Record<string, string>;
}) {
  const ref = data.referenceDate;
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [introVisible, setIntroVisible] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [bucket, setBucket] = useState<'all' | '1-7' | '8-15' | '15+' | 'due-soon'>('all');
  const [cashEditing, setCashEditing] = useState<boolean>(false);
  const [cashDraft, setCashDraft] = useState<string>('');

  // Brief loading skeleton on first mount (data is local, so this is short).
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(t);
  }, []);
  const [horizon, setHorizon] = useState<Horizon>(30);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [receipt, setReceipt] = useState<ReceiptInfo | null>(null);
  const [qr, setQr] = useState<{ link: string; svg: string; amount: number; studentName: string; month: string } | null>(null);
  const [qrError, setQrError] = useState<boolean>(false);

  const activeStudents = data.students.filter((s) => s.active);
  const activeIds = new Set(activeStudents.map((s) => s.id));
  const activeInvoices = data.invoices.filter((inv) => activeIds.has(inv.studentId));
  const unpaid = activeInvoices.filter((inv) => balance(inv) > 0);
  const overdue = unpaid.filter((inv) => isOverdue(inv, ref));

  const totalOutstanding = sumBalance(unpaid);

  const forecast = buildForecast(data, 30, { vikramLate: false, decLate: false, promisedDates, paidBills });

  const worst: Invoice | undefined = [...overdue].sort(byDueThenBalance)[0];
  const worstName = worst
    ? (data.students.find((s) => s.id === worst.studentId)?.name ?? worst.studentId)
    : '';

  const rows: OwedRow[] = [];
  for (const student of activeStudents) {
    const mine = unpaid.filter((inv) => inv.studentId === student.id);
    if (mine.length === 0) {
      continue;
    }
    const dueDate = mine.reduce((a, inv) => (inv.dueDate < a ? inv.dueDate : a), mine[0].dueDate);
    rows.push({ student, owed: sumBalance(mine), dueDate, days: diffDays(dueDate, ref) });
  }
  const sortedRows = [...rows].sort((a, b) => {
    const c = compareRows(a, b, sortKey);
    return (sortDir === 'asc' ? c : -c) || b.owed - a.owed;
  });

  function onSort(key: SortKey): void {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortHeader = (key: SortKey, label: string) => (
    <th aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="btn btn-ghost" onClick={() => onSort(key)}>
        {label}
        {sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  const selected = data.students.find((s) => s.id === selectedId);

  // ---- Mobile section: all figures computed live from data ----
  const subline = (inv: Invoice): string =>
    templateId === 'tutor' ? 'Monthly tuition fee' : inv.subject;

  const cashShown = useCountUp(cashOnHand(data, paidBills));
  const outShown = useCountUp(totalOutstanding);

  const monthPrefix = ref.slice(0, 7);
  let collectedThisMonth = 0;
  for (const inv of data.invoices) {
    for (const p of inv.payments) {
      if (p.date.startsWith(monthPrefix)) {
        collectedThisMonth += p.amount;
      }
    }
  }

  const mobileForecast = buildForecast(data, horizon, { vikramLate: false, decLate: false, promisedDates, paidBills });
  const chartPoints = collectionPoints(mobileForecast);

  const activity: ActivityItem[] = [];
  for (const inv of activeInvoices) {
    const student = activeStudents.find((s) => s.id === inv.studentId);
    if (!student) {
      continue;
    }
    if (inv.payments.length > 0) {
      const latest = inv.payments.reduce((a, p) => (p.date > a.date ? p : a));
      activity.push({
        key: `${inv.id}-paid`,
        student,
        subline: subline(inv),
        kind: 'paid',
        date: latest.date,
        amount: latest.amount,
        days: 0,
      });
    } else if (isOverdue(inv, ref)) {
      activity.push({
        key: `${inv.id}-overdue`,
        student,
        subline: subline(inv),
        kind: 'overdue',
        date: inv.dueDate,
        amount: balance(inv),
        days: diffDays(inv.dueDate, ref),
      });
    }
  }
  activity.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const recentActivity = activity.slice(0, 3);

  const upcomingInvoices = unpaid
    .filter((inv) => !isOverdue(inv, ref))
    .sort(byDueThenBalance)
    .slice(0, 2);
  const upcomingRows: UpcomingRow[] = [];
  for (const inv of upcomingInvoices) {
    const student = activeStudents.find((s) => s.id === inv.studentId);
    if (!student) {
      continue;
    }
    upcomingRows.push({
      key: inv.id,
      student,
      subline: subline(inv),
      dueDate: inv.dueDate,
      amount: balance(inv),
    });
  }

  const ownerFirst = data.business.ownerName.trim().split(/\s+/)[0] ?? '';

  // Earliest unpaid invoice per student, for the inline actions.
  function invoiceFor(studentId: string): Invoice | undefined {
    return unpaid.filter((inv) => inv.studentId === studentId).sort(byDueThenBalance)[0];
  }

  async function openQrFor(inv: Invoice, student: Student): Promise<void> {
    setQrError(false);
    try {
      const link = buildUpiLink(profile, student.name, inv);
      const svg = await qrSvgForUpi(link);
      setQr({ link, svg, amount: balance(inv), studentName: student.name, month: monthLabel(inv.month) });
    } catch {
      setQrError(true);
    }
  }

  function remindHref(inv: Invoice, student: Student): string | null {
    if (!student.parentPhone) {
      return null;
    }
    const message = buildReminderMessage(data, inv, student, 'Polite', profile);
    return waLink(student.parentPhone, message);
  }

  // Needs attention: most overdue first, then the largest balance.
  const needsAttention = [...rows].sort((a, b) => b.days - a.days || b.owed - a.owed).slice(0, 5);

  // Financial Pulse Strip figures (live from data, nothing hard-coded).
  const paidBillsTotal = (paidBills === undefined ? 0 : data.bills.reduce(
    (sum, b) => sum + (paidBills[b.id] !== undefined ? b.amount : 0), 0));
  const billedThisMonth = data.invoices
    .filter((inv) => inv.month === monthPrefix)
    .reduce((sum, inv) => sum + inv.amount, 0);
  const collectedVsBilledPct =
    billedThisMonth > 0 ? Math.round((collectedThisMonth / billedThisMonth) * 100) : 0;
  const oldestOverdue = rows.reduce((m, r) => Math.max(m, r.days), 0);
  const lowBelowBuffer = forecast.minBalance < data.safetyBuffer;
  const pulseAlerts = computeAlerts(data, { promisedDates, paidBills }).slice(0, 4);

  const ledgerRows = sortedRows.filter((r) => {
    if (bucket === 'all') return true;
    if (bucket === 'due-soon') return r.days <= 0;
    if (bucket === '1-7') return r.days >= 1 && r.days <= 7;
    if (bucket === '8-15') return r.days >= 8 && r.days <= 15;
    return r.days >= 16;
  });

  function saveCash(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const value = Number(cashDraft);
    if (!Number.isFinite(value) || value < 0) {
      return;
    }
    onChange({ ...data, openingCash: value });
    setCashEditing(false);
  }

  if (loading) {
    return (
      <section className="tab-content" aria-label="Loading overview">
        <div className="pulse-strip">
          <Skeleton height={110} width="100%" />
          <Skeleton height={110} width="100%" />
        </div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </section>
    );
  }

  return (
    <section className="tab-content">
      <div className="pulse-strip">
        <div className="card pulse-card">
          <div className="stat-label">Cash on hand</div>
          <div className="stat-value"><Money value={cashShown} /></div>
          <div className="muted">
            Starting balance {formatINR(data.openingCash)}
            {paidBillsTotal > 0 ? ` − ${formatINR(paidBillsTotal)} bills paid` : ''}
          </div>
          {cashEditing ? (
            <form className="inline-form" onSubmit={saveCash} noValidate>
              <input
                type="number"
                min={0}
                step={100}
                value={cashDraft}
                onChange={(e) => setCashDraft(e.target.value)}
                aria-label="Starting balance"
              />
              <button type="submit" className="btn btn-sm btn-primary">Save</button>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setCashDraft(String(data.openingCash)); setCashEditing(true); }}
            >
              Edit starting balance
            </button>
          )}
        </div>
        <div className="card pulse-card">
          <div className="stat-label">Total owed to you</div>
          <div className="stat-value"><Money value={outShown} /></div>
          <div className="muted">
            {rows.length} {rows.length === 1 ? 'family' : 'families'} unpaid
            {oldestOverdue > 0 ? ` · oldest ${oldestOverdue} days overdue` : ' · nothing overdue'}
          </div>
        </div>
        <div className={`card pulse-card${lowBelowBuffer ? ' pulse-danger' : ''}`}>
          <div className="stat-label">30-day projected low point</div>
          <div className="stat-value"><Money value={forecast.minBalance} /></div>
          <div className="muted">
            on {formatDate(forecast.minBalanceDate)}
            {lowBelowBuffer ? ` — below the ${formatINR(data.safetyBuffer)} buffer` : ''}
          </div>
        </div>
        <div className="card pulse-card">
          <div className="stat-label">Collected this month</div>
          <div className="stat-value"><Money value={collectedThisMonth} /></div>
          <div className="muted">of {formatINR(billedThisMonth)} billed</div>
          <ProgressBar value={collectedVsBilledPct} ariaLabel={`Collected ${collectedVsBilledPct} percent of this month's billed fees`} />
        </div>
      </div>

      {pulseAlerts.length > 0 && (
        <div className="card alerts-stack">
          <div className="m-card-head">
            <h2>Next Best Actions</h2>
            <a className="m-link" href="#/alerts">View all</a>
          </div>
          <ul className="alerts-stack-list">
            {pulseAlerts.map((a) => (
              <li key={a.key} className={`alert-stack-item alert-${a.severity}`}>
                <div>
                  <strong>{a.title}</strong>
                  <p className="muted">{a.body}</p>
                </div>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate(a.actionHref)}>
                  {a.actionLabel}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="dash-desktop">
        {introVisible && (
          <div className="card intro-card">
            <p>
              Welcome to FeeFlow. See who owes you, what is overdue, and what your cash looks like
              over the next 30 days.
            </p>
            {onStartTour && (
              <button type="button" className="btn btn-primary" onClick={() => onStartTour()}>
                Start the 60-second tour
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setIntroVisible(false)}>
              Dismiss
            </button>
          </div>
        )}


        <div className="card">
          <p>
            <strong>
              {worst
                ? `Chase ${worstName} today: ${formatINR(balance(worst))} is ${diffDays(worst.dueDate, ref)} days overdue`
                : 'No overdue fees right now.'}
            </strong>
          </p>
        </div>

        <div className="card">
          <div className="m-card-head">
            <h2>Who Owes Me</h2>
            <span className="muted">{ledgerRows.length} {ledgerRows.length === 1 ? 'family' : 'families'}</span>
          </div>
          <SegmentedControl
            options={[
              { value: 'all', label: 'All Unpaid' },
              { value: '1-7', label: '1–7 Days Late' },
              { value: '8-15', label: '8–15 Days Late' },
              { value: '15+', label: '15+ Days Late' },
              { value: 'due-soon', label: 'Due Soon' },
            ]}
            value={bucket}
            onChange={(v) => setBucket(v as 'all' | '1-7' | '8-15' | '15+' | 'due-soon')}
            label="Aging bucket"
          />
          {ledgerRows.length === 0 ? (
            <p className="muted">Nobody in this bucket — try another filter, or enjoy the quiet.</p>
          ) : (
            <div className="table-wrap">
              <table className="owes-table table ledger-table">
                <thead>
                  <tr>
                    {sortHeader('name', 'Student & Parent')}
                    <th>Batch / Subject</th>
                    {sortHeader('owed', 'Amount owed')}
                    <th>Overdue since</th>
                    <th>Last chased</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((r, i) => {
                    const inv = invoiceFor(r.student.id);
                    const href = inv ? remindHref(inv, r.student) : null;
                    const mine = unpaid.filter((x) => x.studentId === r.student.id);
                    const paidSoFar = mine.reduce((sum, x) => sum + amountPaid(x), 0);
                    const total = mine.reduce((sum, x) => sum + x.amount, 0);
                    const lastChased =
                      inv !== undefined && reminders !== undefined ? reminders[inv.id] : undefined;
                    return (
                      <tr key={r.student.id} className={i % 2 === 1 ? 'zebra' : undefined}>
                        <td>
                          {r.student.name}
                          <div className="muted">{r.student.parentName}</div>
                        </td>
                        <td>
                          {r.student.className}
                          <div className="muted">{r.student.subject}</div>
                        </td>
                        <td className="num">
                          <Money value={r.owed} />
                          {total > 0 && paidSoFar > 0 && (
                            <div className="ledger-progress">
                              <ProgressBar
                                value={Math.round((paidSoFar / total) * 100)}
                                ariaLabel={`${formatINR(paidSoFar)} of ${formatINR(total)} paid`}
                              />
                              <span className="muted">{formatINR(paidSoFar)} paid</span>
                            </div>
                          )}
                        </td>
                        <td>
                          {formatDate(r.dueDate)}
                          <div className="muted">
                            {r.days > 0 ? `${r.days} days ago` : r.days === 0 ? 'Due today' : `Due in ${-r.days} days`}
                          </div>
                        </td>
                        <td>{lastChased !== undefined ? formatDateTime(lastChased) : '—'}</td>
                        <td>
                          <div className="need-actions">
                            {href !== null ? (
                              <a className="btn btn-sm" href={href} target="_blank" rel="noopener noreferrer">
                                <MessageCircle aria-hidden="true" /> Chase
                              </a>
                            ) : (
                              <span className="btn btn-sm" aria-disabled="true" style={{ opacity: 0.5 }}>
                                No phone
                              </span>
                            )}
                            {inv && (
                              <button type="button" className="btn btn-sm btn-primary" onClick={() => setPaying(inv)}>
                                Mark paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="m-card-head">
            <h2>Needs attention</h2>
            <span>
              <a className="m-link" href="#/chase">
                Open chase queue
              </a>{' '}
              <a className="m-link" href="#/invoices">
                View all
              </a>
            </span>
          </div>
          {needsAttention.length === 0 ? (
            <div className="empty-state">
              <Check size={40} aria-hidden="true" />
              <h3>All caught up</h3>
              <p>Every invoice is paid. Add your first student to start tracking fees.</p>
              <button type="button" className="btn btn-primary" onClick={() => navigate('students')}>
                <UserPlus size={18} aria-hidden="true" /> Add your first student
              </button>
            </div>
          ) : (
            <ul className="needs-list stagger">
              {needsAttention.map((r, i) => {
                const inv = invoiceFor(r.student.id);
                const href = inv ? remindHref(inv, r.student) : null;
                const ring = r.days > 0 ? 'overdue' : 'due';
                return (
                  <li key={r.student.id}>
                    <div className="need-row">
                      <Avatar name={r.student.name} index={i} ring={ring} />
                      <div className="need-main">
                        <div className="need-name">{r.student.name}</div>
                        <div className="need-sub">
                          {r.student.className} · {statusText(r.days)}
                        </div>
                        <div className="need-actions">
                          {href !== null ? (
                            <a className="btn btn-sm" href={href} target="_blank" rel="noopener noreferrer">
                              <MessageCircle aria-hidden="true" /> WhatsApp
                            </a>
                          ) : (
                            <span className="btn btn-sm" aria-disabled="true" style={{ opacity: 0.5 }}>
                              No phone
                            </span>
                          )}
                          {inv && (
                            <>
                              <button type="button" className="btn btn-sm btn-primary" onClick={() => setPaying(inv)}>
                                Mark paid
                              </button>
                              <button type="button" className="btn btn-sm" onClick={() => void openQrFor(inv, r.student)}>
                                <QrCode aria-hidden="true" /> Show QR
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="need-col">
                        <span className="need-amount">{formatINR(r.owed)}</span>
                        <StatusPill status={r.days > 0 ? 'overdue' : 'due'} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {qrError && <p className="muted">Could not generate the QR code. Try again.</p>}
        </div>

        <div className="card pricing-card">
          <h2>FeeFlow Pro</h2>
          <p>
            <strong>Rs 199 per month</strong>
          </p>
          <ul>
            <li>Unlimited students, customers and invoices</li>
            <li>Unlimited cash forecasts and what-if scenarios</li>
            <li>Unlimited WhatsApp-style reminders and UPI QR codes</li>
            <li>Local-first: your data stays in your browser</li>
          </ul>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.dispatchEvent(new Event('feeflow-open-pricing'))}
          >
            Why switch from a notebook?
          </button>
        </div>
      </div>

      <div className="dash-mobile">
        <div className="m-biz">
          <div className="m-biz-left">
            <span className="m-biz-icon">
              <TemplateIcon templateId={templateId} />
            </span>
            <div>
              <div className="m-biz-name">{data.business.businessName}</div>
              <div className="muted">Owner: {data.business.ownerName}</div>
              <div className="m-pills">
                <span className="m-pill m-pill-demo">Demo data</span>
                <span className="m-pill m-pill-template">{templateLabel}</span>
              </div>
            </div>
          </div>
          <div className="m-date">
            <CalendarIcon /> {formatDate(ref)}
          </div>
        </div>

        <div className="m-greet">
          <div className="m-greet-title">
            {greetingFor(new Date())}, {ownerFirst}
          </div>
          <div className="muted">{"Here's your fee overview."}</div>
        </div>


        <div className="card m-collect">
          <div className="m-card-head">
            <h2>Collection overview</h2>
            <select
              className="m-select"
              aria-label="Forecast period"
              value={horizon}
              onChange={(e) => setHorizon(parseHorizon(e.target.value))}
            >
              <option value={30}>Next 30 days</option>
              <option value={60}>Next 60 days</option>
              <option value={90}>Next 90 days</option>
            </select>
          </div>
          <div className="m-figures">
            <div>
              <div className="muted">Collected this month</div>
              <div className="m-fig-value">{formatINR(collectedThisMonth)}</div>
            </div>
            <div>
              <div className="muted">{`Expected next ${horizon} days`}</div>
              <div className="m-fig-value">{formatINR(mobileForecast.totalIn)}</div>
            </div>
          </div>
          <CollectionChart points={chartPoints} label="Expected collections" />
        </div>

        <div className="card m-activity">
          <div className="m-card-head">
            <h2>Recent activity</h2>
            <a className="m-link" href="#/invoices">
              View all
            </a>
          </div>
          {recentActivity.length === 0 ? (
            <p className="muted">No recent activity.</p>
          ) : (
            <ul className="m-list">
              {recentActivity.map((a, i) => (
                <li key={a.key}>
                  <button
                    type="button"
                    className="m-row"
                    onClick={() => setSelectedId(a.student.id)}
                  >
                    <span className={`m-avatar ${AVATAR_CLASSES[i % AVATAR_CLASSES.length]}`}>
                      {initialsOf(a.student.name)}
                    </span>
                    <span className="m-row-main">
                      <span className="m-row-name">{a.student.name}</span>
                      <span className="muted">{a.subline}</span>
                    </span>
                    <span className="m-row-amount num">{formatINR(a.amount)}</span>
                    {a.kind === 'paid' ? (
                      <span className="badge badge-paid">Paid {dayMonth(a.date)}</span>
                    ) : (
                      <span className="badge badge-overdue">Overdue {a.days} days</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card m-upcoming">
          <div className="m-card-head">
            <h2>Upcoming payments</h2>
            <a className="m-link" href="#/invoices">
              View all
            </a>
          </div>
          {upcomingRows.length === 0 ? (
            <p className="muted">No upcoming payments.</p>
          ) : (
            <ul className="m-list">
              {upcomingRows.map((u, i) => (
                <li key={u.key} className="m-row">
                  <span className={`m-avatar ${AVATAR_CLASSES[i % AVATAR_CLASSES.length]}`}>
                    {initialsOf(u.student.name)}
                  </span>
                  <span className="m-row-main">
                    <span className="m-row-name">{u.student.name}</span>
                    <span className="muted">{u.subline}</span>
                  </span>
                  <span className="m-row-amount num">{formatINR(u.amount)}</span>
                  <span className="badge badge-warn">
                    <CalendarIcon /> Due {dayMonth(u.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="m-card-head">
            <h2>Needs attention</h2>
            <span>
              <a className="m-link" href="#/chase">
                Open chase queue
              </a>{' '}
              <a className="m-link" href="#/invoices">
                View all
              </a>
            </span>
          </div>
          {needsAttention.length === 0 ? (
            <div className="empty-state">
              <Check size={40} aria-hidden="true" />
              <h3>All caught up</h3>
              <p>Every invoice is paid. Add your first student to start tracking fees.</p>
              <button type="button" className="btn btn-primary" onClick={() => navigate('students')}>
                <UserPlus size={18} aria-hidden="true" /> Add your first student
              </button>
            </div>
          ) : (
            <ul className="needs-list stagger">
              {needsAttention.map((r, i) => {
                const inv = invoiceFor(r.student.id);
                const href = inv ? remindHref(inv, r.student) : null;
                const ring = r.days > 0 ? 'overdue' : 'due';
                return (
                  <li key={r.student.id}>
                    <div className="need-row">
                      <Avatar name={r.student.name} index={i} ring={ring} />
                      <div className="need-main">
                        <div className="need-name">{r.student.name}</div>
                        <div className="need-sub">
                          {r.student.className} · {statusText(r.days)}
                        </div>
                        <div className="need-actions">
                          {href !== null ? (
                            <a className="btn btn-sm" href={href} target="_blank" rel="noopener noreferrer">
                              <MessageCircle aria-hidden="true" /> WhatsApp
                            </a>
                          ) : (
                            <span className="btn btn-sm" aria-disabled="true" style={{ opacity: 0.5 }}>
                              No phone
                            </span>
                          )}
                          {inv && (
                            <>
                              <button type="button" className="btn btn-sm btn-primary" onClick={() => setPaying(inv)}>
                                Mark paid
                              </button>
                              <button type="button" className="btn btn-sm" onClick={() => void openQrFor(inv, r.student)}>
                                <QrCode aria-hidden="true" /> Show QR
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="need-col">
                        <span className="need-amount">{formatINR(r.owed)}</span>
                        <StatusPill status={r.days > 0 ? 'overdue' : 'due'} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {qrError && <p className="muted">Could not generate the QR code. Try again.</p>}
        </div>

        <button type="button" className="m-create-btn" onClick={() => setModalOpen(true)}>
          + Create invoice
        </button>
      </div>

      {selected && (
        <StudentDrawer
          student={selected}
          invoices={data.invoices.filter((inv) => inv.studentId === selected.id)}
          profile={profile}
          referenceDate={ref}
          onClose={() => setSelectedId(null)}
        />
      )}

      {modalOpen && (
        <NewInvoiceModal
          data={data}
          onChange={onChange}
          onClose={() => setModalOpen(false)}
          onAddStudent={() => navigate('students')}
          dueDays={dueDays}
        />
      )}

      {paying !== null && (
        <PaymentDrawer
          data={data}
          invoice={paying}
          onChange={onChange}
          onClose={() => setPaying(null)}
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

      <ReceiptModal receipt={receipt} profile={profile} onClose={() => setReceipt(null)} />

      <QrModal
        open={qr !== null}
        onClose={() => setQr(null)}
        upiLink={qr?.link ?? ''}
        qrSvg={qr?.svg ?? ''}
        amount={qr?.amount ?? 0}
        studentName={qr?.studentName ?? ''}
        monthLabel={qr?.month ?? ''}
      />
    </section>
  );
}
