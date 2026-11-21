import { useId, useLayoutEffect, useRef, useState } from 'react';
import { formatDate } from '../format';

export interface CollectionPoint {
  date: string;
  value: number;
}

export interface CollectionChartProps {
  points: CollectionPoint[];
  label: string;
}

const W = 640;
const H = 220;
const PAD = { left: 64, right: 16, top: 16, bottom: 28 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;
const TEAL = '#0F766E';
const GRID = '#E7E2D8';
const MUTED = '#6B6259';
const FONT = "'Plus Jakarta Sans', sans-serif";
const DRAW_MS = 700;
const DRAW_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Short rupee label for axis ticks, matching ForecastChart's compactINR.
function compactRs(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${Math.round(abs / 1000)}k`;
  }
  return `${sign}₹${Math.round(n).toLocaleString('en-IN')}`;
}

// 'D Mon YYYY' from formatDate -> 'D Mon' for axis labels.
function shortDate(iso: string): string {
  return formatDate(iso).replace(/\s\d{4}$/, '');
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function CollectionChart({ points, label }: CollectionChartProps) {
  const rawId = useId();
  const gradId = `collection-area-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const pathRef = useRef<SVGPathElement | null>(null);
  const [drawn, setDrawn] = useState(false);

  const n = points.length;
  const key = points.map((p) => `${p.date}:${p.value}`).join('|');
  const reduced = prefersReducedMotion();

  // Re-run the draw-in whenever the data changes.
  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      setDrawn(true);
      return;
    }
    setDrawn(false);
    const path = pathRef.current;
    if (!path) {
      return;
    }
    const len = path.getTotalLength();
    path.style.transition = 'none';
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    // Force a style flush so the start state is committed before transitioning.
    void path.getBoundingClientRect();
    const frame = requestAnimationFrame(() => {
      path.style.transition = `stroke-dashoffset ${DRAW_MS}ms ${DRAW_EASE}`;
      path.style.strokeDashoffset = '0';
      setDrawn(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [key]);

  const maxValue = points.reduce((m, p) => Math.max(m, p.value), 0);
  const hi = Math.max(maxValue, 1);
  const xAt = (i: number): number =>
    PAD.left + (n <= 1 ? INNER_W / 2 : (i * INNER_W) / (n - 1));
  const baseY = PAD.top + INNER_H;
  const yAt = (v: number): number => PAD.top + INNER_H * (1 - v / hi);
  const ticks = [0, hi / 2, hi];

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(p.value)}`)
    .join(' ');
  const areaPath =
    n > 0
      ? `${linePath} L${xAt(n - 1)},${baseY} L${xAt(0)},${baseY} Z`
      : '';

  // First, middle and last dates for the x axis (deduplicated for short series).
  const labelIdx = Array.from(new Set([0, Math.floor((n - 1) / 2), n - 1])).filter(
    (i) => i >= 0 && i < n,
  );
  const anchorFor = (i: number): 'start' | 'middle' | 'end' => {
    if (i === 0) return 'start';
    if (i === n - 1) return 'end';
    return 'middle';
  };

  return (
    <div>
      <h3 className="chart-caption">{label}</h3>
      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: 'block', height: 'auto', fontFamily: FONT }}
          role="img"
          aria-label={label}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TEAL} stopOpacity={0.18} />
              <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
            </linearGradient>
          </defs>

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
                {compactRs(v)}
              </text>
            </g>
          ))}

          {labelIdx.map((i) => (
            <text
              key={i}
              x={xAt(i)}
              y={H - 8}
              textAnchor={anchorFor(i)}
              fontSize={11}
              fill={MUTED}
            >
              {shortDate(points[i].date)}
            </text>
          ))}

          {n > 0 && (
            <path
              d={areaPath}
              fill={`url(#${gradId})`}
              stroke="none"
              style={{
                opacity: drawn ? 1 : 0,
                transition: reduced ? undefined : `opacity ${DRAW_MS}ms ease 200ms`,
              }}
            />
          )}

          {n > 0 && (
            <path
              ref={pathRef}
              d={linePath}
              fill="none"
              stroke={TEAL}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((p, i) => (
            <circle
              key={i}
              cx={xAt(i)}
              cy={yAt(p.value)}
              r={3.5}
              fill="#FFFFFF"
              stroke={TEAL}
              strokeWidth={2}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
