import { useState } from 'react';
import type { AppData, AppState, Invoice, ReminderTone, Student } from '../types';
import { Chip, SegmentedControl, WhatsAppBubble } from './ui';
import {
  balance,
  buildForecast,
  compareForecasts,
  isOverdue,
  type Scenario,
} from '../forecast';
import { addDays, diffDays, formatDate, formatDateTime, formatINR } from '../format';
import { buildReminderMessage, toneForDaysOverdue, waLink } from '../reminders';
import { monthLabel } from '../qr';
import { navigate } from '../router';

type Props = {
  data: AppData;
  state: AppState;
  onStateChange: (next: AppState) => void;
};

type Category = 'Overdue' | 'Due Soon' | 'Cash Buffer Risk' | 'Upcoming Large Expenses';
type Tone = 'danger' | 'warn' | 'ok' | 'info';

const TODAY_CATEGORIES: Category[] = ['Overdue', 'Cash Buffer Risk'];
const WEEK_CATEGORIES: Category[] = ['Due Soon', 'Upcoming Large Expenses'];
const TONES: ReminderTone[] = ['Polite', 'Friendly', 'Firm'];

const BASE: Scenario = {
  vikramLate: false,
  decLate: false,
  delayDays: 0,
  loseTopStudent: false,
  unexpectedExpense: 0,
  overdueUnpaid: false,
};

// The selected tone escalates with days overdue: one step firmer at 8 days,
// Firm after 21 days.
function effectiveTone(days: number, base: ReminderTone): ReminderTone {
  const level = toneForDaysOverdue(days);
  if (level === 'final') {
    return 'Firm';
  }
  if (level === 'firm') {
    return base === 'Polite' ? 'Friendly' : 'Firm';
  }
  return base;
}

