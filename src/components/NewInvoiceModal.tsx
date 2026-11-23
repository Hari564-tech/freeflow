import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AppData, Invoice } from '../types';
import { addDays, formatDate, formatINR } from '../format';
import { validateInvoiceAmounts } from '../data';
import { monthLabel } from '../qr';
import { useFocusTrap } from '../useFocusTrap';
import { AmountInput, Select } from './ui';

type Props = {
  data: AppData;
  onChange: (next: AppData) => void;
  onClose: () => void;
  onAddStudent: () => void;
  dueDays: number;
};

// Next month after the reference date, e.g. 2026-11-21 -> 2026-12.
function nextMonth(referenceDate: string): string {
  const [y, m] = referenceDate.split('-').map(Number);
  const next = m === 12 ? [y + 1, 1] : [y, m + 1];
  return `${next[0]}-${String(next[1]).padStart(2, '0')}`;
}

// Create-invoice flow, max 3 steps with a live preview on the last step.
// Step 1: who + which month. Step 2: amount + dates. Step 3: preview + create.
export default function NewInvoiceModal({
  data,
  onChange,
  onClose,
  onAddStudent,
  dueDays,
}: Props) {
  const active = data.students.filter((s) => s.active);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [studentId, setStudentId] = useState<string>(active[0]?.id ?? '');
  const [month, setMonth] = useState<string>(nextMonth(data.referenceDate));
  const [amount, setAmount] = useState<string>(
    String(active[0]?.monthlyFee ?? ''),
  );
  const [amountEdited, setAmountEdited] = useState<boolean>(false);
  const [issueDate, setIssueDate] = useState<string>(data.referenceDate);
  const [dueDate, setDueDate] = useState<string>(addDays(data.referenceDate, dueDays));
  const [dueEdited, setDueEdited] = useState<boolean>(false);
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

  function changeStudent(id: string): void {
    setStudentId(id);
    if (!amountEdited) {
      const student = data.students.find((s) => s.id === id);
      setAmount(student ? String(student.monthlyFee) : '');
    }
  }

  function changeIssueDate(value: string): void {
    setIssueDate(value);
    if (!dueEdited && value !== '') {
      setDueDate(addDays(value, dueDays));
    }
  }

  function nextFromStep1(): void {
    if (!studentId) {
      setError('Pick a student first.');
      return;
    }
    if (month === '') {
      setError('Pick a month.');
      return;
    }
    setError(null);
    setStep(2);
  }

  function nextFromStep2(): void {
    const value = Number(amount);
    if (!(value > 0)) {
      setError('Amount must be more than 0.');
      return;
    }
    if (issueDate === '' || dueDate === '') {
      setError('Issue date and due date are both required.');
      return;
    }
    setError(null);
    setStep(3);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const student = data.students.find((s) => s.id === studentId);
    if (!student) {
      setError('Pick a student first.');
      return;
    }
    const value = Number(amount);
    if (!(value > 0)) {
      setError('Amount must be more than 0.');
      return;
    }
    if (month === '' || issueDate === '' || dueDate === '') {
      setError('Month, issue date and due date are all required.');
      return;
    }
    const duplicate = data.invoices.some(
      (inv) => inv.studentId === studentId && inv.month === month,
    );
    if (duplicate) {
      setError(`${student.name} already has an invoice for this month.`);
      return;
    }
    const invoice: Invoice = {
      id: `inv-${month}-${studentId}`,
      studentId,
      subject: student.subject,
      month,
      amount: value,
      issueDate,
      dueDate,
      status: 'sent',
      payments: [],
      reminders: [],
    };
    const problem = validateInvoiceAmounts(invoice);
    if (problem !== null) {
      setError(problem);
      return;
    }
    onChange({ ...data, invoices: [...data.invoices, invoice] });
    onClose();
  }

  const student = data.students.find((s) => s.id === studentId);

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="New invoice"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="muted">Step {step} of 3 · New invoice</p>
        <h2>New invoice</h2>
        <form onSubmit={handleSubmit} noValidate>
          {step === 1 && (
            <>
              <Select
                label="Student"
                value={studentId}
                onChange={(e) => changeStudent(e.target.value)}
              >
                {active.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.className}
                  </option>
                ))}
              </Select>
              <label className="form-field">
                <span>Month</span>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn btn-primary" onClick={nextFromStep1}>
                  Continue
                </button>
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button type="button" className="btn btn-ghost" onClick={onAddStudent}>
                  Add New Student
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <AmountInput
                label="Amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/[^0-9.]/g, ''));
                  setAmountEdited(true);
                }}
              />
              <label className="form-field">
                <span>Issue date</span>
                <input type="date" value={issueDate} onChange={(e) => changeIssueDate(e.target.value)} />
              </label>
              <label className="form-field">
                <span>Due date (issue + {dueDays} days)</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    setDueEdited(true);
                  }}
                />
              </label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn btn-primary" onClick={nextFromStep2}>
                  Review
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {step === 3 && student !== undefined && (
            <>
              <div className="receipt-card" style={{ margin: '0 0 12px' }}>
                <div className="receipt-head">
                  <div>
                    <div className="receipt-logo">{student.name}</div>
                    <div className="muted">{monthLabel(month)}</div>
                  </div>
                </div>
                <div className="receipt-rows">
                  <div>
                    <span>Amount</span>
                    <strong>{formatINR(Number(amount) || 0)}</strong>
                  </div>
                  <div>
                    <span>Issue date</span>
                    <span>{formatDate(issueDate)}</span>
                  </div>
                  <div>
                    <span>Due date</span>
                    <span>{formatDate(dueDate)}</span>
                  </div>
                  <div>
                    <span>Status</span>
                    <span>Sent</span>
                  </div>
                </div>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Create invoice
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                  Back
                </button>
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
