import { useEffect, useState } from 'react';
import { navigate, type Route } from '../router';

type Step = {
  route: Route;
  title: string;
  text: string;
};

const STEPS: Step[] = [
  {
    route: 'dashboard',
    title: 'See who owes you',
    text: 'Your Dashboard shows total outstanding, total overdue, what is due in the next 30 days, and your cash position — including the lowest forecast balance and its date.',
  },
  {
    route: 'dashboard',
    title: 'Open a student',
    text: 'Click any row to open the student: their invoices and statuses, reliability badge, parent phone, a Send WhatsApp reminder button and a Show UPI QR button.',
  },
  {
    route: 'invoices',
    title: 'Collect with WhatsApp and UPI QR',
    text: 'On Invoices, record full or partial payments, send WhatsApp reminders, show a real UPI QR code for the balance, print an invoice, or generate a whole month of invoices in one click.',
  },
  {
    route: 'whatif',
    title: 'Test a what-if',
    text: 'Try the preset All December fees 7 days late. The forecast drops below the safety buffer, so you know to chase fees before rent day instead of finding out too late.',
  },
  {
    route: 'invoices',
    title: 'Record a payment',
    text: 'Record Ananya\u2019s Rs 3,000 payment. The invoice flips to paid, the overdue list shrinks, and the forecast recalculates.',
  },
  {
    route: 'settings',
    title: 'Switch business',
    text: 'Settings lets you switch between Home Tutor, Freelance Designer and Neighbourhood Salon, edit your business profile, set due days, and export or import all your data as JSON.',
  },
];

export default function Tour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    navigate(STEPS[step].route);
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="FeeFlow tour"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="muted">
          Step {step + 1} of {STEPS.length} · 60-second tour
        </p>
        <h2>{current.title}</h2>
        <p>{current.text}</p>
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </button>
          {last ? (
            <button type="button" className="btn" onClick={onClose}>
              Finish
            </button>
          ) : (
            <button type="button" className="btn" onClick={() => setStep((s) => s + 1)}>
              Next
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
