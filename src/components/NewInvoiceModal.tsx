import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AppData, Invoice } from '../types';
import { addDays } from '../format';
import { validateInvoiceAmounts } from '../data';
import { useFocusTrap } from '../useFocusTrap';

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

export default function NewInvoiceModal({
  data,
  onChange,
  onClose,
  onAddStudent,
  dueDays,
}: Props) {
  const active = data.students.filter((s) => s.active);
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

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="New invoice"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>New invoice</h2>
        <form onSubmit={handleSubmit} noValidate>
          <label className="form-field">
            <span>Student</span>
            <select value={studentId} onChange={(e) => changeStudent(e.target.value)}>
              {active.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.className}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Month</span>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Amount</span>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setAmountEdited(true);
              }}
            />
          </label>
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
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn">
              Create invoice
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-ghost" onClick={onAddStudent}>
              Add New Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
