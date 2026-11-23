import { Printer, Share2 } from 'lucide-react';
import type { BusinessProfile, Invoice, Payment } from '../types';
import { formatDate, formatINR } from '../format';
import { waLink } from '../reminders';
import { Modal, ReceiptTemplate } from './ui';

export type ReceiptInfo = {
  invoice: Invoice;
  payment: Payment;
  studentName: string;
  studentPhone?: string;
};

/** Receipt shown right after a payment is recorded (invoice list or dashboard). */
export default function ReceiptModal({
  receipt,
  profile,
  onClose,
}: {
  receipt: ReceiptInfo | null;
  profile: BusinessProfile;
  onClose: () => void;
}) {
  if (receipt === null) {
    return null;
  }
  const text = `Receipt: ${receipt.studentName} paid ${formatINR(receipt.payment.amount)} on ${formatDate(receipt.payment.date)} via ${receipt.payment.method}. — ${profile.businessName}`;
  return (
    <Modal open={receipt !== null} onClose={onClose} title="Payment recorded">
      <ReceiptTemplate
        logoText={profile.businessName}
        receiptNo={`FF-${receipt.invoice.month}-${receipt.invoice.studentId}`}
        studentName={receipt.studentName}
        amount={receipt.payment.amount}
        date={formatDate(receipt.payment.date)}
        mode={receipt.payment.method}
        status="Paid"
      />
      <div className="receipt-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Print / Save PDF
        </button>
        {receipt.studentPhone ? (
          <a
            className="btn"
            href={waLink(receipt.studentPhone, text)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Share2 size={16} aria-hidden="true" /> Share on WhatsApp
          </a>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
            } catch {
              /* clipboard unavailable */
            }
          }}
        >
          Copy receipt
        </button>
      </div>
    </Modal>
  );
}
