import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData, AppState, TemplateId } from './types';
import { loadState, saveState, resetState } from './storage';
import { balance } from './forecast';
import { formatDate } from './format';
import { parseHash, useRoute, type Route } from './router';
import DashboardTab from './components/DashboardTab';
import InvoicesTab from './components/InvoicesTab';
import ForecastTab from './components/ForecastTab';
import AlertsTab from './components/AlertsTab';
import StudentsTab from './components/StudentsTab';
import BillsTab from './components/BillsTab';
import WhatIfTab from './components/WhatIfTab';
import SettingsTab from './components/SettingsTab';
import Tour from './components/Tour';

const REFERENCE_DATE = '2026-11-21';

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  tutor: 'Home Tutor',
  designer: 'Freelance Designer',
  salon: 'Neighbourhood Salon',
};

const MAIN_LINKS: { route: Route; label: string }[] = [
  { route: 'dashboard', label: 'Dashboard' },
  { route: 'invoices', label: 'Invoices' },
  { route: 'forecast', label: 'Forecast' },
  { route: 'alerts', label: 'Alerts' },
];

const MORE_LINKS: { route: Route; label: string }[] = [
  { route: 'students', label: 'Students' },
  { route: 'bills', label: 'Bills' },
  { route: 'whatif', label: 'What-if' },
  { route: 'settings', label: 'Settings' },
];

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const { route, preset } = useRoute();
  const [moreOpen, setMoreOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    // First visit only, and only when landing on the Dashboard: a deep link
    // to another page must not be yanked away by the tour.
    if (
      window.localStorage.getItem('feeflow_tour_seen') === null &&
      parseHash(window.location.hash).route === 'dashboard'
    ) {
      setTourOpen(true);
    }
  }, []);

  function closeTour(): void {
    window.localStorage.setItem('feeflow_tour_seen', '1');
    setTourOpen(false);
  }

  const data = useMemo<AppData>(() => {
    const t = state.templates[state.activeTemplateId];
    return {
      version: 2,
      referenceDate: REFERENCE_DATE,
      openingCash: t.openingCash,
      safetyBuffer: t.safetyBuffer,
      business: t.business,
      students: t.students,
      invoices: t.invoices,
      bills: t.bills,
    };
  }, [state]);

  const business = data.business;
  const profile = state.templates[state.activeTemplateId].business;
  const peopleLabel = state.activeTemplateId === 'tutor' ? 'Students' : 'Customers';
  const overdueCount = data.invoices.filter(
    (inv) => balance(inv) > 0 && inv.dueDate < REFERENCE_DATE,
  ).length;
  const badge = overdueCount > 0 ? <span className="nav-badge">{overdueCount}</span> : null;

  function update(next: AppData): void {
    const current = state.templates[state.activeTemplateId];
    const newState: AppState = {
      ...state,
      templates: {
        ...state.templates,
        [state.activeTemplateId]: {
          ...current,
          business: next.business,
          students: next.students,
          invoices: next.invoices,
          bills: next.bills,
          openingCash: next.openingCash,
          safetyBuffer: next.safetyBuffer,
        },
      },
    };
    setState(newState);
    saveState(newState);
  }

  function setAppState(next: AppState): void {
    setState(next);
    saveState(next);
  }

  function handleReset(): void {
    if (!window.confirm('Reset all FeeFlow data to the demo data set? This cannot be undone.')) {
      return;
    }
    const s = resetState();
    setState(s);
  }

  function linkClass(base: string, r: Route): string {
    return r === route ? `${base} active` : base;
  }

  function renderPage(): ReactNode {
    switch (route) {
      case 'dashboard':
        return <DashboardTab data={data} profile={profile} onStartTour={() => setTourOpen(true)} />;
      case 'invoices':
        return <InvoicesTab data={data} onChange={update} profile={profile} dueDays={state.dueDays} />;
      case 'forecast':
        return <ForecastTab data={data} onChange={update} />;
      case 'alerts':
        return <AlertsTab data={data} state={state} onStateChange={setAppState} />;
      case 'students':
        return <StudentsTab data={data} onChange={update} peopleLabel={peopleLabel} />;
      case 'bills':
        return <BillsTab data={data} onChange={update} />;
      case 'whatif':
        return <WhatIfTab key={preset ?? 'base'} data={data} initialScenario={preset === 'overdue' ? { overdueUnpaid: true } : undefined} />;
      case 'settings':
        return <SettingsTab data={data} onChange={update} state={state} onStateChange={setAppState} onReset={handleReset} />;
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">{business.businessName}</h1>
          <p className="app-subtitle">Owner: {business.ownerName}</p>
        </div>
        <div className="header-meta">
          <span className="badge demo">Demo data</span>
          <span className="template-label">{TEMPLATE_LABELS[state.activeTemplateId]}</span>
          <span className="reference-date">Reference date: {formatDate(REFERENCE_DATE)}</span>
          <button type="button" className="btn btn-ghost" onClick={() => setTourOpen(true)}>
            60-sec tour
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleReset}>
            Reset demo data
          </button>
        </div>
      </header>

      <nav className="top-nav" aria-label="Sections">
        {[...MAIN_LINKS, ...MORE_LINKS].map((l) => (
          <a key={l.route} href={`#/${l.route}`} className={linkClass('nav-link', l.route)}>
            {l.label}
            {l.route === 'alerts' && badge}
          </a>
        ))}
      </nav>

      <main className="app-main">{renderPage()}</main>

      <nav className="bottom-nav" aria-label="Sections">
        {MAIN_LINKS.map((l) => (
          <a key={l.route} href={`#/${l.route}`} className={linkClass('bottom-link', l.route)}>
            {l.label}
            {l.route === 'alerts' && badge}
          </a>
        ))}
        <button
          type="button"
          className="bottom-link"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          More
        </button>
        {moreOpen && (
          <div className="more-menu">
            {MORE_LINKS.map((l) => (
              <a key={l.route} href={`#/${l.route}`} onClick={() => setMoreOpen(false)}>
                {l.label}
              </a>
            ))}
          </div>
        )}
      </nav>

      {tourOpen && <Tour onClose={closeTour} />}
    </div>
  );
}
