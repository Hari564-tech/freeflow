import { useEffect, useState, type FormEvent } from 'react';
import type { AppData, Invoice, PaymentMethod } from '../types';
import { balance } from '../forecast';
import { formatINR } from '../format';
import { validateInvoiceAmounts } from '../data';

type Props = {
  data: AppData;
  invoice: Invoice;
  onChange: (next: AppData) => void;
  onClose: () => void;
};

const METHODS: PaymentMethod[] = ['UPI', 'Cash', 'Bank'];

export default function PaymentDrawer({ data, invoice, onChange, onClose }: Props) {
  const owed = balance(invoice);
  const [amount, setAmount] = useState<string>(String(owed));
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [date, setDate] = useState<string>(data.referenceDate);
  const [ref, setRef] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    onClose();
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
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
        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Amount</span>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Method</span>
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
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
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn">
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
