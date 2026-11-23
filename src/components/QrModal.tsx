import { useEffect, useRef } from 'react';
import { formatINR } from '../format';
import { useFocusTrap } from '../useFocusTrap';
import { QRCard } from './ui';

type QrModalProps = {
  open: boolean;
  onClose: () => void;
  upiLink: string;
  qrSvg: string; // trusted local SVG string from qrSvgForUpi
  amount: number;
  studentName: string;
  monthLabel: string;
};

export default function QrModal({
  open,
  onClose,
  upiLink,
  qrSvg,
  amount,
  studentName,
  monthLabel,
}: QrModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef, open);

  if (!open) {
    return null;
  }

  // UPI id is embedded in the deep link (upi://pay?pa=...).
  let upiId = '';
  try {
    upiId = new URLSearchParams(upiLink.split('?')[1] ?? '').get('pa') ?? '';
  } catch {
    upiId = '';
  }

  return (
    <div className="qr-overlay" ref={overlayRef} onClick={onClose}>
      <div
        className="qr-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Pay fee for ${studentName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Pay via UPI</h2>
        <p>{studentName}</p>
        <p className="muted">
          {monthLabel} · {formatINR(amount)}
        </p>
        <QRCard
          qrSvg={qrSvg}
          upiId={upiId}
          upiLink={upiLink}
          amount={amount}
          studentName={studentName}
          month={monthLabel}
        />
        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ marginTop: 12 }}>
          Close
        </button>
      </div>
    </div>
  );
}
