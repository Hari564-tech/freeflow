import type { ReactNode } from 'react';
import { Copy, Download, Share2 } from 'lucide-react';
import { formatINR } from '../../format';

/* ---------- QRCard: large QR, UPI ID, Copy / Share / Download PNG ---------- */
export function QRCard({
  qrSvg,
  upiId,
  upiLink,
  amount,
  studentName,
  month,
}: {
  qrSvg: string; // trusted local SVG string from qrSvgForUpi
  upiId: string;
  upiLink: string;
  amount: number;
  studentName: string;
  month: string;
}) {
  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(upiLink);
    } catch {
      /* clipboard unavailable — the link is visible below */
    }
  }

  function downloadPng(): void {
    // Rasterise the SVG into a PNG so the QR can be shared/saved as an image.
    const svg = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 440;
      canvas.height = 440;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 440, 440);
        ctx.drawImage(img, 0, 0, 440, 440);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `feeflow-qr-${studentName.replace(/\s+/g, '-').toLowerCase()}.png`;
        a.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function share(): Promise<void> {
    const text = `${studentName} — ${month} fee ${formatINR(amount)}. Pay via UPI: ${upiLink}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'FeeFlow payment', text });
        return;
      } catch {
        /* user cancelled the share sheet */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="qr-card">
      <div className="qr-svg" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <p className="muted">
        {studentName} · {month} · {formatINR(amount)}
      </p>
      <div className="qr-upi">
        <code>{upiId}</code>
        <button type="button" className="btn btn-sm" onClick={() => void copyLink()}>
          <Copy size={15} aria-hidden="true" /> Copy link
        </button>
      </div>
      <div className="receipt-actions" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn btn-sm" onClick={() => void share()}>
          <Share2 size={15} aria-hidden="true" /> Share
        </button>
        <button type="button" className="btn btn-sm" onClick={downloadPng}>
          <Download size={15} aria-hidden="true" /> Download PNG
        </button>
        <a className="btn btn-sm" href={upiLink}>
          Open in UPI app
        </a>
      </div>
    </div>
  );
}

/* ---------- WhatsAppBubble: message preview in a WhatsApp-style bubble ---------- */
export function WhatsAppBubble({ message, tone }: { message: string; tone: string }) {
  return (
    <div>
      <div className="wa-bubble-label">Preview · {tone} tone · WhatsApp</div>
      <div className="wa-bubble">{message}</div>
      <div className="var-chips" aria-label="Message variables">
        <span className="chip">{'{student}'}</span>
        <span className="chip">{'{amount}'}</span>
        <span className="chip">{'{due_date}'}</span>
        <span className="chip">{'{upi_link}'}</span>
      </div>
    </div>
  );
}

/* ---------- ReceiptTemplate: clean printable/shareable receipt ---------- */
export function ReceiptTemplate({
  logoText,
  receiptNo,
  studentName,
  amount,
  date,
  mode,
  status,
}: {
  logoText: string;
  receiptNo: string;
  studentName: string;
  amount: number;
  date: string;
  mode: string;
  status: 'Paid';
}) {
  return (
    <div className="receipt-card">
      <div className="receipt-head">
        <div>
          <div className="receipt-logo">{logoText}</div>
          <div className="muted">Receipt {receiptNo}</div>
        </div>
        <span className="receipt-stamp">{status.toUpperCase()}</span>
      </div>
      <div className="receipt-rows">
        <div>
          <span>Student</span>
          <strong>{studentName}</strong>
        </div>
        <div>
          <span>Date</span>
          <span>{date}</span>
        </div>
        <div>
          <span>Mode</span>
          <span>{mode}</span>
        </div>
        <div className="receipt-total">
          <span>Amount paid</span>
          <span>{formatINR(amount)}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- ChartCard: card wrapper for charts with a loading state ---------- */
export function ChartCard({
  title,
  subtitle,
  actions,
  loading,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="m-card-head">
        <div>
          <h2>{title}</h2>
          {subtitle !== undefined && <p className="muted">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {loading === true ? (
        <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          <div className="sk" style={{ height: 180 }} />
          <div className="sk" style={{ height: 14, width: '60%' }} />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
