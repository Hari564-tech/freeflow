import { useEffect } from 'react';
import { formatINR } from '../format';

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

  if (!open) {
    return null;
  }

  return (
    <div className="qr-overlay" onClick={onClose}>
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
        <div className="qr-svg" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <p>
          <a className="qr-link" href={upiLink}>
            Open in UPI app
          </a>
        </p>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
