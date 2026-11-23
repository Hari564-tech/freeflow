import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Clock, MessageCircle, QrCode, TrendingUp, UserPlus } from 'lucide-react';
import type { AppData, BusinessProfile, Invoice, Student, TemplateId } from '../types';
import { balance, buildForecast, isOverdue, type Forecast } from '../forecast';
import { addDays, diffDays, formatDate, formatINR } from '../format';
import { navigate } from '../router';
import { buildReminderMessage, waLink } from '../reminders';
import { buildUpiLink, monthLabel, qrSvgForUpi } from '../qr';
import CollectionChart, { type CollectionPoint } from './CollectionChart';
import NewInvoiceModal from './NewInvoiceModal';
import PaymentDrawer from './PaymentDrawer';
import QrModal from './QrModal';
import ReceiptModal, { type ReceiptInfo } from './ReceiptModal';
import StudentDrawer from './StudentDrawer';
import { Avatar, ProgressBar, StatusPill } from './ui';

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
}: {
  data: AppData;
  profile: BusinessProfile;
  onStartTour?: () => void;
  onChange: (next: AppData) => void;
  dueDays: number;
  templateId: TemplateId;
  templateLabel: string;
}) {
  const ref = data.referenceDate;
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [introVisible, setIntroVisible] = useState<boolean>(true);
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

  const day7 = addDays(ref, 7);
  const day30 = addDays(ref, 30);
  const dueWithin = (end: string): Invoice[] =>
    unpaid.filter((inv) => !isOverdue(inv, ref) && inv.dueDate >= ref && inv.dueDate <= end);
  const due7 = dueWithin(day7);
  const due30 = dueWithin(day30);

  const totalOutstanding = sumBalance(unpaid);
  const totalOverdue = sumBalance(overdue);
  const totalDue30 = sumBalance(due30);

  const forecast = buildForecast(data, 30, { vikramLate: false, decLate: false });

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

  const outShown = useCountUp(totalOutstanding);
  const overShown = useCountUp(totalOverdue);

  const monthPrefix = ref.slice(0, 7);
  let collectedThisMonth = 0;
  for (const inv of data.invoices) {
    for (const p of inv.payments) {
      if (p.date.startsWith(monthPrefix)) {
        collectedThisMonth += p.amount;
      }
    }
  }

  const mobileForecast = buildForecast(data, horizon, { vikramLate: false, decLate: false });
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
  const collectedPct =
    collectedThisMonth + totalOutstanding > 0
      ? Math.round((collectedThisMonth / (collectedThisMonth + totalOutstanding)) * 100)
      : 0;

  return (
    <section className="tab-content">
      <div className="hero-card">
        <div className="hero-label">Total pending this month</div>
        <div className="hero-value">{formatINR(totalOutstanding)}</div>
        <p className="hero-sub">
          Collected {formatINR(collectedThisMonth)} so far · {formatINR(totalOverdue)} overdue
        </p>
        <ProgressBar value={collectedPct} ariaLabel={`Collected ${collectedPct} percent of this month's fees`} />
        <div className="hero-actions">
          {overdue.length > 0 ? (
            <a className="hero-btn" href="#/alerts">
              <MessageCircle size={18} aria-hidden="true" /> Send reminders to all overdue
            </a>
          ) : (
            <span className="hero-btn">
              <Check size={18} aria-hidden="true" /> Nothing overdue — nice work
            </span>
          )}
          <a className="hero-btn hero-btn-ghost" href="#/forecast">
            <TrendingUp size={18} aria-hidden="true" /> View 30-day forecast
          </a>
        </div>
      </div>

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

        <div className="kpi-grid">
          <div className="card kpi-card">
            <div className="stat-label">Total outstanding</div>
            <div className="stat-value">{formatINR(totalOutstanding)}</div>
          </div>
          <div className="card kpi-card stat-danger">
            <div className="stat-label">Total overdue</div>
            <div className="stat-value">{formatINR(totalOverdue)}</div>
          </div>
          <div className="card kpi-card stat-info">
            <div className="stat-label">Due in next 30 days</div>
            <div className="stat-value">{formatINR(totalDue30)}</div>
          </div>
          <div className="card kpi-card stat-info">
            <div className="stat-label">Expected in next 30 days</div>
            <div className="stat-value">{formatINR(forecast.totalIn)}</div>
            <div className="muted">
              <a href="#/forecast">View 30-day forecast</a>
            </div>
          </div>
          <div className="card kpi-card">
            <div className="stat-label">Cash position</div>
            <div className="stat-value">{formatINR(data.openingCash)}</div>
            <div className="muted">Safety buffer {formatINR(data.safetyBuffer)}</div>
            <div className="muted">
              Lowest forecast balance {formatINR(forecast.minBalance)} on{' '}
              {formatDate(forecast.minBalanceDate)}
            </div>
          </div>
        </div>

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
          <h2>Ageing</h2>
          <table className="table">
            <tbody>
              <tr>
                <td>Overdue</td>
                <td className="num">{formatINR(totalOverdue)}</td>
              </tr>
              <tr>
                <td>Due in 7 days</td>
                <td className="num">{formatINR(sumBalance(due7))}</td>
              </tr>
              <tr>
                <td>Due in 30 days</td>
                <td className="num">{formatINR(totalDue30)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Who owes me</h2>
          {rows.length === 0 ? (
            <p className="muted">Nothing outstanding. All invoices are paid.</p>
          ) : (
            <div className="table-wrap">
              <table className="owes-table table">
                <thead>
                  <tr>
                    {sortHeader('name', 'Student and Class')}
                    {sortHeader('owed', 'Amount owed')}
                    {sortHeader('due', 'Due date')}
                    {sortHeader('status', 'Status and aging')}
                    {sortHeader('share', 'Share of receivables')}
                    <th>Quick actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((r, i) => (
                    <tr
                      key={r.student.id}
                      className={i % 2 === 1 ? 'zebra' : undefined}
                    >
                      <td>
                        {r.student.name}
                        <div className="muted">{r.student.className}</div>
                      </td>
                      <td className="num">{formatINR(r.owed)}</td>
                      <td>{formatDate(r.dueDate)}</td>
                      <td>
                        <span className={r.days > 0 ? 'badge badge-overdue' : 'badge badge-draft'}>
                          {statusText(r.days)}
                        </span>
                      </td>
                      <td className="num">
                        {totalOutstanding > 0 ? Math.round((r.owed / totalOutstanding) * 100) : 0}%
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setSelectedId(r.student.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="m-card-head">
            <h2>Needs attention</h2>
            <a className="m-link" href="#/invoices">
              View all
            </a>
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

        <div className="kpi-chips">
          <div className="kpi-chip kpi-chip-success">
            <div className="kpi-chip-label">
              <Check aria-hidden="true" /> Collected
            </div>
            <div className="kpi-chip-value">{formatINR(collectedThisMonth)}</div>
            <div className="kpi-chip-sub">this month</div>
          </div>
          <div className="kpi-chip">
            <div className="kpi-chip-label">
              <Clock aria-hidden="true" /> Pending
            </div>
            <div className="kpi-chip-value">{formatINR(outShown)}</div>
            <div className="kpi-chip-sub">{unpaid.length} unpaid {unpaid.length === 1 ? 'invoice' : 'invoices'}</div>
          </div>
          <div className="kpi-chip kpi-chip-danger">
            <div className="kpi-chip-label">
              <AlertTriangle aria-hidden="true" /> Overdue
            </div>
            <div className="kpi-chip-value">{formatINR(overShown)}</div>
            <div className="kpi-chip-sub">{overdue.length} overdue</div>
          </div>
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
            <a className="m-link" href="#/invoices">
              View all
            </a>
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
