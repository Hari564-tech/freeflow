import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { formatDate, formatINR } from '../../format';
import {
  AlertTriangle,
  Check,
  Circle,
  Clock,
  MinusCircle,
  Send,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

/* ---------- Button ---------- */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
};
export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...rest
}: ButtonProps) {
  const cls = `btn${variant === 'primary' ? ' btn-primary' : ''}${
    variant === 'ghost' ? ' btn-ghost' : ''
  }${variant === 'danger' ? ' btn-danger' : ''}${size === 'sm' ? ' btn-sm' : ''} ${className}`.trim();
  return <button type="button" className={cls} {...rest} />;
}

export function IconButton({
  label,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className={`icon-btn ${className}`.trim()} aria-label={label} {...rest} />
  );
}

/* ---------- Chip ---------- */
export function Chip({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
}) {
  const cls =
    tone === 'neutral'
      ? 'chip'
      : `chip chip-${tone}`;
  return <span className={cls}>{children}</span>;
}

/* ---------- StatusPill: icon + label + colour, never colour alone ---------- */
export type PillStatus = 'paid' | 'due' | 'overdue' | 'partial' | 'sent' | 'unpaid';
const PILL_META: Record<PillStatus, { label: string; cls: string; Icon: typeof Check }> = {
  paid: { label: 'Paid', cls: 'pill-paid', Icon: Check },
  due: { label: 'Due soon', cls: 'pill-due', Icon: Clock },
  overdue: { label: 'Overdue', cls: 'pill-overdue', Icon: AlertTriangle },
  partial: { label: 'Partial', cls: 'pill-partial', Icon: MinusCircle },
  sent: { label: 'Sent', cls: 'pill-sent', Icon: Send },
  unpaid: { label: 'Unpaid', cls: 'pill-unpaid', Icon: Circle },
};
export function StatusPill({ status, label }: { status: PillStatus; label?: string }) {
  const meta = PILL_META[status];
  const Icon = meta.Icon;
  return (
    <span className={`pill ${meta.cls}`}>
      <Icon aria-hidden="true" />
      {label ?? meta.label}
    </span>
  );
}

/* ---------- Avatar (initials; tones cycle like the mobile rows) ---------- */
const AVATAR_TONES = ['av-mint', 'av-lav', 'av-peach', 'av-sky'];
export function avatarTone(index: number): string {
  return AVATAR_TONES[((index % AVATAR_TONES.length) + AVATAR_TONES.length) % AVATAR_TONES.length];
}
export function initialsOf(name: string): string {
  const [first = '', second = ''] = name.trim().split(/\s+/);
  if (second !== '') {
    return (first.charAt(0) + second.charAt(0)).toUpperCase();
  }
  return first.slice(0, 2).toUpperCase();
}
export function Avatar({
  name,
  index = 0,
  ring,
  className = '',
}: {
  name: string;
  index?: number;
  ring?: 'overdue' | 'due' | 'paid';
  className?: string;
}) {
  const ringCls = ring ? ` ring-${ring}` : '';
  return (
    <span className={`m-avatar ${avatarTone(index)}${ringCls} ${className}`.trim()} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}

/* ---------- Card / StatCard / ProgressBar ---------- */
export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${className}`.trim()}>
      {(title !== undefined || actions !== undefined) && (
        <div className="m-card-head">
          <div>
            {title !== undefined && <h2>{title}</h2>}
            {subtitle !== undefined && <p className="muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  trend,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down';
  tone?: 'danger' | 'success';
}) {
  return (
    <div className={`card stat-card${tone === 'danger' ? ' stat-danger' : ''}${tone === 'success' ? ' stat-info' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub !== undefined && (
        <div className="stat-sub">
          {trend === 'up' && <TrendingUp aria-hidden="true" />}
          {trend === 'down' && <TrendingDown aria-hidden="true" />} {sub}
        </div>
      )}
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  ariaLabel,
}: {
  value: number; // 0-100
  label?: string;
  ariaLabel?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label !== undefined && <div className="muted">{label}</div>}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel ?? label}
      >
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ---------- Skeleton / EmptyState / Tooltip ---------- */
export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: string | number }) {
  return <div className="sk" style={{ height, width }} aria-hidden="true" />;
}
export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0' }} aria-hidden="true">
      <Skeleton height={40} width={40} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton height={14} width="55%" />
        <Skeleton height={12} width="80%" />
      </div>
      <Skeleton height={18} width={64} />
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {body !== undefined && <p>{body}</p>}
      {action}
    </div>
  );
}
export function Tooltip({ tip, children }: { tip: string; children: ReactNode }) {
  return (
    <span className="ui-tooltip" data-tip={tip} aria-label={tip}>
      {children}
    </span>
  );
}

/* ---------- Money: the one INR formatter (en-IN, no paise) ---------- */
export function Money({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`money ${className}`.trim()}>{formatINR(value)}</span>;
}

/* ---------- DateText: never renders an ISO string in the UI ---------- */
export function DateText({ value, className = '' }: { value: string; className?: string }) {
  return <span className={`date-text ${className}`.trim()}>{formatDate(value)}</span>;
}