// Copy text via the async clipboard API, falling back to execCommand.
async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path
    }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  return ok;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState<boolean>(false);

  async function handleClick() {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button type="button" className="btn btn-sm" onClick={handleClick}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

type AlertItem = {
  key: string;
  category: Category;
  tone: Tone;
  title: string;
  detail: string;
  action: string;
  invoice?: Invoice;
  student?: Student;
  chase?: boolean;
};

// Next occurrence of a recurring bill on or after the reference date.
function nextRecurringDate(dayOfMonth: number, referenceDate: string): string {
  const [y, m] = referenceDate.split('-').map(Number);
  const day = String(dayOfMonth).padStart(2, '0');
  const thisMonth = `${y}-${String(m).padStart(2, '0')}-${day}`;
  if (thisMonth >= referenceDate) {
    return thisMonth;
  }
  const next = m === 12 ? [y + 1, 1] : [y, m + 1];
  return `${next[0]}-${String(next[1]).padStart(2, '0')}-${day}`;
}

export default function AlertsTab({ data, state, onStateChange }: Props) {
  const ref = data.referenceDate;
  const unpaid = data.invoices.filter((inv) => balance(inv) > 0);
  const overdue = unpaid.filter((inv) => isOverdue(inv, ref));
  const dueSoon = unpaid.filter((inv) => {
    if (isOverdue(inv, ref)) {
      return false;
    }
    const days = diffDays(ref, inv.dueDate);
    return days >= 0 && days <= 7;
  });

  const alerts: AlertItem[] = [];

  for (const inv of overdue) {
    const student = data.students.find((s) => s.id === inv.studentId);
    const days = diffDays(inv.dueDate, ref);
    alerts.push({
      key: `overdue-${inv.id}`,
      category: 'Overdue',
      tone: 'danger',
      title: `${student?.name ?? inv.studentId}: ${formatINR(balance(inv))} overdue ${days} days`,
      detail: `Invoice for ${monthLabel(inv.month)} was due on ${formatDate(inv.dueDate)}.`,
      action: 'Chase this invoice today',
      invoice: inv,
      student,
    });
  }

  for (const inv of dueSoon) {
    const student = data.students.find((s) => s.id === inv.studentId);
    const days = diffDays(ref, inv.dueDate);
    alerts.push({
      key: `duesoon-${inv.id}`,
      category: 'Due Soon',
      tone: 'warn',
      title: `${student?.name ?? inv.studentId}: ${formatINR(balance(inv))} due in ${days} days`,
      detail: `Invoice for ${monthLabel(inv.month)} is due on ${formatDate(inv.dueDate)}.`,
      action: 'Send a friendly due-date reminder',
      invoice: inv,
      student,
    });
  }

  // Cash buffer risk: the base forecast and the overdue-unpaid scenario.
  const base30 = buildForecast(data, 30, BASE);
  if (base30.minBalance < data.safetyBuffer) {
    alerts.push({
      key: 'cash-below-buffer',
      category: 'Cash Buffer Risk',
      tone: 'danger',
      title: `Cash dips below the ${formatINR(data.safetyBuffer)} buffer`,
      detail: `Lowest projected balance is ${formatINR(base30.minBalance)} on ${formatDate(base30.minBalanceDate)} (next 30 days).`,
      action: `Ask for the overdue fees or delay non-urgent spending before ${formatDate(base30.minBalanceDate)}`,
    });
  }
  const scen30 = buildForecast(data, 30, { ...BASE, overdueUnpaid: true });
  const cmp = compareForecasts(base30, scen30);
  if (cmp.scenLowest < data.safetyBuffer) {
    const names = overdue
      .map((inv) => data.students.find((s) => s.id === inv.studentId)?.name.split(' ')[0])
      .filter((n): n is string => n !== undefined);
    const who = names.length > 0 ? names.join(' and ') : 'the overdue students';
    alerts.push({
      key: 'chase-ananya-vikram',
      category: 'Cash Buffer Risk',
      tone: 'danger',
      title: `Chase ${who} before ${formatDate(cmp.breachDate ?? base30.minBalanceDate)}`,
      detail: `If their Nov fees are still unpaid on rent day, the balance falls to ${formatINR(cmp.scenLowest)} on ${formatDate(cmp.breachDate ?? base30.minBalanceDate)} — ${formatINR(data.safetyBuffer - cmp.scenLowest)} below the ${formatINR(data.safetyBuffer)} buffer.`,
      action: 'See the what-if scenario',
      chase: true,
    });
  }

  // Upcoming large expenses: one-time bills within 30 days, and recurring
  // bills of 5,000 or more whose next occurrence falls within 30 days.
  const horizonEnd = addDays(ref, 30);
  for (const bill of data.bills) {
    if (bill.kind === 'one-time' && bill.oneTimeDate !== undefined) {
      if (bill.oneTimeDate >= ref && bill.oneTimeDate <= horizonEnd) {
        alerts.push({
          key: `expense-${bill.id}`,
          category: 'Upcoming Large Expenses',
          tone: 'info',
          title: `Plan ${formatINR(bill.amount)} for ${bill.name} on ${formatDate(bill.oneTimeDate)}`,
          detail: `One-time expense on ${formatDate(bill.oneTimeDate)}.`,
          action: `Set aside ${formatINR(bill.amount)} before ${formatDate(bill.oneTimeDate)}`,
        });
      }
    } else if (bill.kind === 'recurring' && bill.dayOfMonth !== undefined && bill.amount >= 5000) {
      const next = nextRecurringDate(bill.dayOfMonth, ref);
      if (next >= ref && next <= horizonEnd) {
        alerts.push({
          key: `expense-${bill.id}`,
          category: 'Upcoming Large Expenses',
          tone: 'info',
          title: `Plan ${formatINR(bill.amount)} for ${bill.name} on ${formatDate(next)}`,
          detail: `Recurring bill due on ${formatDate(next)}.`,
          action: `Set aside ${formatINR(bill.amount)} before ${formatDate(next)}`,
        });
      }
    }
  }

  function isHidden(key: string): boolean {
    if (state.dismissedAlerts.includes(key)) {
      return true;
    }
    const snoozedUntil = state.snoozedAlerts[key];
    return snoozedUntil !== undefined && snoozedUntil > ref;
  }

  function snooze(key: string): void {
    onStateChange({
      ...state,
      snoozedAlerts: { ...state.snoozedAlerts, [key]: addDays(ref, 2) },
    });
  }

  function dismiss(key: string): void {
    if (state.dismissedAlerts.includes(key)) {
      return;
    }
    onStateChange({ ...state, dismissedAlerts: [...state.dismissedAlerts, key] });
  }

  function markReminderSent(invoiceId: string): void {
    onStateChange({
      ...state,
      reminders: { ...state.reminders, [invoiceId]: new Date().toISOString() },
    });
  }

  const visible = alerts.filter((a) => !isHidden(a.key));

  return (
    <div className="alerts-tab">
      <h2>Alerts</h2>

      <div className="card">
        <p className="muted" style={{ margin: '0 0 8px' }}>Reminder tone</p>
        <SegmentedControl
          options={TONES.map((t) => ({ value: t, label: t }))}
          value={state.tone}
          onChange={(t) => onStateChange({ ...state, tone: t })}
          label="Reminder tone"
        />
        <p className="muted">
          Messages escalate with days overdue: gentle up to 7 days, firmer from 8 days, firm after
          21 days.
        </p>
      </div>

      {[
        { title: 'Today', categories: TODAY_CATEGORIES },
        { title: 'This week', categories: WEEK_CATEGORIES },
      ].map((group) => {
        const items = visible.filter((a) => group.categories.includes(a.category));
        if (items.length === 0) {
          return null;
        }
        return (
          <div key={group.title}>
            <div className="alert-group-head">
              <h3>{group.title}</h3>
              <span className="count">{items.length} to handle</span>
            </div>
            {items.map((item) => {
              const days =
                item.invoice !== undefined ? diffDays(item.invoice.dueDate, ref) : 0;
              const tone =
                item.invoice !== undefined ? effectiveTone(days, state.tone) : state.tone;
              const message =
                item.invoice !== undefined && item.student !== undefined
                  ? buildReminderMessage(data, item.invoice, item.student, tone, data.business)
                  : '';
              const lastReminded =
                item.invoice !== undefined ? state.reminders[item.invoice.id] : undefined;
              return (
                <section key={item.key} className={`alert-card alert-${item.tone}`}>
                  <Chip tone={item.tone === 'danger' ? 'danger' : item.tone === 'warn' ? 'warning' : item.tone === 'ok' ? 'success' : 'info'}>
                    {item.category}
                  </Chip>
                  <h3>{item.title}</h3>
                  <p className="alert-detail">{item.detail}</p>
                  {item.invoice !== undefined && (
                    <>
                      <p className="muted">
                        Message tone: {tone}
                        {tone !== state.tone ? ` (escalated from ${state.tone})` : ''}
                      </p>
                      <WhatsAppBubble message={message} tone={tone} />
                      {lastReminded !== undefined && (
                        <p className="muted">Last reminded: {formatDateTime(lastReminded)}</p>
                      )}
                    </>
                  )}
                  <div className="alert-buttons">
                    {item.invoice !== undefined && item.student !== undefined && item.student.parentPhone && message !== '' && (
                      <a
                        className="btn btn-primary"
                        href={waLink(item.student.parentPhone, message)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Send on WhatsApp
                      </a>
                    )}
                    {message !== '' && <CopyButton text={message} />}
                    {item.invoice !== undefined && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => markReminderSent(item.invoice!.id)}
                      >
                        Mark reminder sent
                      </button>
                    )}
                    {item.chase === true && (
                      <button type="button" className="btn btn-sm" onClick={() => navigate('whatif/overdue')}>
                        See what-if
                      </button>
                    )}
                    <button type="button" className="btn btn-sm" onClick={() => snooze(item.key)}>
                      Snooze 2 days
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => dismiss(item.key)}>
                      Dismiss
                    </button>
                  </div>
                  <p className="alert-action">
                    <strong>Next action:</strong> {item.action}
                  </p>
                </section>
              );
            })}
          </div>
        );
      })}

      {visible.length === 0 && <p className="alerts-empty">No alerts right now.</p>}
    </div>
  );
}
