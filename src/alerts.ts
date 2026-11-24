// FeeFlow M6 — alert engine (pure: Alert[] from AppData, no I/O, no dates
// hard-coded). Every figure is computed from the live data; the numbers in
// the brief (Rent 18,000, "5 parents, 23,000") were examples, never inputs.
import type { AppData, Invoice, Student } from './types';
import { balance, buildForecast, isOverdue, type Scenario } from './forecast';
import { addDays, diffDays, formatDate, formatINR } from './format';
import { reliabilityOf } from './reliability';
import { monthLabel } from './qr';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertRule = 'overdue-30' | 'negative-forecast' | 'bill-shortfall' | 'many-overdue';

export type Alert = {
  key: string;
  rule: AlertRule;
  severity: AlertSeverity;
  title: string;
  body: string;
  actionLabel: string;
  // Route path for navigate(), e.g. 'chase', 'whatif/overdue', 'alerts/<invoiceId>'.
  actionHref: string;
  invoiceId?: string;
  studentId?: string;
};

const BASE: Scenario = {
  vikramLate: false,
  decLate: false,
  delayDays: 0,
  loseTopStudent: false,
  unexpectedExpense: 0,
  overdueUnpaid: false,
};

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

function studentName(data: AppData, studentId: string): string {
  return data.students.find((s) => s.id === studentId)?.name ?? studentId;
}

export function computeAlerts(
  data: AppData,
  opts?: { promisedDates?: Record<string, string>; paidBills?: Record<string, string> },
): Alert[] {
  const ref = data.referenceDate;
  const alerts: Alert[] = [];
  const unpaid = data.invoices.filter((inv) => balance(inv) > 0);
  const overdue = unpaid.filter((inv) => isOverdue(inv, ref));

  // Rule (a): any invoice more than 30 days overdue.
  for (const inv of overdue) {
    const days = diffDays(inv.dueDate, ref);
    if (days <= 30) {
      continue;
    }
    alerts.push({
      key: `overdue30-${inv.id}`,
      rule: 'overdue-30',
      severity: 'critical',
      title: `Chase ${studentName(data, inv.studentId)} today — ${formatINR(balance(inv))}, ${days} days late`,
      body: `Invoice for ${monthLabel(inv.month)} was due on ${formatDate(inv.dueDate)}. Open the reminder sheet to send the WhatsApp reminder.`,
      actionLabel: 'Open reminder',
      actionHref: `alerts/${inv.id}`,
      invoiceId: inv.id,
      studentId: inv.studentId,
    });
  }

  // Rule (b): forecast goes negative within 30 days.
  const base30 = buildForecast(data, 30, { ...BASE, ...opts });
  const firstNegative = base30.runningPoints.find((p) => p.balance < 0);
  if (firstNegative !== undefined) {
    const needed = -base30.minBalance;
    alerts.push({
      key: 'negative-forecast',
      rule: 'negative-forecast',
      severity: 'critical',
      title: `You'll go negative on ${formatDate(firstNegative.date)}. You need ${formatINR(needed)} by then.`,
      body: `Lowest projected balance is ${formatINR(base30.minBalance)} on ${formatDate(base30.minBalanceDate)} (next 30 days). Run the what-if simulator to see which late payment causes it.`,
      actionLabel: 'Open the what-if simulator',
      actionHref: 'whatif/overdue',
    });
  }

  // Rule (c): a bill due within 5 days that the balance won't cover.
  const horizon5 = addDays(ref, 5);
  for (const bill of data.bills) {
    const due =
      bill.kind === 'one-time' && bill.oneTimeDate !== undefined
        ? bill.oneTimeDate
        : bill.kind === 'recurring' && bill.dayOfMonth !== undefined
          ? nextRecurringDate(bill.dayOfMonth, ref)
          : null;
    if (due === null || due < ref || due > horizon5) {
      continue;
    }
    // Balance just before the bill date (last running point dated before it).
    let balanceBefore = data.openingCash;
    for (const p of base30.runningPoints) {
      if (p.date < due) {
        balanceBefore = p.balance;
      }
    }
    if (balanceBefore >= bill.amount) {
      continue;
    }
    const days = diffDays(ref, due);
    alerts.push({
      key: `bill-shortfall-${bill.id}`,
      rule: 'bill-shortfall',
      severity: 'warning',
      title: `${bill.name} ${formatINR(bill.amount)} due in ${days} ${days === 1 ? 'day' : 'days'}. Current balance won't cover it.`,
      body: `Balance before the bill is ${formatINR(balanceBefore)} — short by ${formatINR(bill.amount - balanceBefore)}. Collect an overdue fee or move the bill.`,
      actionLabel: 'See invoices',
      actionHref: 'invoices',
    });
  }

  // Rule (d): five or more invoices overdue at once.
  if (overdue.length >= 5) {
    const students = new Set(overdue.map((inv) => inv.studentId));
    const total = overdue.reduce((sum, inv) => sum + balance(inv), 0);
    alerts.push({
      key: 'many-overdue',
      rule: 'many-overdue',
      severity: 'warning',
      title: `${students.size} parents are late. Clear them in one sitting (${formatINR(total)}).`,
      body: `${overdue.length} invoices overdue, ${formatINR(total)} in total. Work through them one by one in the chase queue.`,
      actionLabel: 'Open the chase queue',
      actionHref: 'chase',
    });
  }

  return alerts;
}

