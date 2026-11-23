import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../useFocusTrap';

/* ---------- Shared overlay shell: Esc + overlay click + focus trap + scroll lock ---------- */
function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return ref;
}

type ShellProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: ShellProps) {
  const ref = useOverlay(open, onClose);
  if (!open) {
    return null;
  }
  return (
    <div className="ui-sheet-overlay" onClick={onClose}>
      <div
        className="ui-sheet"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ui-sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children }: ShellProps) {
  const ref = useOverlay(open, onClose);
  if (!open) {
    return null;
  }
  return (
    <div className="ui-drawer-overlay" onClick={onClose}>
      <div
        className="ui-drawer"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ui-drawer-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: ShellProps) {
  const ref = useOverlay(open, onClose);
  if (!open) {
    return null;
  }
  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div
        className="ui-modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ui-modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Toast: toast(message, {label, onAction}) + <Toasts/> ---------- */
export type ToastAction = { label: string; onAction: () => void };
export function toast(message: string, action?: ToastAction): void {
  window.dispatchEvent(
    new CustomEvent('feeflow-toast', { detail: { message, action } }),
  );
}

type ToastItem = { id: number; message: string; action?: ToastAction };
export function Toasts() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const onToast = (e: Event): void => {
      const detail = (e as CustomEvent<{ message: string; action?: ToastAction }>).detail;
      const id = ++idRef.current;
      setItems((prev) => [...prev, { id, message: detail.message, action: detail.action }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };
    window.addEventListener('feeflow-toast', onToast);
    return () => window.removeEventListener('feeflow-toast', onToast);
  }, []);

  if (items.length === 0) {
    return null;
  }
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast-item">
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.onAction();
                setItems((prev) => prev.filter((x) => x.id !== t.id));
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- Confetti burst (rendered by App on the 'feeflow-paid' event) ---------- */
const CONFETTI_COLORS = ['#4F46E5', '#8B5CF6', '#34D399', '#FBBF24', '#F87171', '#38BDF8'];
export function Confetti({ burstKey }: { burstKey: number }) {
  if (burstKey === 0) {
    return null;
  }
  const pieces = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2 + 0.3;
    const dist = 90 + (i % 5) * 42;
    return {
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist - 60}px`,
      bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${42 + (i % 7) * 2.5}%`,
      delay: `${(i % 6) * 0.02}s`,
    };
  });
  return (
    <div className="confetti-layer" key={burstKey} aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              '--dx': p.dx,
              '--dy': p.dy,
              background: p.bg,
              left: p.left,
              animationDelay: p.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
