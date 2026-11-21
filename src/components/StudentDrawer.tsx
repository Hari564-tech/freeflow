import { useEffect, useState } from 'react';
import type { AppData, BusinessProfile, Invoice, ReminderTone, Student } from '../types';
import { amountPaid, balance, isOverdue } from '../forecast';
import { diffDays, formatDate, formatINR } from '../format';
import { buildReminderMessage, toneForDaysOverdue, waLink } from '../reminders';
import { buildUpiLink, monthLabel, qrSvgForUpi } from '../qr';
import { reliabilityOf } from '../reliability';
import QrModal from './QrModal';

type StudentDrawerProps = {
  student: Student;
  invoices: Invoice[];
  profile: BusinessProfile;
  referenceDate: string;
  onClose: () => void;
};

const TONE_FOR_LEVEL: Record<ReturnType<typeof toneForDaysOverdue>, ReminderTone> = {
  gentle: 'Polite',
  firm: 'Friendly',
  final: 'Firm',
};

type QrState = { link: string; svg: string; amount: number; month: string };

// Earliest due date first; on the same date, the larger balance first.
function byDueThenBalance(a: Invoice, b: Invoice): number {
  if (a.dueDate !== b.dueDate) {
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return balance(b) - balance(a);
}

export default function StudentDrawer({
  student,
  invoices,
  profile,
  referenceDate,
  onClose,
}: StudentDrawerProps) {
  const [qr, setQr] = useState<QrState | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // While the QR modal is open, Escape belongs to the modal.
      if (e.key === 'Escape' && !qrOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, qrOpen]);

  const reliability = reliabilityOf(student.id, invoices, referenceDate);
  const target: Invoice | undefined = invoices
    .filter((inv) => balance(inv) > 0)
    .sort(byDueThenBalance)[0];

  // buildReminderMessage reads only the reference date from AppData.
  const data: AppData = {
    version: 2,
    referenceDate,
    openingCash: 0,
    safetyBuffer: 0,
    business: profile,
    students: [student],
    invoices,
    bills: [],
  };
  const tone = target
    ? TONE_FOR_LEVEL[toneForDaysOverdue(diffDays(target.dueDate, referenceDate))]
    : 'Polite';
  const message = target
    ? buildReminderMessage(data, target, student, tone, profile)
    : '';

  async function openQr(inv: Invoice): Promise<void> {
    const link = buildUpiLink(profile, student.name, inv);
    const svg = await qrSvgForUpi(link);
    setQr({ link, svg, amount: balance(inv), month: monthLabel(inv.month) });
    setQrOpen(true);
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <h2>{student.name}</h2>
        <p className="muted">
          {student.className} · {student.subject}
        </p>
        <p>Parent: {student.parentName || '—'}</p>
        <p>Phone: {student.parentPhone || '—'}</p>
        <p>
          <span className={'badge badge-' + reliability.tone}>{reliability.label}</span>
        </p>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th className="num">Amount</th>
                <th className="num">Paid</th>
                <th className="num">Balance</th>
                <th>Due date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const bal = balance(inv);
                const status = bal === 0 ? 'Paid' : isOverdue(inv, referenceDate) ? 'Overdue' : 'Due';
                return (
                  <tr key={inv.id}>
                    <td>{monthLabel(inv.month)}</td>
                    <td className="num">{formatINR(inv.amount)}</td>
                    <td className="num">{formatINR(amountPaid(inv))}</td>
                    <td className="num">{formatINR(bal)}</td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="drawer-actions">
          {target &&
            (student.parentPhone ? (
              <a
                className="btn btn-primary"
                href={waLink(student.parentPhone, message)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Send WhatsApp reminder
              </a>
            ) : (
              <a
                className="btn btn-primary"
                aria-disabled="true"
                style={{ opacity: 0.5, pointerEvents: 'none' }}
              >
                Add a parent phone to send WhatsApp
              </a>
            ))}
          {target && (
            <button type="button" className="btn btn-ghost" onClick={() => void openQr(target)}>
              Show UPI QR
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {qr && (
          <QrModal
            open={qrOpen}
            onClose={() => setQrOpen(false)}
            upiLink={qr.link}
            qrSvg={qr.svg}
            amount={qr.amount}
            studentName={student.name}
            monthLabel={qr.month}
          />
        )}
      </div>
    </div>
  );
}