// ---- Chase queue ranking (the "bad day" screen) ----

export type ReliabilityChip = 'Reliable' | 'Sometimes late' | 'Chronic';

export type ChaseRow = {
  student: Student;
  invoice: Invoice; // most overdue unpaid invoice for this student
  amount: number; // total overdue balance for the student
  daysOverdue: number; // worst days overdue across their overdue invoices
  avgDaysLate: number; // mean days late across invoices paid after their due date
  reliability: ReliabilityChip;
  score: number; // 0–100, normalised across the queue
};

// scoreInvoice = amount * daysOverdue, normalised to 0–100 across the queue.
// avgDaysLate and the reliability chip are display only (they do not change
// the rank — the brief ranks by Amount Owed x Days Overdue).
export function rankChase(data: AppData): ChaseRow[] {
  const ref = data.referenceDate;
  const overdue = data.invoices.filter((inv) => balance(inv) > 0 && isOverdue(inv, ref));
  const byStudent = new Map<string, Invoice[]>();
  for (const inv of overdue) {
    const list = byStudent.get(inv.studentId) ?? [];
    list.push(inv);
    byStudent.set(inv.studentId, list);
  }

  const raw: (ChaseRow & { rawScore: number })[] = [];
  for (const [studentId, invs] of byStudent) {
    const student = data.students.find((s) => s.id === studentId);
    if (student === undefined) {
      continue;
    }
    const amount = invs.reduce((sum, inv) => sum + balance(inv), 0);
    const daysOverdue = Math.max(...invs.map((inv) => diffDays(inv.dueDate, ref)));
    const mine = data.invoices.filter((inv) => inv.studentId === studentId);
    const lateDays: number[] = [];
    for (const inv of mine) {
      if (balance(inv) !== 0) {
        continue;
      }
      const last = inv.payments.reduce<string | null>(
        (acc, p) => (acc === null || p.date > acc ? p.date : acc),
        null,
      );
      if (last !== null && last > inv.dueDate) {
        lateDays.push(diffDays(inv.dueDate, last));
      }
    }
    const avgDaysLate =
      lateDays.length > 0
        ? Math.round(lateDays.reduce((a, b) => a + b, 0) / lateDays.length)
        : 0;
    const rel = reliabilityOf(studentId, data.invoices, ref);
    const reliability: ReliabilityChip =
      rel.label === 'Always on time'
        ? 'Reliable'
        : rel.label === 'Occasionally late'
          ? 'Sometimes late'
          : 'Chronic';
    const mostOverdue = [...invs].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];
    raw.push({
      student,
      invoice: mostOverdue,
      amount,
      daysOverdue,
      avgDaysLate,
      reliability,
      score: 0,
      rawScore: amount * daysOverdue,
    });
  }

  const max = raw.reduce((m, r) => Math.max(m, r.rawScore), 0);
  return raw
    .map(({ rawScore, ...row }) => ({
      ...row,
      score: max > 0 ? Math.round((rawScore / max) * 100) : 0,
    }))
    .sort((a, b) => b.score - a.score);
}
