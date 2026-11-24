import { useEffect, useState, type FormEvent } from 'react';
import type { AppData } from '../types';
import { buildForecast, type Forecast, type Scenario } from '../forecast';
import { formatDate, formatINR } from '../format';
import ForecastChart, { type ChartPoint } from './ForecastChart';
import { Skeleton, SkeletonRow, SegmentedControl } from './ui';

type Horizon = 30 | 60 | 90;
type Filter = 'all' | 'in' | 'out';

const HORIZONS: Horizon[] = [30, 60, 90];
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'In' },
  { key: 'out', label: 'Out' },
];
const BASE: Scenario = {
  vikramLate: false,
  decLate: false,
  delayDays: 0,
  loseTopStudent: false,
  unexpectedExpense: 0,
  overdueUnpaid: false,
};

// Non-negative number, or null when the text is empty, not a number, or negative.
function parseAmount(text: string): number | null {
  if (text.trim() === '') {
    return null;
  }
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// One chart point per date: the balance after that day's events, with the day's in/out totals.
function toChartPoints(f: Forecast): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const rp of f.runningPoints) {
    const onDate = f.events.filter((e) => e.date === rp.date);
    const point: ChartPoint = {
      date: rp.date,
      balance: rp.balance,
      moneyIn: onDate.filter((e) => e.kind === 'in').reduce((sum, e) => sum + e.amount, 0),
      moneyOut: onDate.filter((e) => e.kind === 'out').reduce((sum, e) => sum + e.amount, 0),
      events: onDate.map((e) => e.label),
    };
    if (points.length > 0 && points[points.length - 1].date === rp.date) {
      points[points.length - 1] = point;
    } else {
      points.push(point);
    }
  }
  return points;
}

export default function ForecastTab({
  data,
  onChange,
  promisedDates,
  paidBills,
}: {
  data: AppData;
  onChange: (next: AppData) => void;
  promisedDates?: Record<string, string>;
  paidBills?: Record<string, string>;
}) {
  const [loading, setLoading] = useState<boolean>(true);
  const [horizon, setHorizon] = useState<Horizon>(30);
  const [filter, setFilter] = useState<Filter>('all');
  const [cashInput, setCashInput] = useState(String(data.openingCash));
  const [bufferInput, setBufferInput] = useState(String(data.safetyBuffer));
  const [error, setError] = useState<string | null>(null);

  // Brief loading skeleton on first mount (data is local, so this is short).
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(t);
  }, []);

  const forecast = buildForecast(data, horizon, { ...BASE, promisedDates, paidBills });
  const chartPoints = toChartPoints(forecast);

  function save(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const cash = parseAmount(cashInput);
    const buffer = parseAmount(bufferInput);
    if (cash === null || buffer === null) {
      setError('Enter non-negative numbers for starting cash and safety buffer.');
      return;
    }
    setError(null);
    onChange({ ...data, openingCash: cash, safetyBuffer: buffer });
  }

  // Running points are index-aligned with events; keep the index for the balance lookup.
  const rows = forecast.events
    .map((event, index) => ({ event, index }))
    .filter((row) => filter === 'all' || row.event.kind === filter);

  if (loading) {
    return (
      <section className="tab-content" aria-label="Loading forecast">
        <Skeleton height={44} width="100%" />
        <Skeleton height={120} width="100%" />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </section>
    );
  }

  return (
    <section className="tab-content">
      <div className="card">
        <SegmentedControl
          options={HORIZONS.map((h) => ({ value: String(h), label: `${h} days` }))}
          value={String(horizon)}
          onChange={(v) => setHorizon(Number(v) as Horizon)}
          label="Forecast horizon"
        />
      </div>

      <div className="card">
        <h2>Starting cash and safety buffer</h2>
        <form className="inline-form" noValidate onSubmit={save}>
          <label>
            Starting cash (INR)
            <input
              type="number"
              min={0}
              step={100}
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
            />
          </label>
          <label>
            Safety buffer (INR)
            <input
              type="number"
              min={0}
              step={100}
              value={bufferInput}
              onChange={(e) => setBufferInput(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </form>
        {error !== null && <p className="form-error">{error}</p>}
      </div>

      <div className="card-grid">
        <div className="card stat-card stat-info">
          <div className="stat-label">Projected cash in</div>
          <div className="stat-value">{formatINR(forecast.totalIn)}</div>
        </div>
        <div className="card stat-card stat-danger">
          <div className="stat-label">Projected cash out</div>
          <div className="stat-value">{formatINR(forecast.totalOut)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Lowest balance</div>
          <div className="stat-value">{formatINR(forecast.minBalance)}</div>
          <div className="stat-sub">on {formatDate(forecast.minBalanceDate)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">End balance</div>
          <div className="stat-value">{formatINR(forecast.endBalance)}</div>
          <div className="stat-sub">by {formatDate(forecast.horizonEnd)}</div>
        </div>
      </div>

      <div className={forecast.aboveBuffer ? 'verdict verdict-yes' : 'verdict verdict-no'}>
        <strong>{forecast.aboveBuffer ? 'Safe' : 'Shortfall'}</strong>: lowest balance{' '}
        {forecast.aboveBuffer ? 'stays above' : 'falls below'} the {formatINR(data.safetyBuffer)}{' '}
        safety buffer
      </div>

      <div className="card">
        <ForecastChart
          points={chartPoints}
          buffer={data.safetyBuffer}
          label={`Cash balance, next ${horizon} days`}
        />
      </div>

      <div className="card">
        <h2>Cash Events Timeline</h2>
        <p className="muted">
          Every inflow and bill in the window, in date order, with the running balance after
          each one.
        </p>
        <SegmentedControl
          options={FILTERS.map((f) => ({ value: f.key, label: f.label }))}
          value={filter}
          onChange={setFilter}
          label="Ledger filter"
        />
        {rows.length === 0 ? (
          <p className="muted">No events in this window.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th className="num">In</th>
                  <th className="num">Out</th>
                  <th className="num">Running balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ event, index }) => (
                  <tr key={index} className={index % 2 === 1 ? 'zebra' : undefined}>
                    <td>{formatDate(event.date)}</td>
                    <td>{event.label}</td>
                    <td className="num">{event.kind === 'in' ? formatINR(event.amount) : ''}</td>
                    <td className="num">{event.kind === 'out' ? formatINR(event.amount) : ''}</td>
                    <td className="num">{formatINR(forecast.runningPoints[index].balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card calc-note">
        <h2>How this forecast is calculated</h2>
        <ul>
          <li>
            Starts from the cash on hand on the reference date (opening cash less bills already
            marked paid).
          </li>
          <li>
            A promised payment date from Bad Day Mode moves that invoice&apos;s expected pay date.
          </li>
          <li>Unpaid invoices are assumed to pay on their due date.</li>
          <li>
            Overdue invoices are assumed to pay 3 days after the last reminder, or 3 days from the
            reference date if none was sent.
          </li>
          <li>
            December, January and February invoices are generated at current fees and due on the
            5th.
          </li>
          <li>Recurring bills occur monthly on their day; one-time bills occur on their date.</li>
          <li>The safety buffer is the level the balance should stay above.</li>
        </ul>
      </div>
    </section>
  );
}
