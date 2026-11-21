const DAY_MS = 24 * 60 * 60 * 1000;

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

// Parse an ISO 'YYYY-MM-DD' string as midnight UTC (avoids timezone shifts).
function toUtcMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function formatINR(n: number): string {
  return inrFormatter.format(n);
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(toUtcMs(iso)));
}

export function addDays(iso: string, n: number): string {
  return new Date(toUtcMs(iso) + n * DAY_MS).toISOString().slice(0, 10);
}

// Days from a to b (b minus a).
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}
