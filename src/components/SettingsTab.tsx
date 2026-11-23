import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { AppData, AppState, BusinessProfile, ReminderTone, TemplateId } from '../types';

type Props = {
  data: AppData;
  onChange: (next: AppData) => void;
  state: AppState;
  onStateChange: (next: AppState) => void;
  onReset: () => void;
};

type Message = { kind: 'ok' | 'error'; text: string } | null;

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'tutor', label: 'Home Tutor' },
  { id: 'designer', label: 'Freelance Designer' },
  { id: 'salon', label: 'Neighbourhood Salon' },
];
const TEMPLATE_IDS: TemplateId[] = ['tutor', 'designer', 'salon'];
const TONES: ReminderTone[] = ['Polite', 'Friendly', 'Firm'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && (TEMPLATE_IDS as string[]).includes(value);
}

function isTone(value: unknown): value is ReminderTone {
  return typeof value === 'string' && (TONES as string[]).includes(value);
}

type ImportResult = { ok: true; state: AppState } | { ok: false; reason: string };

const fail = (reason: string): ImportResult => ({ ok: false, reason });

// Checks the shape of an imported state file before it replaces anything.
function parseImport(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('the file is not valid JSON.');
  }
  if (!isRecord(raw)) {
    return fail('the file does not contain a state object.');
  }
  if (raw.version !== 2) {
    return fail('version must be 2.');
  }
  const templates = raw.templates;
  if (!isRecord(templates)) {
    return fail('templates is missing.');
  }
  for (const id of TEMPLATE_IDS) {
    const t = templates[id];
    if (
      !isRecord(t) ||
      !isRecord(t.business) ||
      !Array.isArray(t.students) ||
      !Array.isArray(t.invoices) ||
      !Array.isArray(t.bills)
    ) {
      return fail(`template "${id}" is incomplete.`);
    }
  }
  if (!isTemplateId(raw.activeTemplateId)) {
    return fail('activeTemplateId is not a known template.');
  }
  if (!isRecord(raw.reminders)) {
    return fail('reminders must be an object.');
  }
  if (!isRecord(raw.snoozedAlerts)) {
    return fail('snoozedAlerts must be an object.');
  }
  if (!Array.isArray(raw.dismissedAlerts)) {
    return fail('dismissedAlerts must be an array.');
  }
  if (!isTone(raw.tone)) {
    return fail('tone must be Polite, Friendly or Firm.');
  }
  // Shapes were checked above; the remaining fields are kept as stored.
  return {
    ok: true,
    state: {
      version: 2,
      activeTemplateId: raw.activeTemplateId,
      templates: templates as unknown as Record<TemplateId, AppData>,
      reminders: raw.reminders as Record<string, string>,
      snoozedAlerts: raw.snoozedAlerts as Record<string, string>,
      dismissedAlerts: raw.dismissedAlerts as string[],
      tone: raw.tone,
      dueDays: typeof raw.dueDays === 'number' ? raw.dueDays : 5,
    },
  };
}

type ProfileCardProps = {
  state: AppState;
  onStateChange: (next: AppState) => void;
};

function ProfileCard({ state, onStateChange }: ProfileCardProps) {
  const saved = state.templates[state.activeTemplateId].business;
  const [form, setForm] = useState<BusinessProfile>(saved);
  const [message, setMessage] = useState<Message>(null);

  function update(field: keyof BusinessProfile, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  }

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const businessName = form.businessName.trim();
    const ownerName = form.ownerName.trim();
    const upiId = form.upiId.trim();
    if (businessName === '') {
      setMessage({ kind: 'error', text: 'Business name is required.' });
      return;
    }
    if (ownerName === '') {
      setMessage({ kind: 'error', text: 'Owner name is required.' });
      return;
    }
    if (upiId === '' || !upiId.includes('@')) {
      setMessage({ kind: 'error', text: 'UPI id is required and must contain “@”.' });
      return;
    }
    const next: BusinessProfile = {
      businessName,
      ownerName,
      tagline: form.tagline.trim(),
      upiId,
      phone: form.phone.trim(),
    };
    const active = state.templates[state.activeTemplateId];
    onStateChange({
      ...state,
      templates: { ...state.templates, [state.activeTemplateId]: { ...active, business: next } },
    });
    setMessage({ kind: 'ok', text: 'Saved' });
  }

  return (
    <div className="card">
      <h3>Business profile</h3>
      <form noValidate onSubmit={save}>
        <label>
          Business name
          <input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} />
        </label>
        <label>
          Owner name
          <input value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)} />
        </label>
        <label>
          Tagline (optional)
          <input value={form.tagline} onChange={(e) => update('tagline', e.target.value)} />
        </label>
        <label>
          UPI id
          <input value={form.upiId} onChange={(e) => update('upiId', e.target.value)} />
        </label>
        <label>
          Phone (optional)
          <input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary">Save profile</button>
        {message && <p className={message.kind === 'ok' ? 'form-ok' : 'form-error'}>{message.text}</p>}
      </form>
    </div>
  );
}

