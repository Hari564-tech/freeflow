import { useState } from 'react';
import type { AppData } from '../types';
import {
  buildForecast,
  compareForecasts,
  type Forecast,
  type Scenario,
} from '../forecast';
import { formatDate, formatINR } from '../format';
import ForecastChart, { type ChartPoint } from './ForecastChart';

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

export default function WhatIfTab({
  data,
  initialScenario,
}: {
  data: AppData;
  initialScenario?: Partial<Scenario>;
}) {
  const [scenario, setScenario] = useState<Scenario>({ ...BASE, ...initialScenario });

  const baseline = buildForecast(data, 30, BASE);
  const result = buildForecast(data, 30, scenario);
  const cmp = compareForecasts(baseline, result);

  function update(patch: Partial<Scenario>): void {
    setScenario({ ...scenario, ...patch });
  }

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
      </div>

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
