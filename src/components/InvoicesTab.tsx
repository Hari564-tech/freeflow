import { Fragment, useState } from 'react';
import type { FormEvent } from 'react';
import type { AppData, Invoice, Payment, PaymentMethod } from '../types';
import { amountPaid, balance, isOverdue } from '../forecast';
import { formatDate, formatINR } from '../format';

type Props = {
  data: AppData;
  onChange: (next: AppData) => void;
};

type DisplayStatus = 'paid' | 'overdue' | 'draft' | 'sent';

const STATUS_LABEL: Record<DisplayStatus, string> = {
  paid: 'Paid',
  overdue: 'Overdue',
  draft: 'Draft',
  sent: 'Sent',
};

const METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Bank'];

const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

// 'YYYY-MM' -> 'Nov 2026'
function monthLabel(ym: string): string {
  return monthFormatter.format(new Date(`${ym}-01T00:00:00Z`));
}

// Status is derived: paid when nothing is owed, overdue when past due and unpaid,
// otherwise the stored draft/sent status.
function displayStatus(inv: Invoice, referenceDate: string): DisplayStatus {
  if (balance(inv) === 0) {
    return 'paid';
  }
  if (isOverdue(inv, referenceDate)) {
    return 'overdue';
  }
  return inv.status === 'draft' ? 'draft' : 'sent';
}

// Immutable update of a single invoice inside AppData.
function updateInvoice(
  data: AppData,
  id: string,
  update: (inv: Invoice) => Invoice,
): AppData {
  return {
    ...data,
    invoices: data.invoices.map((inv) => (inv.id === id ? update(inv) : inv)),
  };
}

type RecordPaymentFormProps = {
  invoice: Invoice;
  referenceDate: string;
  onRecord: (payment: Payment) => void;
};

function RecordPaymentForm({ invoice, referenceDate, onRecord }: RecordPaymentFormProps) {
  const due = balance(invoice);
  const [amount, setAmount] = useState<string>(String(due));
  const [date, setDate] = useState<string>(referenceDate);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (value > due) {
      setError(`Amount cannot be more than the balance of ${formatINR(due)}.`);
      return;
    }
    if (!date) {
      setError('Pick a payment date.');
      return;
    }
    setError(null);
    onRecord({ amount: value, date, method });
  }

  return (
    <form className="record-payment-form" onSubmit={handleSubmit}>
      <label>
        Amount
        <input
          type="number"
          step="any"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label>
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        Method
        <select
          value={method}
          onChange={(e) => {
            const next = METHODS.find((m) => m === e.target.value);
            if (next) {
              setMethod(next);
            }
          }}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">Record payment</button>
      {error !== null && <p className="form-error">{error}</p>}
    </form>
  );
}

type NewInvoiceFormProps = {
  data: AppData;
  onAdd: (invoice: Invoice) => void;
  onCancel: () => void;
};

function NewInvoiceForm({ data, onAdd, onCancel }: NewInvoiceFormProps) {
  const firstStudent = data.students[0];
  const [studentId, setStudentId] = useState<string>(firstStudent ? firstStudent.id : '');
  const [month, setMonth] = useState<string>(data.referenceDate.slice(0, 7));
  const [amount, setAmount] = useState<string>(firstStudent ? String(firstStudent.monthlyFee) : '');
  const [issueDate, setIssueDate] = useState<string>(data.referenceDate);
  const [dueDate, setDueDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  function handleStudentChange(id: string) {
    setStudentId(id);
    const student = data.students.find((s) => s.id === id);
    if (student) {
      setAmount(String(student.monthlyFee));
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const student = data.students.find((s) => s.id === studentId);
    if (!student) {
      setError('Choose a student.');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      setError('Month must be in YYYY-MM form.');
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!issueDate) {
      setError('Pick an issue date.');
      return;
    }
    if (!dueDate) {
      setError('Pick a due date.');
      return;
    }
    setError(null);
    onAdd({
      id: 'inv-' + Date.now().toString(36),
      studentId: student.id,
      subject: student.subject,
      month,
      amount: value,
      issueDate,
      dueDate,
      status: 'draft',
      payments: [],
      reminders: [],
    });
  }

  if (data.students.length === 0) {
    return (
      <div className="new-invoice-form">
        <p>Add students first, then create an invoice.</p>
        <button type="button" onClick={onCancel}>Close</button>
      </div>
    );
  }

  return (
    <form className="new-invoice-form" onSubmit={handleSubmit}>
      <label>
        Student
        <select value={studentId} onChange={(e) => handleStudentChange(e.target.value)}>
          {data.students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Month
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </label>
      <label>
        Amount
        <input
          type="number"
          step="any"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label>
        Issue date
        <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
      </label>
      <label>
        Due date
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </label>
      <button type="submit">Create invoice</button>
      <button type="button" onClick={onCancel}>Cancel</button>
      {error !== null && <p className="form-error">{error}</p>}
    </form>
  );
}

export default function InvoicesTab({ data, onChange }: Props) {
  const [showNewForm, setShowNewForm] = useState<boolean>(false);
  const ref = data.referenceDate;

  function markSent(id: string) {
    onChange(updateInvoice(data, id, (inv) => ({ ...inv, status: 'sent' })));
  }

  function recordPayment(id: string, payment: Payment) {
    onChange(
      updateInvoice(data, id, (inv) => {
        const withPayment: Invoice = { ...inv, payments: [...inv.payments, payment] };
        return {
          ...withPayment,
          status: amountPaid(withPayment) >= inv.amount ? 'paid' : inv.status,
        };
      }),
    );
  }

  function addInvoice(invoice: Invoice) {
    onChange({ ...data, invoices: [...data.invoices, invoice] });
    setShowNewForm(false);
  }

  return (
    <div className="invoices-tab">
      <div className="tab-header">
        <h2>Invoices</h2>
        <button type="button" onClick={() => setShowNewForm((open) => !open)}>
          {showNewForm ? 'Hide form' : 'New invoice'}
        </button>
      </div>

      {showNewForm && (
        <NewInvoiceForm
          data={data}
          onAdd={addInvoice}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      <table className="invoices-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Class</th>
            <th>Month</th>
            <th>Amount</th>
            <th>Issued</th>
            <th>Due</th>
            <th>Paid so far</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {data.invoices.length === 0 && (
            <tr>
              <td colSpan={10}>No invoices yet.</td>
            </tr>
          )}
          {data.invoices.map((inv) => {
            const student = data.students.find((s) => s.id === inv.studentId);
            const owed = balance(inv);
            const status = displayStatus(inv, ref);
            return (
              <Fragment key={inv.id}>
                <tr>
                  <td>{student ? student.name : inv.studentId}</td>
                  <td>{student ? student.className : '-'}</td>
                  <td>{monthLabel(inv.month)}</td>
                  <td>{formatINR(inv.amount)}</td>
                  <td>{formatDate(inv.issueDate)}</td>
                  <td>{formatDate(inv.dueDate)}</td>
                  <td>{formatINR(amountPaid(inv))}</td>
                  <td>{formatINR(owed)}</td>
                  <td>
                    <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
                  </td>
                  <td>
                    {inv.status === 'draft' && owed > 0 && (
                      <button type="button" onClick={() => markSent(inv.id)}>
                        Mark sent
                      </button>
                    )}
                  </td>
                </tr>
                {owed > 0 && (
                  <tr className="payment-row">
                    <td colSpan={10}>
                      <RecordPaymentForm
                        invoice={inv}
                        referenceDate={ref}
                        onRecord={(payment) => recordPayment(inv.id, payment)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
