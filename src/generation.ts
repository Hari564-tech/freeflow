import type { AppData, Invoice } from './types';

// One invoice per active student who has no invoice for the month yet.
// Due date is the student's billing day in that month; issue date is the 1st.
export function generateInvoices(
  data: AppData,
  month: string,
): { invoices: Invoice[]; skipped: number } {
  const [year, mm] = month.split('-');
  let skipped = 0;
  const invoices: Invoice[] = [];
  for (const student of data.students) {
    if (!student.active) {
      continue;
    }
    const exists = data.invoices.some(
      (inv) => inv.studentId === student.id && inv.month === month,
    );
    if (exists) {
      skipped += 1;
      continue;
    }
    const day = String(student.billingDay).padStart(2, '0');
    invoices.push({
      id: `inv-${month}-${student.id}`,
      studentId: student.id,
      subject: student.subject,
      month,
      amount: student.monthlyFee,
      issueDate: `${month}-01`,
      dueDate: `${year}-${mm}-${day}`,
      status: 'sent',
      payments: [],
      reminders: [],
    });
  }
  return { invoices, skipped };
}
