import type { AppData, BusinessProfile, Invoice, Student } from './types';
import { amountPaid, balance } from './forecast';
import { formatDate, formatINR } from './format';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 'YYYY-MM' to 'Mon YYYY'.
function monthLabel(ym: string): string {
  const idx = Number(ym.slice(5, 7)) - 1;
  return `${MONTH_NAMES[idx] ?? ym.slice(5, 7)} ${ym.slice(0, 4)}`;
}

export function printInvoice(
  _data: AppData,
  invoice: Invoice,
  student: Student,
  business: BusinessProfile,
): void {
  const paymentRows =
    invoice.payments.length === 0
      ? '<tr><td colspan="4">No payments yet</td></tr>'
      : invoice.payments
          .map(
            (p) =>
              `<tr><td>${escapeHtml(formatDate(p.date))}</td>` +
              `<td>${escapeHtml(p.method)}</td>` +
              `<td>${escapeHtml(formatINR(p.amount))}</td>` +
              `<td>${escapeHtml(p.ref ?? p.note ?? '')}</td></tr>`,
          )
          .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(monthLabel(invoice.month))} invoice - ${escapeHtml(student.name)}</title>
<style>
  body { font-family: sans-serif; color: #3b2f25; margin: 24px; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  th, td { border-bottom: 1px solid #e8dfd0; padding: 6px; text-align: left; }
  th { font-size: 0.85rem; color: #7a6b5d; }
  h1 { color: #164f4c; margin: 0; }
</style>
</head>
<body>
<div class="print-area">
  <h1>${escapeHtml(business.businessName)}</h1>
  <p>${escapeHtml(business.ownerName)}</p>
  <h2>${escapeHtml(monthLabel(invoice.month))} invoice</h2>
  <p>
    ${escapeHtml(student.name)} (${escapeHtml(student.className)})<br>
    Issued: ${escapeHtml(formatDate(invoice.issueDate))}<br>
    Due: ${escapeHtml(formatDate(invoice.dueDate))}
  </p>
  <p>
    Amount: ${escapeHtml(formatINR(invoice.amount))}<br>
    Paid: ${escapeHtml(formatINR(amountPaid(invoice)))}<br>
    Balance: ${escapeHtml(formatINR(balance(invoice)))}
  </p>
  <table>
    <thead>
      <tr><th>Date</th><th>Method</th><th>Amount</th><th>Ref / Note</th></tr>
    </thead>
    <tbody>${paymentRows}</tbody>
  </table>
  <p>Pay to UPI: ${escapeHtml(business.upiId)}</p>
</div>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w === null) {
    alert('The print window was blocked. Please allow pop-ups for this site and try again.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
