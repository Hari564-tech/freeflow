import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

/* ---------- Input / AmountInput / Select ---------- */
type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
};
export function Input({ label, error, id, ...rest }: InputProps) {
  const inputId = id ?? `ui-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <label className="ui-field" htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} className="ui-input" aria-invalid={error ? true : undefined} {...rest} />
      {error ? (
        <p className="ui-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </label>
  );
}

export function AmountInput({
  label,
  error,
  id,
  ...rest
}: Omit<InputProps, 'type' | 'inputMode'>) {
  const inputId = id ?? `ui-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <label className="ui-field" htmlFor={inputId}>
      <span>{label}</span>
      <span className="ui-amount-wrap">
        <input
          id={inputId}
          className="ui-input"
          type="text"
          inputMode="decimal"
          aria-invalid={error ? true : undefined}
          {...rest}
        />
      </span>
      {error ? (
        <p className="ui-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </label>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string | null;
};
export function Select({ label, error, id, children, ...rest }: SelectProps) {
  const selectId = id ?? `ui-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <label className="ui-field" htmlFor={selectId}>
      <span>{label}</span>
      <select id={selectId} className="ui-select" aria-invalid={error ? true : undefined} {...rest}>
        {children}
      </select>
      {error ? (
        <p className="ui-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </label>
  );
}

/* ---------- SegmentedControl ---------- */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Tabs (accessible) ---------- */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="ui-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === active}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- ListRow ---------- */
export function ListRow({
  avatar,
  title,
  sub,
  amount,
  pill,
  onClick,
  label,
}: {
  avatar?: ReactNode;
  title: string;
  sub?: string;
  amount?: string;
  pill?: ReactNode;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button type="button" className="list-row" onClick={onClick} aria-label={label ?? title}>
      {avatar}
      <span className="list-row-main">
        <span className="list-row-title">{title}</span>
        {sub !== undefined && <span className="list-row-sub">{sub}</span>}
      </span>
      <span className="list-row-right">
        {amount !== undefined && <span className="list-row-amount">{amount}</span>}
        {pill}
      </span>
    </button>
  );
}
