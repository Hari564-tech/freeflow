import { useState, type FormEvent } from 'react';
import type { AppData, Student } from '../types';
import { formatINR } from '../format';
import { reliabilityOf } from '../reliability';

type Props = { data: AppData; onChange: (next: AppData) => void; peopleLabel: string };

type Form = {
  name: string;
  className: string;
  subject: string;
  monthlyFee: string;
  parentName: string;
  parentPhone: string;
  billingDay: string;
};

const EMPTY_FORM: Form = {
  name: '',
  className: '',
  subject: '',
  monthlyFee: '',
  parentName: '',
  parentPhone: '',
  billingDay: '5',
};

const FIELDS: { key: keyof Form; label: string; type: string }[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'className', label: 'Class', type: 'text' },
  { key: 'subject', label: 'Subject', type: 'text' },
  { key: 'monthlyFee', label: 'Monthly fee', type: 'number' },
  { key: 'parentName', label: 'Parent or contact name', type: 'text' },
  { key: 'parentPhone', label: 'Parent phone', type: 'tel' },
  { key: 'billingDay', label: 'Billing day (1 to 28)', type: 'number' },
];

export default function StudentsTab({ data, onChange, peopleLabel }: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const singular = peopleLabel === 'Students' ? 'student' : 'customer';
  const addLabel = `Add ${singular}`;
  const shown = showArchived ? data.students : data.students.filter((s) => s.active);

  function openNew(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function openEdit(s: Student): void {
    setEditingId(s.id);
    setForm({
      name: s.name,
      className: s.className,
      subject: s.subject,
      monthlyFee: String(s.monthlyFee),
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      billingDay: String(s.billingDay),
    });
    setError(null);
    setMessage(null);
    setFormOpen(true);
  }

  function closeForm(): void {
    setFormOpen(false);
    setEditingId(null);
    setError(null);
  }

  function setField(key: keyof Form, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setActive(id: string, active: boolean): void {
    const students = data.students.map((s) => (s.id === id ? { ...s, active } : s));
    onChange({ ...data, students });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const name = form.name.trim();
    const monthlyFee = Number(form.monthlyFee);
    const billingDay = Number(form.billingDay);
    const parentPhone = form.parentPhone.replace(/\D/g, '');
    if (name === '') {
      setError('Name is required.');
      return;
    }
    if (!(monthlyFee > 0)) {
      setError('Monthly fee must be more than 0.');
      return;
    }
    if (parentPhone.length < 10) {
      setError('Parent phone needs at least 10 digits.');
      return;
    }
    if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28) {
      setError('Billing day must be between 1 and 28.');
      return;
    }

    const subject = form.subject.trim();
    const fields = {
      name,
      className: form.className.trim(),
      subject,
      monthlyFee,
      parentName: form.parentName.trim(),
      parentPhone,
      billingDay,
      subjects: subject ? [subject] : [],
    };
    const students =
      editingId === null
        ? [...data.students, { ...fields, id: 'stu-' + Date.now().toString(36), active: true }]
        : data.students.map((s) => (s.id === editingId ? { ...s, ...fields } : s));

    onChange({ ...data, students });
    closeForm();
    setMessage(`Saved ${name}.`);
  }

  return (
    <section className="students-tab">
      <div className="section-header">
        <h2>{peopleLabel}</h2>
        <button type="button" className="btn" onClick={openNew}>
          {addLabel}
        </button>
      </div>

      {message && <p className="form-ok">{message}</p>}

      {formOpen && (
        <form className="card" onSubmit={handleSubmit}>
          <h3>{editingId === null ? addLabel : `Edit ${singular}`}</h3>
          {FIELDS.map((f) => (
            <label key={f.key} className="form-field">
              <span>{f.label}</span>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            </label>
          ))}
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn">
              {editingId === null ? 'Save' : 'Save changes'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <label className="toggle">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />{' '}
        Show archived
      </label>

      <table className="students-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Class and subject</th>
            <th>Monthly fee</th>
            <th>Parent or contact</th>
            <th>Phone</th>
            <th>Billing day</th>
            <th>Reliability</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((s) => {
            const rel = reliabilityOf(s.id, data.invoices, data.referenceDate);
            return (
              <tr key={s.id} className={s.active ? undefined : 'archived'}>
                <td>{s.name}</td>
                <td>
                  {s.className} / {s.subject}
                </td>
                <td>{formatINR(s.monthlyFee)}</td>
                <td>{s.parentName || '—'}</td>
                <td>{s.parentPhone}</td>
                <td>{s.billingDay}</td>
                <td>
                  <span className={`badge badge-${rel.tone}`}>{rel.label}</span>
                </td>
                <td>{s.active ? 'Active' : 'Archived'}</td>
                <td>
                  <button type="button" className="btn btn-ghost" onClick={() => openEdit(s)}>
                    Edit
                  </button>{' '}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setActive(s.id, !s.active)}
                  >
                    {s.active ? 'Archive' : 'Restore'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
