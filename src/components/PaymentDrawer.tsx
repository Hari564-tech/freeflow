import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AppData, Invoice, Payment, PaymentMethod } from '../types';
import { balance } from '../forecast';
import { formatINR } from '../format';
import { validateInvoiceAmounts } from '../data';
import { useFocusTrap } from '../useFocusTrap';
import { AmountInput, SegmentedControl } from './ui';

type Props = {
  data: AppData;
  invoice: Invoice;
  onChange: (next: AppData) => void;
  onClose: () => void;
  onPaid?: (invoice: Invoice, payment: Payment) => void;
};

const METHODS: PaymentMethod[] = ['UPI', 'Cash', 'Bank'];

export default function PaymentDrawer({ data, invoice, onChange, onClose, onPaid }: Props) {
  const owed = balance(invoice);
  const [amount, setAmount] = useState<string>(String(owed));
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [date, setDate] = useState<string>(data.referenceDate);
  const [ref, setRef] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) {
      setError('Amount must be more than 0.');
      return;
    }
    if (value > owed) {
      setError(`Amount cannot be more than the balance of ${formatINR(owed)}.`);
      return;
    }
    const duplicate = invoice.payments.some(
      (p) => p.amount === value && p.date === date && p.method === method,
    );
    if (duplicate) {
      setError('This payment is already recorded (same amount, date and method).');
      return;
    }
    const payment = {
      amount: value,
      date,
      method,
      ref: ref.trim() === '' ? undefined : ref.trim(),
      note: note.trim() === '' ? undefined : note.trim(),
    };
    const next: Invoice = {
      ...invoice,
      payments: [...invoice.payments, payment],
      status: value === owed ? 'paid' : 'partial',
    };
    const problem = validateInvoiceAmounts(next);
    if (problem !== null) {
      setError(problem);
      return;
    }
    onChange({
      ...data,
      invoices: data.invoices.map((inv) => (inv.id === invoice.id ? next : inv)),
    });
    // Confetti burst, only the first payment of the session (App listens).
    if (window.sessionStorage.getItem('feeflow_confetti_done') === null) {
      window.sessionStorage.setItem('feeflow_confetti_done', '1');
      window.dispatchEvent(new Event('feeflow-paid'));
    }
    onPaid?.(next, payment);
    onClose();
  }

  return (
    <div className="drawer-overlay" ref={overlayRef} onClick={onClose}>
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Record payment"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Record payment</h2>
        <p className="muted">
          Balance due {formatINR(owed)} · {invoice.month}
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <AmountInput
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            error={error}
          />
          <div className="ui-field">
            <span>Method</span>
            <SegmentedControl
              options={METHODS.map((m) => ({ value: m, label: m }))}
              value={method}
              onChange={(m) => setMethod(m)}
              label="Payment method"
            />
          </div>
          <label className="form-field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          {method === 'UPI' && (
            <label className="form-field">
              <span>UPI ref (optional)</span>
              <input
                type="text"
                placeholder="Transaction ref"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
            </label>
          )}
          <label className="form-field">
            <span>Note (optional)</span>
            <input
              type="text"
              placeholder="e.g. Paid in cash at the door"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Save payment
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
