import type { AppData } from './types';
import { seedData } from './data';

export const STORAGE_KEY = 'feeflow-data-v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAppData(value: unknown): value is AppData {
  return (
    isRecord(value) &&
    value.version === 1 &&
    Array.isArray(value.students) &&
    Array.isArray(value.invoices) &&
    Array.isArray(value.bills)
  );
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return seedData();
    }
    const parsed: unknown = JSON.parse(raw);
    return isAppData(parsed) ? parsed : seedData();
  } catch {
    // localStorage unavailable or JSON invalid: fall back to seed data.
    return seedData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (quota, privacy mode): nothing else to do.
  }
}

export function resetData(): AppData {
  const data = seedData();
  saveData(data);
  return data;
}
