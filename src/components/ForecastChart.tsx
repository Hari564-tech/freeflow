import { useState, type MouseEvent as SvgMouseEvent } from 'react';
import { formatDate, formatINR } from '../format';

export interface ChartPoint {
  date: string;
  balance: number;
  moneyIn: number;
  moneyOut: number;
  events: string[];
}

const W = 640;
const H = 260;
const PAD = { left: 64, right: 16, top: 16, bottom: 28 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;
const TEAL = '#0F766E';
const RED = '#DC2626';
const AMBER = '#D97706';
const BLUE = '#2563EB';
const GRID = '#E7E2D8';
const MUTED = '#6B6259';

// Short rupee label for axis ticks, e.g. 1,50,000 -> ₹1.5L, 4,000 -> ₹4k.
function compactINR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${Math.round(abs / 1000)}k`;
  }
  return formatINR(n);
}

export default function ForecastChart({
  points,
  buffer,
  label,
  compare,
  compareLabel,
}: {
  points: ChartPoint[];
  buffer: number;
  label: string;
  compare?: ChartPoint[];
  compareLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div>
        <h3 className="chart-caption">{label}</h3>
        <p className="muted">No forecast points.</p>
      </div>
    );
  }

  const n = points.length;
  const xAt = (i: number, count: number): number =>
    PAD.left + (count <= 1 ? INNER_W / 2 : (i * INNER_W) / (count - 1));

  // Y domain always includes 0, the buffer, and every plotted balance.
  const all = [
    0,
    buffer,
    ...points.map((p) => p.balance),
    ...(compare ?? []).map((p) => p.balance),
  ];
  const lo = Math.min(...all);
  const hi = Math.max(...all, lo + 1);
  const yAt = (v: number): number => PAD.top + INNER_H * (1 - (v - lo) / (hi - lo));
  const ticks = [0, 1, 2, 3, 4].map((k) => lo + ((hi - lo) * k) / 4);

  // A segment is teal only when both ends sit at or above the buffer; otherwise crimson.
  const segments = points.slice(1).map((b, j) => {
    const a = points[j];
    const above = a.balance >= buffer && b.balance >= buffer;
    return (
      <line
        key={j}
        x1={xAt(j, n)}
        y1={yAt(a.balance)}
        x2={xAt(j + 1, n)}
        y2={yAt(b.balance)}
        stroke={above ? TEAL : RED}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    );
  });

  const handleMove = (e: SvgMouseEvent<SVGSVGElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const xv = ((e.clientX - rect.left) * W) / rect.width;
    const step = n > 1 ? INNER_W / (n - 1) : 1;
    const idx = n > 1 ? Math.round((xv - PAD.left) / step) : 0;
    setHover(Math.min(n - 1, Math.max(0, idx)));
  };

  const hp = hover !== null ? points[hover] : undefined;
  const hx = hover !== null ? xAt(hover, n) : 0;
  const hy = hp ? yAt(hp.balance) : 0;
  const hpAbove = hp ? hp.balance >= buffer : true;

  return (
    <div>
      <h3 className="chart-caption">{label}</h3>
      <div className="chart-wrap">
        <svg
          className="chart-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={label}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((v, k) => (
            <g key={k}>
              <line x1={PAD.left} x2={W - PAD.right} y1={yAt(v)} y2={yAt(v)} stroke={GRID} />
              <text
                x={PAD.left - 6}
                y={yAt(v)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill={MUTED}
              >
                {compactINR(v)}
              </text>
            </g>
          ))}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yAt(buffer)}
            y2={yAt(buffer)}
            stroke={AMBER}
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
          <text
            x={W - PAD.right}
            y={yAt(buffer) - 5}
            textAnchor="end"
            fontSize={11}
            fill={AMBER}
          >
            Safety buffer
          </text>
          {n > 1 && (
            <>
              <text x={PAD.left} y={H - 8} fontSize={11} fill={MUTED}>
                {formatDate(points[0].date)}
              </text>
              <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize={11} fill={MUTED}>
                {formatDate(points[n - 1].date)}
              </text>
            </>
          )}
          {compare && compare.length > 0 && (
            <polyline
              points={compare
                .map((p, i) => `${xAt(i, compare.length)},${yAt(p.balance)}`)
                .join(' ')}
              fill="none"
              stroke={BLUE}
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          )}
          {segments}
          {hp && (
            <>
              <line
                x1={hx}
                x2={hx}
                y1={PAD.top}
                y2={PAD.top + INNER_H}
                stroke={MUTED}
                strokeDasharray="2 3"
              />
              <circle cx={hx} cy={hy} r={4} fill={hpAbove ? TEAL : RED} stroke="#fff" strokeWidth={1.5} />
            </>
          )}
        </svg>
        {hp && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(hx / W) * 100}%`,
              top: `${(hy / H) * 100}%`,
              transform:
                hx / W > 0.6 ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)',
            }}
          >
            <strong>{formatDate(hp.date)}</strong>
            <div>
              Money in: <span className="in-amt">{formatINR(hp.moneyIn)}</span>
            </div>
            <div>
              Money out: <span className="out-amt">{formatINR(hp.moneyOut)}</span>
            </div>
            {hp.events.length > 0 ? (
              <ul>
                {hp.events.map((ev, i) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            ) : (
              <div className="muted">No events</div>
            )}
            <div>Closing balance: {formatINR(hp.balance)}</div>
            <div style={{ color: hpAbove ? TEAL : RED, fontWeight: 600 }}>
              {hpAbove ? 'Above buffer' : `Below buffer by ${formatINR(buffer - hp.balance)}`}
            </div>
          </div>
        )}
      </div>
      <div className="chart-legend">
        <span>
          <span className="chart-legend-swatch" style={{ background: TEAL }} />
          At or above buffer
        </span>
        <span>
          <span className="chart-legend-swatch" style={{ background: RED }} />
          Below buffer
        </span>
        <span>
          <span className="chart-legend-swatch" style={{ background: AMBER }} />
          Safety buffer
        </span>
        {compare && compareLabel && (
          <span>
            <span className="chart-legend-swatch" style={{ background: BLUE }} />
            {compareLabel}
          </span>
        )}
      </div>
    </div>
  );
}
