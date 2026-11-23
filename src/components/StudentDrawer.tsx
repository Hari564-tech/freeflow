import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import type { AppData, BusinessProfile, Invoice, ReminderTone, Student } from '../types';
import { amountPaid, balance, isOverdue } from '../forecast';
import { diffDays, formatDate, formatINR } from '../format';
import { buildReminderMessage, toneForDaysOverdue, waLink } from '../reminders';
import { buildUpiLink, monthLabel, qrSvgForUpi } from '../qr';
import { reliabilityOf } from '../reliability';
import QrModal from './QrModal';
import { useFocusTrap } from '../useFocusTrap';
import { Avatar, Chip, Tabs } from './ui';

type Note = { text: string; date: string };

function loadNotes(): Record<string, Note[]> {
  try {
    const raw = window.localStorage.getItem('feeflow_notes_v1');
    if (raw === null) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, Note[]>) : {};
  } catch {
    return {};
  }
}

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
  const [qrError, setQrError] = useState(false);
  const [tab, setTab] = useState<'payments' | 'invoices' | 'notes'>('payments');
  const [notes, setNotes] = useState<Record<string, Note[]>>(() => loadNotes());
  const [noteDraft, setNoteDraft] = useState('');

  function addNote(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const text = noteDraft.trim();
    if (text === '') {
      return;
    }
    const next = {
      ...notes,
      [student.id]: [...(notes[student.id] ?? []), { text, date: referenceDate }],
    };
    setNotes(next);
    window.localStorage.setItem('feeflow_notes_v1', JSON.stringify(next));
    setNoteDraft('');
  }
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef);

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

  // Lock page scroll while the drawer is open; restore the previous value on close.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

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
    setQrError(false);
    try {
      const link = buildUpiLink(profile, student.name, inv);
      const svg = await qrSvgForUpi(link);
      setQr({ link, svg, amount: balance(inv), month: monthLabel(inv.month) });
      setQrOpen(true);
    } catch {
      setQrError(true);
    }
  }

  return (
    <div className="drawer-overlay" ref={overlayRef} onClick={onClose}>
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={student.name}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-head">
          <Avatar
            name={student.name}
            ring={reliability.tone === 'bad' ? 'overdue' : reliability.tone === 'warn' ? 'due' : 'paid'}
          />
          <div>
            <h2>{student.name}</h2>
            <p className="muted">
              {student.className} · {student.subject}
            </p>
            <p>
              <Chip tone={reliability.tone === 'good' ? 'success' : reliability.tone === 'warn' ? 'warning' : 'danger'}>
                {reliability.label}
              </Chip>
            </p>
          </div>
        </div>
        <p>Parent: {student.parentName || '—'}</p>
        <div className="detail-contact">
          {student.parentPhone ? (
            <>
              <a href={`tel:${student.parentPhone}`}>
                <Phone aria-hidden="true" /> Call {student.parentPhone}
              </a>
              {target && message !== '' && (
                <a href={waLink(student.parentPhone, message)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden="true" /> WhatsApp
                </a>
              )}
            </>
          ) : (
            <span className="muted">No parent phone on file.</span>
          )}
        </div>

        <Tabs
          tabs={[
            { id: 'payments', label: 'Payments' },
            { id: 'invoices', label: 'Invoices' },
            { id: 'notes', label: 'Notes' },
          ]}
          active={tab}
          onChange={(id) => setTab(id as 'payments' | 'invoices' | 'notes')}
        />

        {tab === 'payments' && (
          <ul className="timeline">
            {invoices.flatMap((inv) =>
              inv.payments.map((p) => ({ inv, p })),
            ).length === 0 && <li className="muted">No payments recorded yet.</li>}
            {invoices
              .flatMap((inv) => inv.payments.map((p) => ({ inv, p })))
              .sort((a, b) => (a.p.date < b.p.date ? 1 : -1))
              .map(({ inv, p }, i) => (
                <li key={`${inv.id}-${i}`}>
                  <span className="timeline-dot" aria-hidden="true" />
                  <span className="timeline-main">
                    <strong>{formatINR(p.amount)}</strong> · {p.method}
                    {p.ref ? ` · Ref ${p.ref}` : ''}
                    <div className="muted">
                      {monthLabel(inv.month)} · {formatDate(p.date)}
                      {p.note ? ` · ${p.note}` : ''}
                    </div>
                  </span>
                </li>
              ))}
          </ul>
        )}

        {tab === 'invoices' && (
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
        )}

        {tab === 'notes' && (
          <div>
            {(notes[student.id] ?? []).length === 0 && (
              <p className="muted">No notes yet. Notes are stored in this browser only.</p>
            )}
            <ul className="timeline">
              {(notes[student.id] ?? []).map((n, i) => (
                <li key={i}>
                  <span className="timeline-dot due" aria-hidden="true" />
                  <span className="timeline-main">
                    {n.text}
                    <div className="muted">{formatDate(n.date)}</div>
                  </span>
                </li>
              ))}
            </ul>
            <form noValidate onSubmit={addNote}>
              <label className="form-field">
                <span>Add a note</span>
                <input
                  type="text"
                  placeholder="e.g. Parent asked for the receipt on WhatsApp"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                />
              </label>
              <button type="submit" className="btn btn-primary">
                Add note
              </button>
            </form>
          </div>
        )}

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

        {qrError && <p className="muted">Could not generate the QR code. Try again.</p>}

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
