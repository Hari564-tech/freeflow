import { useState } from 'react';
import type { AppData, BusinessProfile, Invoice, Student } from '../types';
import { amountPaid, balance, isOverdue } from '../forecast';
import { formatDate, formatINR } from '../format';
import { buildUpiLink, monthLabel, qrSvgForUpi } from '../qr';
import { printInvoice } from '../print';
import { generateInvoices } from '../generation';
import { invoicesToCsv } from '../csv';
import { navigate } from '../router';
import PaymentDrawer from './PaymentDrawer';
import NewInvoiceModal from './NewInvoiceModal';
import QrModal from './QrModal';

type Props = {
  data: AppData;
  onChange: (next: AppData) => void;
  profile: BusinessProfile;
  dueDays: number;
};

type DisplayStatus = 'paid' | 'overdue' | 'partial' | 'draft' | 'sent';
type StatusFilter = 'unpaid' | 'all' | 'overdue' | 'sent' | 'partial' | 'paid';

const STATUS_LABEL: Record<DisplayStatus, string> = {
  paid: 'Paid',
  overdue: 'Overdue',
  partial: 'Partial',
  draft: 'Draft',
  sent: 'Sent',
};

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'sent', label: 'Sent' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
];

const MONTH_FILTERS: string[] = ['2026-10', '2026-11', '2026-12'];

// Status is derived: paid when nothing is owed, overdue when past due and unpaid,
// then partial when some money came in, otherwise the stored draft/sent status.
function displayStatus(inv: Invoice, referenceDate: string): DisplayStatus {
  if (balance(inv) === 0) {
    return 'paid';
  }
  if (isOverdue(inv, referenceDate)) {
    return 'overdue';
  }
  if (amountPaid(inv) > 0) {
    return 'partial';
  }
  return inv.status === 'draft' ? 'draft' : 'sent';
}

function matchesStatus(inv: Invoice, filter: StatusFilter, referenceDate: string): boolean {
  const owed = balance(inv);
  switch (filter) {
    case 'all':
      return true;
    case 'unpaid':
      return owed > 0;
    case 'overdue':
      return isOverdue(inv, referenceDate);
    case 'sent':
      return displayStatus(inv, referenceDate) === 'sent';
    case 'partial':
      return amountPaid(inv) > 0 && owed > 0;
    case 'paid':
      return owed === 0;
  }
}

// Immutable update of a single invoice inside AppData.
function updateInvoice(
  data: AppData,
  id: string,
  update: (inv: Invoice) => Invoice,
): AppData {
  return {
    ...data,
    invoices: data.invoices.map((inv) => (inv.id === id ? update(inv) : inv)),
  };
}

