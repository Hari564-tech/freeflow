import QRCode from 'qrcode';
import type { BusinessProfile, Invoice } from './types';
import { balance } from './forecast';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM' -> 'Nov 2026'
export function monthLabel(month: string): string {
  const [year, mm] = month.split('-');
  return `${MONTHS[Number(mm) - 1]} ${year}`;
}

// UPI deep link for the invoice balance. The student name is not part of the link.
export function buildUpiLink(
  business: BusinessProfile,
  _studentName: string,
  invoice: Invoice,
): string {
  const note = encodeURIComponent(`FeeFlow ${monthLabel(invoice.month)} Fee`);
  return (
    'upi://pay?pa=' +
    encodeURIComponent(business.upiId) +
    '&pn=' +
    encodeURIComponent(business.ownerName) +
    '&am=' +
    balance(invoice) +
    '&cu=INR&tn=' +
    note
  );
}

export async function qrSvgForUpi(link: string): Promise<string> {
  return QRCode.toString(link, { type: 'svg', errorCorrectionLevel: 'M', margin: 1 });
}
