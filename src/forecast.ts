import type { AppData, Invoice, Payment, Student } from './types';
import { addDays } from './format';

export type Scenario = {
  vikramLate: boolean;
  decLate: boolean;
  delayDays?: number; // 0 to 20: shifts unpaid future pay dates
  loseTopStudent?: boolean; // removes generated invoices of the highest-fee student
  unexpectedExpense?: number; // one extra outflow dated referenceDate
  overdueUnpaid?: boolean; // overdue unpaid invoices are forecast for 2026-12-10
};

export type ForecastInvoice = {
  invoice: Invoice;
  studentId: string;
  dueDate: string; // effective due date after scenario adjustments
  expectedPayDate: string;
  generated: boolean;
};

export type ForecastEvent = {
  date: string;
  label: string;
  kind: 'in' | 'out';
  amount: number;
};

export type RunningPoint = { date: string; balance: number };

export type Forecast = {
  events: ForecastEvent[];
  runningPoints: RunningPoint[];
  totalIn: number;
  totalOut: number;
  endBalance: number;
  minBalance: number;
  minBalanceDate: string;
  aboveBuffer: boolean;
  openingCash: number;
  safetyBuffer: number;
  referenceDate: string;
  horizonEnd: string;
};

// Months for which invoices are auto-generated when no real invoice exists.
const GENERATED_MONTHS = ['2026-12', '2027-01', '2027-02'];

export function amountPaid(inv: Invoice): number {
  return inv.payments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
}

export function balance(inv: Invoice): number {
  return Math.max(0, inv.amount - amountPaid(inv));
}

export function isOverdue(inv: Invoice, referenceDate: string): boolean {
  const unpaid = amountPaid(inv) < inv.amount;
  return unpaid && inv.dueDate < referenceDate;
}

export function getInvoiceDueDate(
  inv: Invoice,
  students: Student[],
  scenario: Scenario,
): string {
  if (inv.month !== '2026-12') {
    return inv.dueDate;
  }
  const student = students.find((s) => s.id === inv.studentId);
  if (scenario.vikramLate && student?.name === 'Vikram Patel') {
    return '2026-12-20';
  }
  if (scenario.decLate) {
    return addDays(inv.dueDate, 7);
  }
  return inv.dueDate;
}

export function expectedPayDate(
  inv: Invoice,
  referenceDate: string,
  effectiveDueDate: string,
): string {
  if (balance(inv) <= 0) {
    // Paid: payments are forecast on their own dates; fall back to the due date.
    const last = inv.payments.reduce<string | null>(
      (acc, p) => (acc === null || p.date > acc ? p.date : acc),
      null,
    );
    return last ?? effectiveDueDate;
  }
  if (effectiveDueDate < referenceDate) {
    // Overdue: chase three days after the last reminder, or three days from today.
    const base =
      inv.reminders.length > 0
        ? addDays(
            inv.reminders.reduce((a, b) => (b > a ? b : a)),
            3,
          )
        : addDays(referenceDate, 3);
    // Never forecast a date earlier than the reference date.
    return base < referenceDate ? referenceDate : base;
  }
  return effectiveDueDate;
}

export function effectiveInvoices(
  data: AppData,
  scenario: Scenario,
): ForecastInvoice[] {
  const ref = data.referenceDate;

  const real: ForecastInvoice[] = data.invoices.map((inv) => {
    const dueDate = getInvoiceDueDate(inv, data.students, scenario);
    return {
      invoice: inv,
      studentId: inv.studentId,
      dueDate,
      expectedPayDate: scenarioPayDate(inv, ref, dueDate, scenario),
      generated: false,
    };
  });

  const topId = scenario.loseTopStudent ? topStudentId(data.students) : undefined;
  const generated: ForecastInvoice[] = [];
  for (const month of GENERATED_MONTHS) {
    for (const student of data.students) {
      if (student.id === topId) {
        continue;
      }
      const exists = data.invoices.some(
        (i) => i.studentId === student.id && i.month === month,
      );
      if (exists) {
        continue;
      }
      const inv: Invoice = {
        id: `auto-${month}-${student.id}`,
        studentId: student.id,
        subject: student.subject,
        month,
        amount: student.monthlyFee,
        issueDate: `${month}-01`,
        dueDate: `${month}-05`,
        status: 'draft',
        payments: [],
        reminders: [],
      };
      const dueDate = getInvoiceDueDate(inv, data.students, scenario);
      generated.push({
        invoice: inv,
        studentId: student.id,
        dueDate,
        expectedPayDate: scenarioPayDate(inv, ref, dueDate, scenario),
        generated: true,
      });
    }
  }

  return [...real, ...generated];
}

// Pay date after scenario adjustments. Paid invoices and the default scenario are unchanged.
function scenarioPayDate(
  inv: Invoice,
  referenceDate: string,
  effectiveDueDate: string,
  scenario: Scenario,
): string {
  const base = expectedPayDate(inv, referenceDate, effectiveDueDate);
  if (balance(inv) <= 0) {
    return base;
  }
  if (effectiveDueDate < referenceDate) {
    return scenario.overdueUnpaid ? '2026-12-10' : base;
  }
  const delay = Math.min(20, Math.max(0, scenario.delayDays ?? 0));
  return delay > 0 ? addDays(base, delay) : base;
}

