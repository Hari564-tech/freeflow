import type { Invoice } from './types';
import { balance, isOverdue } from './forecast';

export type Reliability = {
  label: 'Always on time' | 'Occasionally late' | 'Needs follow-up';
  tone: 'good' | 'warn' | 'bad';
};

// Latest payment date on an invoice, or undefined when it has no payments.
function latestPaymentDate(inv: Invoice): string | undefined {
  return inv.payments.reduce<string | undefined>(
    (acc, p) => (acc === undefined || p.date > acc ? p.date : acc),
    undefined,
  );
}

export function reliabilityOf(
  studentId: string,
  invoices: Invoice[],
  referenceDate: string,
): Reliability {
  const mine = invoices.filter((inv) => inv.studentId === studentId);

  if (mine.some((inv) => balance(inv) > 0 && isOverdue(inv, referenceDate))) {
    return { label: 'Needs follow-up', tone: 'bad' };
  }

  const paidLate = mine.some((inv) => {
    const last = latestPaymentDate(inv);
    return balance(inv) === 0 && last !== undefined && last > inv.dueDate;
  });
  if (paidLate) {
    return { label: 'Occasionally late', tone: 'warn' };
  }

  return { label: 'Always on time', tone: 'good' };
}
