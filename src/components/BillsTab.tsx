import { useState, type FormEvent } from 'react';
import { formatDate, formatINR } from '../format';
import type { AppData, Bill } from '../types';

type Props = { data: AppData; onChange: (next: AppData) => void };
type Kind = Bill['kind'];
type Draft = { name: string; amount: string; day: string; date: string };
type Editing = { id: string; kind: Kind } | null;
type Message = { tone: 'error' | 'ok'; text: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === iso;
}

// Validates a draft into a bill body (without id), or returns the error message.
function buildBill(kind: Kind, d: Draft): Omit<Bill, 'id'> | string {
  const name = d.name.trim();
  const amount = Number(d.amount);
  if (!name) return 'Name is required.';
  if (d.amount.trim() === '' || !Number.isFinite(amount) || amount <= 0) {
    return 'Amount must be a number greater than 0.';
  }
  if (kind === 'recurring') {
    const day = Number(d.day);
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      return 'Day of month must be a whole number from 1 to 28.';
    }
    return { name, amount, kind, dayOfMonth: day };
  }
  if (!isValidIsoDate(d.date)) return 'Enter a valid date.';
  return { name, amount, kind, oneTimeDate: d.date };
}

export default function BillsTab({ data, onChange }: Props) {
  const blankDraft = (): Draft => ({ name: '', amount: '', day: '1', date: data.referenceDate });
  const [drafts, setDrafts] = useState<Record<Kind, Draft>>(() => ({
    recurring: blankDraft(),
    'one-time': blankDraft(),
  }));
  const [editing, setEditing] = useState<Editing>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const updateDraft = (kind: Kind, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));

  const resetDraft = (kind: Kind) => setDrafts((prev) => ({ ...prev, [kind]: blankDraft() }));

  const cancelEdit = () => {
    if (editing) resetDraft(editing.kind);
    setEditing(null);
  };

  const startEdit = (bill: Bill) => {
    setEditing({ id: bill.id, kind: bill.kind });
    setDrafts((prev) => ({
      ...prev,
      [bill.kind]: {
        name: bill.name,
        amount: String(bill.amount),
        day: String(bill.dayOfMonth ?? 1),
        date: bill.oneTimeDate ?? data.referenceDate,
      },
    }));
    setMessage(null);
  };

  const save = (kind: Kind, e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const built = buildBill(kind, drafts[kind]);
    if (typeof built === 'string') {
      setMessage({ tone: 'error', text: built });
      return;
    }
    const target = editing?.kind === kind ? editing.id : null;
    const bills = target
      ? data.bills.map((b) => (b.id === target ? { ...built, id: b.id } : b))
      : [...data.bills, { ...built, id: 'bill-' + Date.now().toString(36) }];
    onChange({ ...data, bills });
    if (target) setEditing(null);
    resetDraft(kind);
    setMessage({ tone: 'ok', text: 'Saved' });
  };

  const remove = (id: string) => {
    if (!window.confirm('Delete this bill?')) return;
    if (editing?.id === id) cancelEdit();
    onChange({ ...data, bills: data.bills.filter((b) => b.id !== id) });
    setMessage(null);
  };

  const renderSection = (kind: Kind, title: string) => {
    const bills = data.bills.filter((b) => b.kind === kind);
    const draft = drafts[kind];
    const isRecurring = kind === 'recurring';
    const editingHere = editing?.kind === kind;
    return (
      <div className="card">
        <h3>{title}</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Amount</th>
                <th>{isRecurring ? 'Day of month' : 'Date'}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 && (
                <tr>
                  <td colSpan={4}>No bills yet.</td>
                </tr>
              )}
              {bills.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{formatINR(b.amount)}</td>
                  <td>
                    {isRecurring ? b.dayOfMonth : b.oneTimeDate ? formatDate(b.oneTimeDate) : '—'}
                  </td>
                  <td>
                    <button type="button" className="btn btn-ghost" onClick={() => startEdit(b)}>
                      Edit
                    </button>{' '}
                    <button type="button" className="btn btn-danger" onClick={() => remove(b.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="new-invoice-form" noValidate onSubmit={(e) => save(kind, e)}>
          <label>
            Name
            <input
              value={draft.name}
              onChange={(e) => updateDraft(kind, { name: e.target.value })}
            />
          </label>
          <label>
            Amount (₹)
            <input
              type="number"
              min="0"
              step="any"
              value={draft.amount}
              onChange={(e) => updateDraft(kind, { amount: e.target.value })}
            />
          </label>
          {isRecurring ? (
            <label>
              Day of month
              <input
                type="number"
                min={1}
                max={28}
                step={1}
                value={draft.day}
                onChange={(e) => updateDraft(kind, { day: e.target.value })}
              />
            </label>
          ) : (
            <label>
              Date
              <input
                type="date"
                value={draft.date}
                onChange={(e) => updateDraft(kind, { date: e.target.value })}
              />
            </label>
          )}
          <button type="submit" className="btn btn-primary">
            {editingHere ? 'Save changes' : isRecurring ? 'Add recurring bill' : 'Add one-time bill'}
          </button>
          {editingHere && (
            <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
              Cancel edit
            </button>
          )}
        </form>
      </div>
    );
  };

  return (
    <section>
      <h2>Bills</h2>
      {message && (
        <p className={message.tone === 'error' ? 'form-error' : 'form-ok'}>{message.text}</p>
      )}
      {renderSection('recurring', 'Recurring bills')}
      {renderSection('one-time', 'One-time bills')}
    </section>
  );
}
