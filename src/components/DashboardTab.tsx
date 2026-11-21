import type { AppData, Invoice, Student } from '../types';
import { amountPaid, balance, isOverdue } from '../forecast';
import { addDays, diffDays, formatDate, formatINR } from '../format';

type StudentRow = {
  student: Student;
  owed: number;
  oldestDue: string;
  daysOverdue: number | null;
};

function unpaid(data: AppData): Invoice[] {
  return data.invoices.filter((inv) => amountPaid(inv) < inv.amount);
}

export default function DashboardTab({ data }: { data: AppData }) {
  const ref = data.referenceDate;
  const outstandingInvoices = unpaid(data);

  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + balance(inv), 0);
  const totalOverdue = outstandingInvoices
    .filter((inv) => isOverdue(inv, ref))
    .reduce((sum, inv) => sum + balance(inv), 0);
  const horizonEnd = addDays(ref, 30);
  const upcomingDue = outstandingInvoices
    .filter((inv) => !isOverdue(inv, ref) && inv.dueDate >= ref && inv.dueDate <= horizonEnd)
    .reduce((sum, inv) => sum + balance(inv), 0);

  const rows: StudentRow[] = [];
  for (const student of data.students) {
    const mine = outstandingInvoices.filter((inv) => inv.studentId === student.id);
    if (mine.length === 0) {
      continue;
    }
    const owed = mine.reduce((sum, inv) => sum + balance(inv), 0);
    const oldestDue = mine.reduce((a, inv) => (inv.dueDate < a ? inv.dueDate : a), mine[0].dueDate);
    const daysOverdue = oldestDue < ref ? diffDays(oldestDue, ref) : null;
    rows.push({ student, owed, oldestDue, daysOverdue });
  }

  const maxOwed = rows.reduce((m, r) => Math.max(m, r.owed), 0);

  return (
    <section className="tab-content">
      <div className="card-grid">
        <div className="card stat-card">
          <div className="stat-label">Total outstanding</div>
          <div className="stat-value">{formatINR(totalOutstanding)}</div>
        </div>
        <div className="card stat-card stat-danger">
          <div className="stat-label">Total overdue</div>
          <div className="stat-value">{formatINR(totalOverdue)}</div>
        </div>
        <div className="card stat-card stat-info">
          <div className="stat-label">Due in next 30 days</div>
          <div className="stat-value">{formatINR(upcomingDue)}</div>
        </div>
      </div>

      <div className="card">
        <h2>Who owes me</h2>
        {rows.length === 0 ? (
          <p className="muted">Nothing outstanding. All invoices are paid.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th className="num">Owed</th>
                  <th>Since</th>
                  <th>Days overdue</th>
                  <th className="bar-col">Share of largest</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.student.id} className={i % 2 === 1 ? 'zebra' : undefined}>
                    <td>{r.student.name}</td>
                    <td>{r.student.className}</td>
                    <td className="num">{formatINR(r.owed)}</td>
                    <td>{formatDate(r.oldestDue)}</td>
                    <td>
                      {r.daysOverdue !== null && r.daysOverdue > 0 ? (
                        <span className="badge badge-overdue">{r.daysOverdue} days</span>
                      ) : (
                        <span className="badge badge-draft">Not yet due</span>
                      )}
                    </td>
                    <td className="bar-col">
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{ width: `${maxOwed > 0 ? (r.owed / maxOwed) * 100 : 0}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
