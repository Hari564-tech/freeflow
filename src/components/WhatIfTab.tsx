import { useState } from 'react';
import type { AppData } from '../types';
import {
  buildForecast,
  compareForecasts,
  computeRecoveryPlan,
  type Forecast,
  type Scenario,
} from '../forecast';
import { formatDate, formatINR } from '../format';
import ForecastChart, { type ChartPoint } from './ForecastChart';
import { Money } from './ui';
import { navigate } from '../router';

const BASE: Scenario = {
  vikramLate: false,
  decLate: false,
  delayDays: 0,
  loseTopStudent: false,
  unexpectedExpense: 0,
  overdueUnpaid: false,
};

const PRESETS: { label: string; scenario: Partial<Scenario> }[] = [
  { label: 'Vikram 15 days late (5 Dec to 20 Dec)', scenario: { vikramLate: true } },
  { label: 'All December fees 7 days late', scenario: { decLate: true } },
  { label: 'Overdue Nov fees still unpaid on rent day', scenario: { overdueUnpaid: true } },
  {
    label: 'Bad-day stress test: 5 families pay 15 days late',
    scenario: { lateCount: 5, lateDelayDays: 15 },
  },
];

const VERDICT_CLASS: Record<'Safe' | 'Watch' | 'Shortfall', string> = {
  Safe: 'verdict-safe',
  Watch: 'verdict-watch',
  Shortfall: 'verdict-shortfall',
};

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

// Which late-target the slider controls, derived from the scenario.
function lateTargetOf(sc: Scenario): string {
  if (sc.lateStudentId !== undefined) {
    return sc.lateStudentId;
  }
  if (sc.lateCount === 5) {
    return 'top5';
  }
  if (sc.lateTop3 === true || sc.lateCount === 3) {
    return 'top3';
  }
  return 'none';
}

