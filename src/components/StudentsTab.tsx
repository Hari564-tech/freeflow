import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Pencil, Plus, Search, UserPlus } from 'lucide-react';
import type { AppData, Student } from '../types';
import { balance, isOverdue } from '../forecast';
import { diffDays, formatINR } from '../format';
import { reliabilityOf } from '../reliability';
import { useFocusTrap } from '../useFocusTrap';
import { Avatar, Chip, EmptyState, SegmentedControl, SkeletonRow, StatusPill, toast } from './ui';

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

type Filter = 'all' | 'paid' | 'due' | 'overdue';

const EMPTY_FORM: Form = {
  name: '',
  className: '',
  subject: '',
  monthlyFee: '',
  parentName: '',
  parentPhone: '',
  billingDay: '5',
};

const FIELDS: { key: keyof Form; label: string; type: string; inputMode?: 'numeric' | 'tel' | 'decimal' }[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'className', label: 'Class', type: 'text' },
  { key: 'subject', label: 'Subject', type: 'text' },
  { key: 'monthlyFee', label: 'Monthly fee', type: 'text', inputMode: 'decimal' },
  { key: 'parentName', label: 'Parent or contact name', type: 'text' },
  { key: 'parentPhone', label: 'Parent phone', type: 'tel', inputMode: 'tel' },
  { key: 'billingDay', label: 'Billing day (1 to 28)', type: 'text', inputMode: 'numeric' },
];

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'due', label: 'Due soon' },
  { value: 'overdue', label: 'Overdue' },
];

const REL_TONE: Record<'good' | 'warn' | 'bad', 'success' | 'warning' | 'danger'> = {
  good: 'success',
  warn: 'warning',
  bad: 'danger',
};