// Student with the highest monthlyFee; the first one wins ties.
function topStudentId(students: Student[]): string | undefined {
  let top: Student | undefined;
  for (const s of students) {
    if (top === undefined || s.monthlyFee > top.monthlyFee) {
      top = s;
    }
  }
  return top?.id;
}

// All 'YYYY-MM' months from the month of startIso through the month of endIso.
function monthsBetween(startIso: string, endIso: string): string[] {
  const endMonth = endIso.slice(0, 7);
  const months: string[] = [];
  let year = Number(startIso.slice(0, 4));
  let month = Number(startIso.slice(5, 7));
  for (;;) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    if (ym > endMonth) {
      break;
    }
    months.push(ym);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

export function buildForecast(
  data: AppData,
  horizonDays: 30 | 60 | 90,
  scenario: Scenario,
): Forecast {
  const ref = data.referenceDate;
  const horizonEnd = addDays(ref, horizonDays);
  const inWindow = (date: string): boolean => date >= ref && date <= horizonEnd;

  const events: ForecastEvent[] = [];

  for (const fi of effectiveInvoices(data, scenario)) {
    const student = data.students.find((s) => s.id === fi.studentId);
    const who = student ? student.name : fi.studentId;
    const inv = fi.invoice;

    if (balance(inv) > 0) {
      if (inWindow(fi.expectedPayDate)) {
        events.push({
          date: fi.expectedPayDate,
          label: `${who} - ${inv.month} invoice`,
          kind: 'in',
          amount: balance(inv),
        });
      }
    } else {
      // Paid invoices: forecast each payment on its own date.
      for (const p of inv.payments) {
        if (inWindow(p.date)) {
          events.push({
            date: p.date,
            label: `${who} - ${inv.month} payment (${p.method})`,
            kind: 'in',
            amount: p.amount,
          });
        }
      }
    }
  }

  const months = monthsBetween(ref, horizonEnd);
  for (const bill of data.bills) {
    if (bill.oneTimeDate !== undefined) {
      if (inWindow(bill.oneTimeDate)) {
        events.push({ date: bill.oneTimeDate, label: bill.name, kind: 'out', amount: bill.amount });
      }
    } else if (bill.dayOfMonth !== undefined) {
      const day = String(bill.dayOfMonth).padStart(2, '0');
      for (const ym of months) {
        const date = `${ym}-${day}`;
        if (inWindow(date)) {
          events.push({ date, label: bill.name, kind: 'out', amount: bill.amount });
        }
      }
    }
  }

  if (scenario.unexpectedExpense !== undefined && scenario.unexpectedExpense > 0) {
    events.push({
      date: ref,
      label: 'Unexpected expense',
      kind: 'out',
      amount: scenario.unexpectedExpense,
    });
  }

  // Sort by date; on the same date, 'in' events come before 'out' events.
  events.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? -1 : 1;
    }
    if (a.kind === b.kind) {
      return 0;
    }
    return a.kind === 'in' ? -1 : 1;
  });

  let running = data.openingCash;
  let minBalance = data.openingCash;
  let minBalanceDate = ref;
  let totalIn = 0;
  let totalOut = 0;
  const runningPoints: RunningPoint[] = [];

  for (const e of events) {
    if (e.kind === 'in') {
      running += e.amount;
      totalIn += e.amount;
    } else {
      running -= e.amount;
      totalOut += e.amount;
    }
    runningPoints.push({ date: e.date, balance: running });
    if (running < minBalance) {
      minBalance = running;
      minBalanceDate = e.date;
    }
  }

  // End point at the horizon end, carrying the final balance. Not an event;
  // it repeats the last balance, so minBalance is unaffected.
  runningPoints.push({ date: horizonEnd, balance: running });

  return {
    events,
    runningPoints,
    totalIn,
    totalOut,
    endBalance: running,
    minBalance,
    minBalanceDate,
    aboveBuffer: minBalance >= data.safetyBuffer,
    openingCash: data.openingCash,
    safetyBuffer: data.safetyBuffer,
    referenceDate: ref,
    horizonEnd,
  };
}

export function compareForecasts(
  baseline: Forecast,
  scenario: Forecast,
): {
  baseLowest: number;
  scenLowest: number;
  lowestDelta: number;
  breachDate: string | null;
  daysBelowBuffer: number;
  verdict: 'Safe' | 'Watch' | 'Shortfall';
} {
  const buffer = scenario.safetyBuffer;
  const baseLowest = baseline.minBalance;
  const scenLowest = scenario.minBalance;

  let daysBelowBuffer = 0;
  let breachDate: string | null = null;
  for (const p of scenario.runningPoints) {
    if (p.balance < buffer) {
      daysBelowBuffer += 1;
      if (breachDate === null) {
        breachDate = p.date;
      }
    }
  }

  let verdict: 'Safe' | 'Watch' | 'Shortfall' = 'Safe';
  if (scenLowest < buffer) {
    verdict = 'Shortfall';
  } else if (scenLowest < buffer + 2000) {
    verdict = 'Watch';
  }

  return {
    baseLowest,
    scenLowest,
    lowestDelta: scenLowest - baseLowest,
    breachDate,
    daysBelowBuffer,
    verdict,
  };
}

