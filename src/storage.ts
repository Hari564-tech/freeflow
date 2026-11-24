import type { AppData, AppState, Bill, Student, TemplateId } from './types';
import { seedData, seedTemplates } from './data';

export const STORAGE_KEY = 'feeflow_v2_state';
export const LEGACY_STORAGE_KEY = 'feeflow-data-v1';

const TEMPLATE_IDS: TemplateId[] = ['tutor', 'designer', 'salon'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTemplateId(value: unknown): value is TemplateId {
  return value === 'tutor' || value === 'designer' || value === 'salon';
}

// A v1 AppData (Level 1) or v2 AppData: students/invoices/bills arrays.
function isAppDataLike(value: unknown): value is AppData {
  return (
    isRecord(value) &&
    (value.version === 1 || value.version === 2) &&
    Array.isArray(value.students) &&
    Array.isArray(value.invoices) &&
    Array.isArray(value.bills)
  );
}

function isAppState(value: unknown): value is AppState {
  if (!isRecord(value) || value.version !== 2) {
    return false;
  }
  if (!isTemplateId(value.activeTemplateId)) {
    return false;
  }
  if (!isRecord(value.templates)) {
    return false;
  }
  for (const id of TEMPLATE_IDS) {
    if (!isAppDataLike(value.templates[id])) {
      return false;
    }
  }
  return (
    isRecord(value.reminders) &&
    isRecord(value.snoozedAlerts) &&
    Array.isArray(value.dismissedAlerts) &&
    // tone and dueDays may be missing in older saves; loadState fills them.
    (value.tone === undefined ||
      value.tone === 'Polite' ||
      value.tone === 'Friendly' ||
      value.tone === 'Firm')
  );
}

// Fill fields added after a state was first saved.
function withDefaults(state: AppState): AppState {
  const loose: Partial<AppState> = state;
  return {
    ...state,
    tone: loose.tone ?? 'Polite',
    dueDays: typeof loose.dueDays === 'number' ? loose.dueDays : 5,
    promisedDates: loose.promisedDates ?? {},
    paidBills: loose.paidBills ?? {},
  };
}

function seedState(): AppState {
  return {
    version: 2,
    activeTemplateId: 'tutor',
    templates: seedTemplates(),
    reminders: {},
    snoozedAlerts: {},
    dismissedAlerts: [],
    tone: 'Polite',
    dueDays: 5,
    promisedDates: {},
    paidBills: {},
  };
}

// Level 1 stored one template under 'feeflow-data-v1'. Migrate it into the
// tutor template so a returning user keeps their edits; designer/salon seed fresh.
function migrateV1ToState(v1: AppData): AppState {
  const fresh = seedTemplates();
  // Old saves lack the v2 fields; fill them with defaults, keep every
  // value the user actually stored.
  const students: Student[] = v1.students.map((s) => {
    const old = s as unknown as Partial<Student>;
    return {
      id: s.id,
      name: s.name,
      className: s.className,
      subject: s.subject,
      monthlyFee: s.monthlyFee,
      parentName: old.parentName ?? '',
      parentPhone: old.parentPhone ?? '',
      billingDay: old.billingDay ?? 5,
      subjects: old.subjects ?? [s.subject],
      active: old.active ?? true,
    };
  });
  const bills: Bill[] = v1.bills.map((b) => {
    const old = b as unknown as Partial<Bill>;
    const bill: Bill = {
      id: b.id,
      name: b.name,
      amount: b.amount,
      kind: old.kind ?? (b.oneTimeDate !== undefined ? 'one-time' : 'recurring'),
    };
    if (b.dayOfMonth !== undefined) {
      bill.dayOfMonth = b.dayOfMonth;
    }
    if (b.oneTimeDate !== undefined) {
      bill.oneTimeDate = b.oneTimeDate;
    }
    return bill;
  });
  const tutor: AppData = {
    version: 2,
    referenceDate: v1.referenceDate,
    openingCash: v1.openingCash,
    safetyBuffer: v1.safetyBuffer,
    business: fresh.tutor.business,
    students,
    invoices: v1.invoices,
    bills,
  };
  return {
    version: 2,
    activeTemplateId: 'tutor',
    templates: { ...fresh, tutor },
    reminders: {},
    snoozedAlerts: {},
    dismissedAlerts: [],
    tone: 'Polite',
    dueDays: 5,
    promisedDates: {},
    paidBills: {},
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (isAppState(parsed)) {
        return withDefaults(parsed);
      }
    }
    // No v2 state: migrate a Level 1 save if one exists.
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw !== null) {
      const legacy: unknown = JSON.parse(legacyRaw);
      if (isAppDataLike(legacy)) {
        const migrated = migrateV1ToState(legacy);
        saveState(migrated);
        return migrated;
      }
    }
  } catch {
    // localStorage unavailable or JSON invalid: fall through to seed data.
  }
  return seedState();
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (quota, privacy mode): nothing else to do.
  }
}

export function resetState(): AppState {
  const state = seedState();
  saveState(state);
  return state;
}

// Backwards-compatible wrappers: operate on the active template so the
// Level 1 tabs keep working unchanged until they are rewritten.
export function loadData(): AppData {
  const state = loadState();
  return state.templates[state.activeTemplateId];
}

export function saveData(data: AppData): void {
  const state = loadState();
  saveState({ ...state, templates: { ...state.templates, [state.activeTemplateId]: data } });
}

export function resetData(): AppData {
  return resetState().templates.tutor;
}

// Kept for callers that used the Level 1 seed directly.
export { seedData };
