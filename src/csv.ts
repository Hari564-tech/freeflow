import type { AppData, Invoice } from './types';
import { amountPaid, balance, isOverdue } from './forecast';
import { monthLabel } from './qr';

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

// Same status derivation as the Invoices page: paid when nothing is owed,
// overdue when past due and unpaid, partial when some money came in,
// otherwise the stored draft/sent status.
function displayStatus(inv: Invoice, referenceDate: string): string {
  if (balance(inv) === 0) {
    return 'Paid';
  }
  if (isOverdue(inv, referenceDate)) {
    return 'Overdue';
  }
  if (amountPaid(inv) > 0) {
    return 'Partial';
  }
  return inv.status === 'draft' ? 'Draft' : 'Sent';
}

export function invoicesToCsv(data: AppData, invoices: Invoice[]): string {
  const header = ['Student', 'Month', 'Amount', 'Paid', 'Balance', 'Status', 'Due date'];
  const lines = invoices.map((inv) => {
    const student = data.students.find((s) => s.id === inv.studentId);
    return [
      student?.name ?? inv.studentId,
      monthLabel(inv.month),
      inv.amount,
      amountPaid(inv),
      balance(inv),
      displayStatus(inv, data.referenceDate),
      inv.dueDate,
    ]
      .map(csvCell)
      .join(',');
  });
  return [header.join(','), ...lines].join('\n');
}
