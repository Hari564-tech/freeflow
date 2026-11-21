import { useState } from 'react';
import type { AppData } from './types';
import { loadData, saveData, resetData } from './storage';
import { formatDate } from './format';
import DashboardTab from './components/DashboardTab';
import InvoicesTab from './components/InvoicesTab';
import ForecastTab from './components/ForecastTab';
import AlertsTab from './components/AlertsTab';

type TabId = 'dashboard' | 'invoices' | 'forecast' | 'alerts';

const TABS: { id: TabId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'alerts', label: 'Alerts' },
];

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [tab, setTab] = useState<TabId>('dashboard');

  function update(next: AppData): void {
    setData(next);
    saveData(next);
  }

  function handleReset(): void {
    if (!window.confirm('Reset all FeeFlow data to the demo data set? This cannot be undone.')) {
      return;
    }
    setData(resetData());
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <h1>FeeFlow</h1>
          <p className="subtitle">Priya Sharma · Home Tutor, Maths and Science</p>
        </div>
        <div className="header-meta">
          <span className="badge badge-demo">Demo data</span>
          <span className="reference-date">
            Reference date: Sat {formatDate(data.referenceDate)}
          </span>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            Reset demo data
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'tab tab-active' : 'tab'}
            aria-pressed={t.id === tab}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'dashboard' && <DashboardTab data={data} />}
        {tab === 'invoices' && <InvoicesTab data={data} onChange={update} />}
        {tab === 'forecast' && <ForecastTab data={data} />}
        {tab === 'alerts' && <AlertsTab data={data} onChange={update} />}
      </main>
    </div>
  );
}