export default function StudentsTab({ data, onChange, peopleLabel }: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef, formOpen);

  // Brief loading skeleton on first mount (data is local, so this is short).
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(t);
  }, []);

  // Search from the App top bar: localStorage (set before navigation) + live event.
  useEffect(() => {
    const pending = window.localStorage.getItem('feeflow_search');
    if (pending !== null) {
      window.localStorage.removeItem('feeflow_search');
      setSearch(pending);
    }
    if (window.localStorage.getItem('feeflow_open_add') === '1') {
      window.localStorage.removeItem('feeflow_open_add');
      setFormOpen(true);
    }
    const onSearch = (e: Event): void => {
      setSearch((e as CustomEvent<string>).detail ?? '');
    };
    window.addEventListener('feeflow-search', onSearch);
    return () => window.removeEventListener('feeflow-search', onSearch);
  }, []);

  // Scroll lock + Escape while the add/edit sheet is open.
  useEffect(() => {
    if (!formOpen) {
      return undefined;
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        closeForm();
      }
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen]);

  const singular = peopleLabel === 'Students' ? 'student' : 'customer';
  const addLabel = `Add ${singular}`;
  const shown = showArchived ? data.students : data.students.filter((s) => s.active);

  // Per-student payment status, derived live from invoices.
  function studentStatus(s: Student): { status: 'paid' | 'due' | 'overdue'; owed: number; days: number } {
    const mine = data.invoices.filter((inv) => inv.studentId === s.id && balance(inv) > 0);
    const owed = mine.reduce((sum, inv) => sum + balance(inv), 0);
    if (mine.length === 0) {
      return { status: 'paid', owed: 0, days: 0 };
    }
    const earliest = mine.reduce((a, inv) => (inv.dueDate < a ? inv.dueDate : a), mine[0].dueDate);
    const days = diffDays(earliest, data.referenceDate);
    if (mine.some((inv) => isOverdue(inv, data.referenceDate))) {
      return { status: 'overdue', owed, days };
    }
    return { status: 'due', owed, days };
  }

  const needle = search.trim().toLowerCase();
  const filtered = shown.filter((s) => {
    if (needle !== '' && !`${s.name} ${s.className} ${s.subject}`.toLowerCase().includes(needle)) {
      return false;
    }
    if (filter === 'all') {
      return true;
    }
    return studentStatus(s).status === filter;
  });

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
    toast(active ? 'Student restored.' : 'Student archived.', {
      label: 'Undo',
      onAction: () => onChange({ ...data, students: data.students }),
    });
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
    toast(`Saved ${name}.`);
  }

  return (
    <section className="students-tab">
      <div className="section-header">
        <h2>{peopleLabel}</h2>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          <Plus size={18} aria-hidden="true" /> {addLabel}
        </button>
      </div>

      <div className="students-toolbar">
        <label className="search-input">
          <Search aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by name, class or subject"
            aria-label="Search students"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} label="Filter students by payment status" />
      </div>

      {message && <p className="form-ok">{message}</p>}

      <label className="toggle">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />{' '}
        Show archived
      </label>

      {loading ? (
        <div aria-label="Loading students">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UserPlus aria-hidden="true" />}
          title={needle !== '' || filter !== 'all' ? 'No students match' : `No ${peopleLabel.toLowerCase()} yet`}
          body={needle !== '' || filter !== 'all' ? 'Try a different search or filter.' : 'Add your first student to start tracking fees.'}
          action={
            <button type="button" className="btn btn-primary" onClick={openNew}>
              <Plus size={18} aria-hidden="true" /> {addLabel}
            </button>
          }
        />
      ) : (
        <>
          {/* Mobile: cards with status-ring avatar + status pill */}
          <ul className="student-cards stagger">
            {filtered.map((s, i) => {
              const st = studentStatus(s);
              const rel = reliabilityOf(s.id, data.invoices, data.referenceDate);
              return (
                <li key={s.id} className="student-card">
                  <Avatar name={s.name} index={i} ring={st.status === 'paid' ? 'paid' : st.status} />
                  <div className="student-card-main">
                    <div className="student-card-name">{s.name}</div>
                    <div className="student-card-sub">
                      {s.className} · {s.subject} · {s.parentName || 'No contact'}
                    </div>
                    <div className="student-card-meta">
                      <span className="student-card-amount">{formatINR(s.monthlyFee)}/mo</span>
                      <StatusPill status={st.status} label={st.status === 'paid' ? 'Paid' : st.status === 'overdue' ? `Overdue ${st.days}d` : `Due in ${-st.days}d`} />
                      <Chip tone={REL_TONE[rel.tone]}>{rel.label}</Chip>
                    </div>
                    <div className="student-card-meta">
                      <span className="muted">{s.active ? 'Active' : 'Archived'} · Due day {s.billingDay}</span>
                    </div>
                  </div>
                  <div className="student-card-actions">
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>
                      <Pencil size={15} aria-hidden="true" /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setActive(s.id, !s.active)}
                    >
                      {s.active ? 'Archive' : 'Restore'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop: table */}
          <div className="table-wrap students-table-wrap">
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
                {filtered.map((s, i) => {
                  const rel = reliabilityOf(s.id, data.invoices, data.referenceDate);
                  const st = studentStatus(s);
                  return (
                    <tr key={s.id} className={s.active ? undefined : 'archived'}>
                      <td>
                        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          <Avatar name={s.name} index={i} ring={st.status === 'paid' ? 'paid' : st.status} />
                          {s.name}
                        </span>
                      </td>
                      <td>
                        {s.className} / {s.subject}
                      </td>
                      <td>{formatINR(s.monthlyFee)}</td>
                      <td>{s.parentName || '—'}</td>
                      <td>{s.parentPhone}</td>
                      <td>{s.billingDay}</td>
                      <td>
                        <Chip tone={REL_TONE[rel.tone]}>{rel.label}</Chip>
                      </td>
                      <td>
                        <StatusPill status={st.status} />
                      </td>
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
          </div>
        </>
      )}

      {formOpen && (
        <>
          <div className="add-sheet-overlay" onClick={closeForm} />
          <div
            className="add-sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={editingId === null ? addLabel : `Edit ${singular}`}
          >
            <form noValidate onSubmit={handleSubmit}>
              <h3>{editingId === null ? addLabel : `Edit ${singular}`}</h3>
              {FIELDS.map((f, idx) => (
                <label key={f.key} className="form-field">
                  <span>{f.label}</span>
                  <input
                    type={f.type}
                    inputMode={f.inputMode}
                    value={form[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                    autoFocus={idx === 0}
                  />
                </label>
              ))}
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingId === null ? 'Save' : 'Save changes'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </section>
  );
}
