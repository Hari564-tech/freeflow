// FeeFlow M6-expanded — "Why switch from a notebook?" pricing modal.
// Plans from the brief; the recovered / time-saved figures are computed live
// from the app's own data (collected this month, reminders sent).
import { useEffect, useRef } from 'react';
import type { AppData, AppState } from '../types';
import { formatINR } from '../format';
import { useFocusTrap } from '../useFocusTrap';

type Props = {
  data: AppData;
  state: AppState;
  onClose: () => void;
};

const PLANS: { name: string; price: string; blurb: string; points: string[] }[] = [
  {
    name: 'Free',
    price: '₹0',
    blurb: 'For trying FeeFlow out.',
    points: ['Up to 10 students', 'Invoices + payment tracking', '30-day cash forecast'],
  },
  {
    name: 'Solo Pro',
    price: '₹199 / month',
    blurb: 'For the one-person back office.',
    points: [
      'Unlimited students, customers and invoices',
      'Unlimited forecasts + what-if scenarios',
      'Unlimited WhatsApp reminders + UPI QR codes',
      'Local-first: your data stays in your browser',
    ],
  },
  {
    name: 'Coaching Studio',
    price: '₹499 / month',
    blurb: 'For a small coaching centre.',
    points: ['Everything in Solo Pro', 'Multiple batches + staff', 'Priority support'],
  },
];

export default function PricingModal({ data, state, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const monthPrefix = data.referenceDate.slice(0, 7);
  let collectedThisMonth = 0;
  for (const inv of data.invoices) {
    for (const p of inv.payments) {
      if (p.date.startsWith(monthPrefix)) {
        collectedThisMonth += p.amount;
      }
    }
  }
  const remindersSent = Object.keys(state.reminders).length;
  // Estimate, labelled as one: each WhatsApp chase replaces ~10 minutes of
  // calls, notebook hunting and follow-up arithmetic.
  const minutesSaved = remindersSent * 10;

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={onClose}>
      <div
        className="modal pricing-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Why switch from a notebook?"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Why switch from a notebook?</h2>
        <p className="muted">
          A notebook never tells you who owes what, or whether next month&apos;s rent is covered.
          FeeFlow does — and it keeps the proof.
        </p>
        <div className="pricing-proof">
          <div>
            <strong>{formatINR(collectedThisMonth)}</strong>
            <span>recovered this month</span>
          </div>
          <div>
            <strong>{remindersSent}</strong>
            <span>reminders sent</span>
          </div>
          <div>
            <strong>~{minutesSaved} min</strong>
            <span>chasing time saved (est.)</span>
          </div>
        </div>
        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div key={plan.name} className="card pricing-plan">
              <h3>{plan.name}</h3>
              <div className="pricing-price">{plan.price}</div>
              <p className="muted">{plan.blurb}</p>
              <ul>
                {plan.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="muted">
          One fee caught on time pays for months of Solo Pro.
        </p>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Back to FeeFlow
          </button>
        </div>
      </div>
    </div>
  );
}