type DueDaysCardProps = {
  state: AppState;
  onStateChange: (next: AppState) => void;
};

function DueDaysCard({ state, onStateChange }: DueDaysCardProps) {
  const [value, setValue] = useState<string>(String(state.dueDays));
  const [message, setMessage] = useState<Message>(null);

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = Number(value);
    if (value.trim() === '' || !Number.isInteger(n) || n < 1 || n > 60) {
      setMessage({ kind: 'error', text: 'Enter a whole number from 1 to 60.' });
      return;
    }
    onStateChange({ ...state, dueDays: n });
    setMessage({ kind: 'ok', text: 'Saved' });
  }

  return (
    <div className="card">
      <h3>Due days</h3>
      <form noValidate onSubmit={save}>
        <label>
          Default days from issue to due date
          <input
            type="number"
            min={1}
            max={60}
            step={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setMessage(null);
            }}
          />
        </label>
        <button type="submit" className="btn btn-primary">Save due days</button>
        {message && <p className={message.kind === 'ok' ? 'form-ok' : 'form-error'}>{message.text}</p>}
      </form>
    </div>
  );
}

type DataCardProps = {
  state: AppState;
  onStateChange: (next: AppState) => void;
  onImported: () => void;
  onReset: () => void;
};

function DataCard({ state, onStateChange, onImported, onReset }: DataCardProps) {
  const [message, setMessage] = useState<Message>(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'feeflow-state.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = parseImport(text);
      if (result.ok) {
        onStateChange(result.state);
        onImported();
        setMessage({ kind: 'ok', text: 'Imported.' });
      } else {
        setMessage({ kind: 'error', text: `Import failed: ${result.reason}` });
      }
    };
    reader.onerror = () => setMessage({ kind: 'error', text: 'Import failed: the file could not be read.' });
    reader.readAsText(file);
  }

  function confirmReset() {
    if (window.confirm('Reset all templates to the demo data? This cannot be undone.')) {
      onReset();
    }
  }

  return (
    <div className="card">
      <h3>Data</h3>
      <div>
        <button type="button" className="btn" onClick={exportJson}>Export JSON</button>
      </div>
      <label>
        Import JSON
        <input type="file" accept=".json" onChange={handleFile} />
      </label>
      {message && <p className={message.kind === 'ok' ? 'form-ok' : 'form-error'}>{message.text}</p>}
      <div>
        <button type="button" className="btn btn-danger" onClick={confirmReset}>Reset demo data</button>
      </div>
    </div>
  );
}

export default function SettingsTab(props: Props) {
  const { state, onStateChange, onReset } = props;
  // Bumped on import/reset so the forms re-read their values from state.
  const [epoch, setEpoch] = useState(0);

  function switchTemplate(id: TemplateId) {
    onStateChange({ ...state, activeTemplateId: id });
  }

  function handleReset() {
    setEpoch((n) => n + 1);
    onReset();
  }

  const activeBusiness = state.templates[state.activeTemplateId].business;

  return (
    <section className="settings-tab">
      <h2>Settings</h2>

      <ProfileCard key={`${state.activeTemplateId}-${epoch}`} state={state} onStateChange={onStateChange} />

      <div className="card">
        <h3>Template</h3>
        <div>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === state.activeTemplateId ? 'btn btn-primary' : 'btn'}
              onClick={() => switchTemplate(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p>Active business: {activeBusiness.businessName}</p>
      </div>

      <DueDaysCard key={`due-${epoch}`} state={state} onStateChange={onStateChange} />

      <DataCard
        state={state}
        onStateChange={onStateChange}
        onImported={() => setEpoch((n) => n + 1)}
        onReset={handleReset}
      />

      <p className="calc-note">Local-first: 100% stored in your browser. Nothing is sent to a server.</p>
    </section>
  );
}
