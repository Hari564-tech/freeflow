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

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
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

// ISO timestamp -> '21 Nov, 1:05 PM' in Asia/Kolkata. Empty string if it does not parse.
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const parts = dateTimeFormatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  const dayPeriod = pick('dayPeriod').toUpperCase();
  return `${pick('day')} ${pick('month')}, ${pick('hour')}:${pick('minute')} ${dayPeriod}`.trim();
}

export function addDays(iso: string, n: number): string {
  return new Date(toUtcMs(iso) + n * DAY_MS).toISOString().slice(0, 10);
}

// Days from a to b (b minus a).
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}