export default function InvoicesTab({ data, onChange, profile, dueDays }: Props) {
  const ref = data.referenceDate;
  const [status, setStatus] = useState<StatusFilter>('unpaid');
  const [month, setMonth] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [genMonth, setGenMonth] = useState<string>('2026-12');
  const [genMessage, setGenMessage] = useState<string | null>(null);
  const [showNew, setShowNew] = useState<boolean>(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [qr, setQr] = useState<{ invoice: Invoice; link: string; svg: string } | null>(null);
  const [qrError, setQrError] = useState<boolean>(false);

  const studentOf = (inv: Invoice): Student | undefined =>
    data.students.find((s) => s.id === inv.studentId);
  const nameOf = (inv: Invoice): string => studentOf(inv)?.name ?? inv.studentId;

  const needle = search.trim().toLowerCase();
  const rows = data.invoices.filter(
    (inv) =>
      matchesStatus(inv, status, ref) &&
      (month === 'all' || inv.month === month) &&
      nameOf(inv).toLowerCase().includes(needle),
  );

  const paying = payingId === null ? undefined : data.invoices.find((i) => i.id === payingId);

  function markSent(id: string): void {
    onChange(updateInvoice(data, id, (inv) => ({ ...inv, status: 'sent' })));
  }

  async function openQr(inv: Invoice): Promise<void> {
    setQrError(false);
    try {
      const link = buildUpiLink(profile, nameOf(inv), inv);
      const svg = await qrSvgForUpi(link);
      setQr({ invoice: inv, link, svg });
    } catch {
      setQrError(true);
    }
  }

  function handleGenerate(): void {
    const { invoices, skipped } = generateInvoices(data, genMonth);
    if (invoices.length > 0) {
      onChange({ ...data, invoices: [...data.invoices, ...invoices] });
    }
    const label = monthLabel(genMonth);
    const count = invoices.length > 0 ? `Created ${invoices.length} invoices` : 'No invoices created';
    setGenMessage(`${count} for ${label} · ${skipped} skipped as duplicates`);
  }

  function downloadCsv(): void {
    const csv = invoicesToCsv(data, rows);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feeflow-invoices.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderActions(inv: Invoice) {
    const student = studentOf(inv);
    const owed = balance(inv);
    return (
      <div className="invoice-actions">
        {owed > 0 && (
          <button type="button" className="btn-sm" onClick={() => setPayingId(inv.id)}>
            Pay
          </button>
        )}
        {owed > 0 && (
          <button type="button" className="btn-sm" onClick={() => void openQr(inv)}>
            QR
          </button>
        )}
        <button
          type="button"
          className="btn-sm"
          disabled={!student}
          onClick={() => {
            if (student) {
              printInvoice(data, inv, student, profile);
            }
          }}
        >
          Print
        </button>
        {inv.status === 'draft' && (
          <button type="button" className="btn-sm" onClick={() => markSent(inv.id)}>
            Mark sent
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="invoices-tab">
      <div className="tab-header">
        <h2>Invoices</h2>
        <div className="invoice-actions">
          <button type="button" onClick={downloadCsv}>
            Download CSV
          </button>
          <button type="button" onClick={() => setShowNew(true)}>
            New invoice
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Month
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">All</option>
            {MONTH_FILTERS.map((ym) => (
              <option key={ym} value={ym}>
                {monthLabel(ym)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Student
          <input
            type="search"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="filter-bar">
        <label>
          Generate for
          <input type="month" value={genMonth} onChange={(e) => setGenMonth(e.target.value)} />
        </label>
        <button type="button" onClick={handleGenerate}>
          Generate invoices
        </button>
        {genMessage !== null && <p className="gen-message">{genMessage}</p>}
      </div>

      <div className="table-wrap">
        <table className="invoices-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Month</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Due date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => {
              const owed = balance(inv);
              const status = displayStatus(inv, ref);
              return (
                <tr key={inv.id}>
                  <td>{nameOf(inv)}</td>
                  <td>{monthLabel(inv.month)}</td>
                  <td className="amount">{formatINR(inv.amount)}</td>
                  <td className="amount">{formatINR(amountPaid(inv))}</td>
                  <td className="amount">{formatINR(owed)}</td>
                  <td>{formatDate(inv.dueDate)}</td>
                  <td>
                    <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
                  </td>
                  <td>{renderActions(inv)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {qrError && <p className="muted">Could not generate the QR code. Try again.</p>}

      <div className="invoice-card-list">
        {rows.map((inv) => {
          const owed = balance(inv);
          const status = displayStatus(inv, ref);
          return (
            <div key={inv.id} className="invoice-card">
              <div className="invoice-card-head">
                <strong>{nameOf(inv)}</strong>
                <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
              </div>
              <p className="muted">
                {monthLabel(inv.month)} · Due {formatDate(inv.dueDate)}
              </p>
              <p className="amount">
                Amount {formatINR(inv.amount)} · Paid {formatINR(amountPaid(inv))} · Balance{' '}
                {formatINR(owed)}
              </p>
              {renderActions(inv)}
            </div>
          );
        })}
      </div>

      {rows.length === 0 && <p className="muted">No invoices match these filters.</p>}

      {paying !== undefined && (
        <PaymentDrawer
          data={data}
          invoice={paying}
          onChange={onChange}
          onClose={() => setPayingId(null)}
        />
      )}

      {showNew && (
        <NewInvoiceModal
          data={data}
          onChange={onChange}
          onClose={() => setShowNew(false)}
          onAddStudent={() => navigate('students')}
          dueDays={dueDays}
        />
      )}

      <QrModal
        open={qr !== null}
        onClose={() => setQr(null)}
        upiLink={qr?.link ?? ''}
        qrSvg={qr?.svg ?? ''}
        amount={qr ? balance(qr.invoice) : 0}
        studentName={qr ? nameOf(qr.invoice) : ''}
        monthLabel={qr ? monthLabel(qr.invoice.month) : ''}
      />
    </div>
  );
}
