import { useState } from 'react';
import type { AppData } from '../types';
import { buildForecast, type Scenario } from '../forecast';
import { formatDate, formatINR } from '../format';

type Horizon = 30 | 60 | 90;

const HORIZONS: Horizon[] = [30, 60, 90];

export default function ForecastTab({ data }: { data: AppData }) {
  const [horizon, setHorizon] = useState<Horizon>(30);
  const [scenario, setScenario] = useState<Scenario>({ vikramLate: false, decLate: false });

  const forecast = buildForecast(data, horizon, scenario);

  // Running balance points are index-aligned with events.
  const points = forecast.runningPoints;
  const chartMax = Math.max(
    data.safetyBuffer,
    forecast.openingCash,
    ...points.map((p) => p.balance),
    1,
  );
  const pct = (value: number): number => (Math.max(0, value) / chartMax) * 100;

  return (
    <section className="tab-content">
      <div className="card">
        <div className="forecast-controls">
          <div className="horizon-group" role="group" aria-label="Forecast horizon">
            {HORIZONS.map((h) => (
              <button
                key={h}
                type="button"
                className={h === horizon ? 'btn btn-primary' : 'btn btn-secondary'}
                aria-pressed={h === horizon}
                onClick={() => setHorizon(h)}
              >
                {h} days
              </button>
            ))}
          </div>
          <div className="scenario-group">
            <label className="check">
              <input
                type="checkbox"
                checked={scenario.vikramLate}
                onChange={(e) => setScenario({ ...scenario, vikramLate: e.target.checked })}
              />
              Vikram Dec fee arrives 15 days late (5 Dec to 20 Dec)
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={scenario.decLate}
                onChange={(e) => setScenario({ ...scenario, decLate: e.target.checked })}
              />
              All December fees arrive 7 days late
            </label>
          </div>
        </div>
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
        <strong>{forecast.aboveBuffer ? 'Yes' : 'No'}</strong>: Cash stays above the{' '}
        {formatINR(data.safetyBuffer)} safety buffer
      </div>

      <div className="card">
        <h2>Running balance</h2>
        {points.length === 0 ? (
          <p className="muted">No cash events in this window.</p>
        ) : (
          <div className="chart">
            <div className="chart-plot">
              <div
                className="buffer-line"
                style={{ bottom: `${pct(data.safetyBuffer)}%` }}
                title={`Safety buffer ${formatINR(data.safetyBuffer)}`}
              />
              {points.map((p, i) => (
                <div key={i} className="chart-col" title={`${formatDate(p.date)}: ${formatINR(p.balance)}`}>
                  <div
                    className={p.balance >= data.safetyBuffer ? 'chart-bar' : 'chart-bar chart-bar-low'}
                    style={{ height: `${pct(p.balance)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="chart-note muted">
              Red bars are below the safety buffer line ({formatINR(data.safetyBuffer)}).
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Events</h2>
        {forecast.events.length === 0 ? (
          <p className="muted">No events in this window.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th className="num">In</th>
                  <th className="num">Out</th>
                  <th className="num">Running balance</th>
                </tr>
              </thead>
              <tbody>
                {forecast.events.map((e, i) => (
                  <tr key={`${e.date}-${i}`} className={i % 2 === 1 ? 'zebra' : undefined}>
                    <td>{formatDate(e.date)}</td>
                    <td>{e.label}</td>
                    <td className="num">{e.kind === 'in' ? formatINR(e.amount) : ''}</td>
                    <td className="num">{e.kind === 'out' ? formatINR(e.amount) : ''}</td>
                    <td className="num">{formatINR(points[i].balance)}</td>
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
