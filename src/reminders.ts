import type { AppData, BusinessProfile, Invoice, ReminderTone, Student } from './types';
import { balance, isOverdue } from './forecast';
import { addDays, diffDays, formatDate, formatINR } from './format';
import { monthLabel } from './qr';

// Days overdue -> reminder escalation level.
export function toneForDaysOverdue(days: number): 'gentle' | 'firm' | 'final' {
  if (days > 21) {
    return 'final';
  }
  if (days >= 8) {
    return 'firm';
  }
  return 'gentle';
}

// Short WhatsApp-style reminder for one invoice.
export function buildReminderMessage(
  data: AppData,
  invoice: Invoice,
  student: Student,
  tone: ReminderTone,
  business: BusinessProfile,
): string {
  const greeting = student.parentName ? `Hi ${student.parentName},` : 'Hi,';
  const what = `the ${monthLabel(invoice.month)} invoice for ${student.name} (${formatINR(balance(invoice))})`;
  const due = formatDate(invoice.dueDate);
  const overdue = isOverdue(invoice, data.referenceDate);
  const days = diffDays(invoice.dueDate, data.referenceDate);
  const pay = `You can pay via UPI to ${business.upiId}.`;

  let body: string;
  if (tone === 'Polite') {
    const late = overdue ? ` It is now ${days} days past due.` : '';
    const when = overdue ? `was due on ${due}` : `is due on ${due}`;
    body = `I hope you are doing well. This is a gentle note that ${what} ${when}.${late} ${pay} Thank you!`;
  } else if (tone === 'Friendly') {
    const late = overdue ? ` It is ${days} days past due.` : '';
    body = `Quick reminder: ${what} is due ${due}.${late} ${pay} Thanks!`;
  } else {
    const status = overdue ? `is overdue by ${days} days` : `is due on ${due}`;
    const deadline = formatDate(addDays(data.referenceDate, 3));
    body = `${what.charAt(0).toUpperCase()}${what.slice(1)} ${status}. Please pay by ${deadline}. ${pay}`;
  }

  return `${greeting}\n${body}\n\nThanks,\n${business.ownerName}`;
}

export function waLink(phone: string, message: string): string {
  return 'https://wa.me/' + phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(message);
}