export default function WhatIfTab({
  data,
  initialScenario,
  promisedDates,
  paidBills,
}: {
  data: AppData;
  initialScenario?: Partial<Scenario>;
  promisedDates?: Record<string, string>;
  paidBills?: Record<string, string>;
}) {
  const [scenario, setScenario] = useState<Scenario>({ ...BASE, ...initialScenario });

  const baseline = buildForecast(data, 30, { ...BASE, promisedDates, paidBills });
  const result = buildForecast(data, 30, { ...scenario, promisedDates, paidBills });
  const cmp = compareForecasts(baseline, result);

  function update(patch: Partial<Scenario>): void {
    setScenario({ ...scenario, ...patch });
  }

  // Key Customer Late Slider state (derived from the scenario).
  const lateTarget = lateTargetOf(scenario);
  const lateDays = scenario.lateDelayDays ?? 0;
  function setLateTarget(value: string): void {
    if (value === 'none') {
      update({ lateStudentId: undefined, lateTop3: false, lateCount: undefined, lateDelayDays: 0 });
    } else if (value === 'top3') {
      update({ lateStudentId: undefined, lateTop3: true, lateCount: 3, lateDelayDays: lateDays });
    } else if (value === 'top5') {
      update({ lateStudentId: undefined, lateTop3: false, lateCount: 5, lateDelayDays: lateDays });
    } else {
      update({ lateStudentId: value, lateTop3: false, lateCount: undefined, lateDelayDays: lateDays });
    }
  }

  // Expense Shock / Growth Toggle: one-time repair vs recurring assistant.
  const expenseMode =
    scenario.recurringExpense !== undefined && scenario.recurringExpense > 0
      ? 'recurring'
      : scenario.unexpectedExpense !== undefined && scenario.unexpectedExpense > 0
        ? 'onetime'
        : 'none';
  function setExpenseMode(mode: 'none' | 'onetime' | 'recurring'): void {
    if (mode === 'none') {
      update({ unexpectedExpense: 0, recurringExpense: undefined });
    } else if (mode === 'onetime') {
      update({ unexpectedExpense: 8000, recurringExpense: undefined });
    } else {
      update({ unexpectedExpense: 0, recurringExpense: 4000 });
    }
  }

  // Computed recovery plan: overdue invoices to collect today to get the
  // simulated lowest back above the safety buffer.
  const shortfall = Math.max(0, data.safetyBuffer - cmp.scenLowest);
  const recovery = computeRecoveryPlan(data, shortfall);
  const recoveryTotal = recovery.reduce((sum, r) => sum + r.amount, 0);
  const scenarioActive = JSON.stringify(scenario) !== JSON.stringify(BASE);

  return (
    <section className="tab-content">
      <div className="card">
        <h2>Presets</h2>
        <div className="whatif-presets">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="btn btn-secondary"
              onClick={() => setScenario({ ...BASE, ...p.scenario })}
            >
              {p.label}
            </button>
          ))}
          <button type="button" className="btn btn-ghost" onClick={() => setScenario(BASE)}>
            Reset
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Adjust the scenario</h2>
        <div className="slider-row">
          <label className="check">
            <input
              type="checkbox"
              checked={scenario.vikramLate}
              onChange={(e) => update({ vikramLate: e.target.checked })}
            />
            Vikram Dec fee arrives 15 days late
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={scenario.decLate}
              onChange={(e) => update({ decLate: e.target.checked })}
            />
            All December fees arrive 7 days late
          </label>
        </div>
        <div className="slider-row">
          <label>
            Delay unpaid future fees by {scenario.delayDays ?? 0} days
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={scenario.delayDays ?? 0}
              onChange={(e) => update({ delayDays: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="slider-row">
          <label className="check">
            <input
              type="checkbox"
              checked={scenario.loseTopStudent ?? false}
              onChange={(e) => update({ loseTopStudent: e.target.checked })}
            />
            Lose the top-fee student from December onward
          </label>
        </div>
        <div className="slider-row">
          <label>
            Unexpected expense today: {formatINR(scenario.unexpectedExpense ?? 0)}
            <input
              type="range"
              min={0}
              max={15000}
              step={500}
              value={scenario.unexpectedExpense ?? 0}
              onChange={(e) => update({ unexpectedExpense: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="slider-row">
          <label>
            Key customer pays late
            <select value={lateTarget} onChange={(e) => setLateTarget(e.target.value)}>
              <option value="none">Nobody in particular</option>
              <option value="top3">Top 3 payers</option>
              <option value="top5">Top 5 payers</option>
              {data.students
                .filter((st) => st.active)
                .map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({formatINR(st.monthlyFee)}/mo)
                  </option>
                ))}
            </select>
          </label>
          <label>
            Late by {lateDays} days
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={lateDays}
              disabled={lateTarget === 'none'}
              onChange={(e) => update({ lateDelayDays: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="slider-row">
          <label>
            Expense shock / growth
            <select
              value={expenseMode}
              onChange={(e) => setExpenseMode(e.target.value as 'none' | 'onetime' | 'recurring')}
            >
              <option value="none">No extra expense</option>
              <option value="onetime">One-time repair ₹8,000</option>
              <option value="recurring">Recurring assistant ₹4,000 / month</option>
            </select>
          </label>
        </div>
      </div>

      {scenarioActive && (
        <div className="card compare-banner">
          <h2>Baseline vs simulated</h2>
          <p>
            Lowest cash: <Money value={cmp.baseLowest} /> on {formatDate(baseline.minBalanceDate)}{' '}
            → <Money value={cmp.scenLowest} /> on {formatDate(result.minBalanceDate)} (
            {cmp.lowestDelta >= 0 ? '+' : ''}
            <Money value={cmp.lowestDelta} />)
          </p>
          <p className="muted">
            Cash crunch date:{' '}
            {cmp.breachDate === null ? 'none — stays above the buffer' : formatDate(cmp.breachDate)}
          </p>
        </div>
      )}

      {shortfall > 0 && (
        <div className="card recovery-plan">
          <h2>Recovery plan</h2>
          <p>
            The simulation dips <Money value={shortfall} /> below the{' '}
            {formatINR(data.safetyBuffer)} buffer. Collecting these overdue invoices today
            covers it:
          </p>
          {recovery.length === 0 ? (
            <p className="muted">
              Nothing overdue to chase — the shortfall can&apos;t be covered from overdue fees.
            </p>
          ) : (
            <>
              <ul>
                {recovery.map((r) => (
                  <li key={r.invoiceId}>
                    {r.studentName} — <Money value={r.amount} /> ({r.daysOverdue} days overdue)
                  </li>
                ))}
              </ul>
              <p className="muted">
                {recovery.length} {recovery.length === 1 ? 'invoice' : 'invoices'} ·{' '}
                <Money value={recoveryTotal} /> unlocked
              </p>
              <button type="button" className="btn btn-primary" onClick={() => navigate('chase')}>
                Chase These Now
              </button>
            </>
          )}
        </div>
      )}

      <div className="whatif-delta-grid">
        <div className="card delta-card">
          <div className="stat-label">Lowest balance (scenario)</div>
          <div className="stat-value">{formatINR(cmp.scenLowest)}</div>
          <div className="stat-sub">on {formatDate(result.minBalanceDate)}</div>
        </div>
        <div className="card delta-card">
          <div className="stat-label">Lowest balance date</div>
          <div className="stat-value">{formatDate(result.minBalanceDate)}</div>
        </div>
        <div className="card delta-card">
          <div className="stat-label">Change vs base</div>
          <div className="stat-value">{formatINR(cmp.lowestDelta)}</div>
        </div>
        <div className="card delta-card">
          <div className="stat-label">Days below buffer</div>
          <div className="stat-value">{cmp.daysBelowBuffer}</div>
        </div>
        <div className="card delta-card">
          <div className="stat-label">Breach date</div>
          <div className="stat-value">
            {cmp.breachDate === null ? 'None' : formatDate(cmp.breachDate)}
          </div>
        </div>
        <div className="card delta-card">
          <div className="stat-label">Verdict</div>
          <div className={`stat-value ${VERDICT_CLASS[cmp.verdict]}`}>{cmp.verdict}</div>
        </div>
      </div>

      <div className="card">
        <ForecastChart
          points={toChartPoints(baseline)}
          compare={toChartPoints(result)}
          buffer={data.safetyBuffer}
          label="Before and after, next 30 days"
          compareLabel="Scenario"
        />
      </div>
    </section>
  );
}
