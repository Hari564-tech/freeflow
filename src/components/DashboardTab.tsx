import { useState } from 'react';
import type { AppData, BusinessProfile, Invoice, Student } from '../types';
import { balance, buildForecast, isOverdue } from '../forecast';
import { addDays, diffDays, formatDate, formatINR } from '../format';
import StudentDrawer from './StudentDrawer';

type SortKey = 'name' | 'owed' | 'due' | 'status' | 'share';
type SortDir = 'asc' | 'desc';

type OwedRow = {
  student: Student;
  owed: number;
  dueDate: string; // earliest unpaid due date
  days: number; // days overdue (positive) or days until due (negative)
};

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

export default function DashboardTab({
  data,
  profile,
  onStartTour,
}: {
  data: AppData;
  profile: BusinessProfile;
  onStartTour?: () => void;
}) {
  const ref = data.referenceDate;
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [introVisible, setIntroVisible] = useState<boolean>(true);

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
    <th>
      <button type="button" className="btn btn-ghost" onClick={() => onSort(key)}>
        {label}
        {sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  const selected = data.students.find((s) => s.id === selectedId);

  return (
    <section className="tab-content">
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
                    onClick={() => setSelectedId(r.student.id)}
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

      {selected && (
        <StudentDrawer
          student={selected}
          invoices={data.invoices.filter((inv) => inv.studentId === selected.id)}
          profile={profile}
          referenceDate={ref}
          onClose={() => setSelectedId(null)}
        />
      )}

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
    </section>
  );
}
