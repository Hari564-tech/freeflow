import { useState } from 'react';
import type { ReactNode } from 'react';
import type { AppData, Invoice, Student } from '../types';
import { balance, buildForecast, isOverdue } from '../forecast';
import { diffDays, formatDate, formatINR } from '../format';

type Props = {
  data: AppData;
  onChange: (next: AppData) => void;
};

type Tone = 'danger' | 'warn' | 'ok' | 'info';

const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

// 'YYYY-MM' -> 'Nov 2026'
function monthLabel(ym: string): string {
  return monthFormatter.format(new Date(`${ym}-01T00:00:00Z`));
}

function firstName(student: Student | undefined, fallback: string): string {
  if (!student) {
    return fallback;
  }
  return student.name.split(' ')[0];
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
    <button type="button" onClick={handleClick}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

type AlertCardProps = {
  tone: Tone;
  title: string;
  detail: string;
  action: string;
  children?: ReactNode;
};

function AlertCard({ tone, title, detail, action, children }: AlertCardProps) {
  return (
    <section className={`alert-card alert-${tone}`}>
      <h3>{title}</h3>
      <p className="alert-detail">{detail}</p>
      {children}
      <p className="alert-action">
        <strong>Next action:</strong> {action}
      </p>
    </section>
  );
}

type InvoiceAlertProps = {
  data: AppData;
  onChange: (next: AppData) => void;
  invoice: Invoice;
};

function OverdueCard({ data, onChange, invoice }: InvoiceAlertProps) {
  const ref = data.referenceDate;
  const student = data.students.find((s) => s.id === invoice.studentId);
  const name = student ? student.name : invoice.studentId;
  const owed = balance(invoice);
  const daysLate = diffDays(invoice.dueDate, ref);
  const sentToday = invoice.reminders.includes(ref);

  const message =
    `Hi ${firstName(student, name)}'s parent, this is a gentle reminder that the ` +
    `${formatINR(owed)} tuition fee for ${monthLabel(invoice.month)} was due on ` +
    `${formatDate(invoice.dueDate)}. Could you please pay at your earliest? ` +
    `Thank you, Priya Sharma`;

  function markReminderSent() {
    onChange({
      ...data,
      invoices: data.invoices.map((inv) =>
        inv.id === invoice.id && !inv.reminders.includes(ref)
          ? { ...inv, reminders: [...inv.reminders, ref] }
          : inv,
      ),
    });
  }

  return (
    <AlertCard
      tone="danger"
      title={`${name}: ${formatINR(owed)} overdue ${daysLate} days`}
      detail={
        sentToday
          ? `Reminder sent on ${formatDate(ref)}.`
          : `Invoice for ${monthLabel(invoice.month)} was due on ${formatDate(invoice.dueDate)}.`
      }
      action={
        sentToday
          ? 'Reminder sent: payment expected 3 days later'
          : 'Chase this invoice today'
      }
    >
      <textarea className="reminder-draft" readOnly rows={4} value={message} />
      <div className="alert-buttons">
        <CopyButton text={message} />
        {!sentToday && (
          <button type="button" onClick={markReminderSent}>
            Mark reminder sent
          </button>
        )}
      </div>
    </AlertCard>
  );
}

function DueSoonCard({ data, invoice }: InvoiceAlertProps) {
  const student = data.students.find((s) => s.id === invoice.studentId);
  const name = student ? student.name : invoice.studentId;
  const owed = balance(invoice);
  const daysAway = diffDays(data.referenceDate, invoice.dueDate);

  const message =
    `Hi ${firstName(student, name)}'s parent, a friendly reminder that the ` +
    `${formatINR(owed)} tuition fee for ${monthLabel(invoice.month)} is due on ` +
    `${formatDate(invoice.dueDate)}. Thank you, Priya Sharma`;

  return (
    <AlertCard
      tone="warn"
      title={`${name}: ${formatINR(owed)} due in ${daysAway} days`}
      detail={`Invoice for ${monthLabel(invoice.month)} is due on ${formatDate(invoice.dueDate)}.`}
      action="Send a friendly due-date reminder"
    >
      <textarea className="reminder-draft" readOnly rows={4} value={message} />
      <div className="alert-buttons">
        <CopyButton text={message} />
      </div>
    </AlertCard>
  );
}

export default function AlertsTab({ data, onChange }: Props) {
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

  const forecast = buildForecast(data, 90, { vikramLate: false, decLate: false });
  const belowBuffer = forecast.minBalance < data.safetyBuffer;

  const studyTable = data.bills.find(
    (b) =>
      b.oneTimeDate !== undefined &&
      b.name.toLowerCase().includes('study table') &&
      b.oneTimeDate > ref,
  );

  return (
    <div className="alerts-tab">
      <h2>Alerts</h2>

      {overdue.map((inv) => (
        <OverdueCard key={`overdue-${inv.id}`} data={data} onChange={onChange} invoice={inv} />
      ))}

      {dueSoon.map((inv) => (
        <DueSoonCard key={`due-${inv.id}`} data={data} onChange={onChange} invoice={inv} />
      ))}

      {belowBuffer ? (
        <AlertCard
          tone="danger"
          title={`Cash dips below the ${formatINR(data.safetyBuffer)} buffer`}
          detail={`Lowest projected balance is ${formatINR(forecast.minBalance)} on ${formatDate(forecast.minBalanceDate)} (next 90 days).`}
          action={`Ask for the overdue fees or delay non-urgent spending before ${formatDate(forecast.minBalanceDate)}`}
        />
      ) : (
        <AlertCard
          tone="ok"
          title="Cash stays above the buffer"
          detail={`Lowest projected balance over the next 90 days is ${formatINR(forecast.minBalance)}, against a ${formatINR(data.safetyBuffer)} buffer.`}
          action="No action needed"
        />
      )}

      {studyTable && studyTable.oneTimeDate !== undefined && (
        <AlertCard
          tone="info"
          title={`Plan ${formatINR(studyTable.amount)} for the study table on ${formatDate(studyTable.oneTimeDate)}`}
          detail={`One-time expense on ${formatDate(studyTable.oneTimeDate)}.`}
          action={`Set aside ${formatINR(studyTable.amount)} before ${formatDate(studyTable.oneTimeDate)}`}
        />
      )}

      {overdue.length === 0 && dueSoon.length === 0 && (
        <p className="alerts-empty">No overdue or due-soon invoices.</p>
      )}
    </div>
  );
}
