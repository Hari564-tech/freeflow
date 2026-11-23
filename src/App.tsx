import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  Banknote,
  Bell,
  Calculator,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  Landmark,
  Monitor,
  Moon,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { AppData, AppState, TemplateId } from './types';
import { loadState, saveState, resetState } from './storage';
import { balance } from './forecast';
import { formatDate, formatINR } from './format';
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
import { Confetti, Toasts } from './components/ui';

const REFERENCE_DATE = '2026-11-21';

type Theme = 'light' | 'dark' | 'system';

const TEMPLATE_LABELS: Record<TemplateId, string> = {
  tutor: 'Home Tutor',
  designer: 'Freelance Designer',
  salon: 'Neighbourhood Salon',
};

const NAV_ITEMS: { route: Route; label: string; Icon: typeof Home }[] = [
  { route: 'dashboard', label: 'Dashboard', Icon: Home },
  { route: 'students', label: 'Students', Icon: Users },
  { route: 'invoices', label: 'Invoices', Icon: Receipt },
  { route: 'forecast', label: 'Forecast', Icon: TrendingUp },
  { route: 'whatif', label: 'What-if', Icon: Calculator },
  { route: 'bills', label: 'Bills', Icon: Landmark },
  { route: 'alerts', label: 'Alerts', Icon: Bell },
  { route: 'settings', label: 'Settings', Icon: SettingsIcon },
];

const MONEY_ITEMS: { route: Route; label: string; Icon: typeof Home }[] = [
  { route: 'invoices', label: 'Invoices', Icon: Receipt },
  { route: 'forecast', label: 'Forecast', Icon: TrendingUp },
  { route: 'whatif', label: 'What-if', Icon: Calculator },
  { route: 'bills', label: 'Bills', Icon: Landmark },
];

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0].slice(0, 1) + words[1].slice(0, 1)).toUpperCase();
}

function readTheme(): Theme {
  const saved = window.localStorage.getItem('feeflow_theme');
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') {
    return theme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const { route, preset } = useRoute();
  const [tourOpen, setTourOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => readTheme());
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => window.localStorage.getItem('feeflow_sidebar_collapsed') === '1',
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [sheet, setSheet] = useState<'add' | 'money' | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [search, setSearch] = useState('');
  const [logo, setLogo] = useState<string | null>(() =>
    window.localStorage.getItem('feeflow_logo'),
  );
  const [burstKey, setBurstKey] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // ---- Theme: apply data-theme + theme-color, follow the OS when 'system' ----
  useEffect(() => {
    const apply = (): void => {
      const resolved = resolveTheme(theme);
      document.documentElement.dataset.theme = resolved;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', resolved === 'dark' ? '#0B1020' : '#F8FAFC');
      }
    };
    apply();
    window.localStorage.setItem('feeflow_theme', theme);
    if (theme !== 'system') {
      return undefined;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => apply();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  function cycleTheme(): void {
    setTheme((t) => (t === 'light' ? 'dark' : t === 'dark' ? 'system' : 'light'));
  }
  const effectiveTheme = resolveTheme(theme);
  const ThemeIcon = theme === 'system' ? Monitor : effectiveTheme === 'dark' ? Moon : Sun;

  // ---- Logo uploaded in Settings ----
  useEffect(() => {
    const onLogo = (): void => setLogo(window.localStorage.getItem('feeflow_logo'));
    window.addEventListener('feeflow-logo', onLogo);
    return () => window.removeEventListener('feeflow-logo', onLogo);
  }, []);

  // ---- Confetti on first payment of the session (PaymentDrawer dispatches) ----
  useEffect(() => {
    const onPaid = (): void => setBurstKey((k) => k + 1);
    window.addEventListener('feeflow-paid', onPaid);
    return () => window.removeEventListener('feeflow-paid', onPaid);
  }, []);

  // ---- Sticky mobile header shrinks on scroll ----
  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ---- Profile menu + action sheets: Esc / outside-click close, scroll lock ----
  useEffect(() => {
    if (!profileOpen && sheet === null) {
      return undefined;
    }
    const onMouseDown = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (profileOpen && profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (sheet !== null && sheetRef.current && !sheetRef.current.contains(target)) {
        setSheet(null);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setSheet(null);
      }
    };
    const previousOverflow = document.body.style.overflow;
    if (sheet !== null) {
      document.body.style.overflow = 'hidden';
    }
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [profileOpen, sheet]);

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
  const overdueInvoices = data.invoices.filter(
    (inv) => balance(inv) > 0 && inv.dueDate < REFERENCE_DATE,
  );
  const overdueCount = overdueInvoices.length;
  const totalOutstanding = data.invoices.reduce(
    (sum, inv) => sum + Math.max(0, balance(inv)),
    0,
  );
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + balance(inv), 0);
  const badge =
    overdueCount > 0 ? (
      <span className="nav-badge" key={overdueCount}>
        {overdueCount}
      </span>
    ) : null;

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
    setProfileOpen(false);
  }

  function toggleSidebar(): void {
    setSidebarCollapsed((c) => {
      window.localStorage.setItem('feeflow_sidebar_collapsed', c ? '0' : '1');
      return !c;
    });
  }

  function submitSearch(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const q = search.trim();
    if (q === '') {
      return;
    }
    window.localStorage.setItem('feeflow_search', q);
    window.location.hash = '#/students';
    window.dispatchEvent(new CustomEvent('feeflow-search', { detail: q }));
    setSearch('');
    setProfileOpen(false);
  }

  function openAddStudent(): void {
    window.localStorage.setItem('feeflow_open_add', '1');
    window.location.hash = '#/students';
    setSheet(null);
  }

  function openNewInvoice(): void {
    window.localStorage.setItem('feeflow_open_new_invoice', '1');
    window.location.hash = '#/invoices';
    setSheet(null);
  }

  function linkClass(base: string, r: Route): string {
    return r === route ? `${base} active` : base;
  }

  function renderPage(): ReactNode {
    switch (route) {
      case 'dashboard':
        return (
          <DashboardTab
            data={data}
            profile={profile}
            onStartTour={() => setTourOpen(true)}
            onChange={update}
            dueDays={state.dueDays}
            templateId={state.activeTemplateId}
            templateLabel={TEMPLATE_LABELS[state.activeTemplateId]}
          />
        );
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
        return (
          <SettingsTab
            data={data}
            onChange={update}
            state={state}
            onStateChange={setAppState}
            onReset={handleReset}
            theme={theme}
            onThemeChange={setTheme}
          />
        );
    }
  }

  const moneyActive = MONEY_ITEMS.some((m) => m.route === route);

  return (
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Desktop left sidebar */}
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          {logo !== null ? (
            <img src={logo} alt="" width={38} height={38} style={{ borderRadius: 12, objectFit: 'cover' }} />
          ) : (
            <span className="sidebar-brand-mark">F</span>
          )}
          <div>
            <div className="sidebar-brand-name">FeeFlow</div>
            <div className="sidebar-biz">{business.businessName}</div>
          </div>
        </div>
        <nav aria-label="Sections">
          {NAV_ITEMS.map(({ route: r, label, Icon }) => (
            <a key={r} href={`#/${r}`} className={linkClass('sidebar-link', r)}>
              <Icon aria-hidden="true" />
              <span className="sidebar-label">{label}</span>
              {r === 'alerts' && badge}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="badge demo sidebar-foot-text">Demo data</span>
          <span className="template-label sidebar-foot-text">
            {TEMPLATE_LABELS[state.activeTemplateId]}
          </span>
          <button type="button" className="sidebar-collapse" onClick={toggleSidebar} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
            <span className="sidebar-label">Collapse</span>
          </button>
        </div>
      </aside>

      <div className="app-main-wrap">
        {/* Desktop top bar: search, theme toggle, alerts, profile */}
        <header className="topbar">
          <form className="topbar-search" onSubmit={submitSearch} role="search">
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Search students…"
              aria-label="Search students"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <div className="topbar-right">
            <span className="topbar-ref">Reference date: {formatDate(REFERENCE_DATE)}</span>
            <button
              type="button"
              className="icon-btn"
              onClick={cycleTheme}
              aria-label={`Switch theme (currently ${theme})`}
              title={`Theme: ${theme} — click to change`}
            >
              <ThemeIcon aria-hidden="true" />
            </button>
            <a href="#/alerts" className="icon-btn" aria-label={`Alerts${overdueCount > 0 ? `, ${overdueCount} overdue` : ''}`}>
              <Bell aria-hidden="true" />
              {badge}
            </a>
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="topbar-avatar"
                onClick={() => setProfileOpen((o) => !o)}
                aria-expanded={profileOpen}
                aria-label="Profile menu"
              >
                {initials(business.ownerName)}
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <a href="#/settings" onClick={() => setProfileOpen(false)}>
                    <SettingsIcon aria-hidden="true" /> Settings
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setTourOpen(true);
                    }}
                  >
                    <Sparkles aria-hidden="true" /> 60-sec tour
                  </button>
                  <button type="button" onClick={handleReset}>
                    <RotateCcw aria-hidden="true" /> Reset demo data
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile header: sticky, shrinks on scroll */}
        <header className={`app-header${scrolled ? ' scrolled' : ''}`}>
          <div className="mobile-header">
            <div className="mobile-logo">
              {logo !== null ? (
                <img src={logo} alt="" width={34} height={34} style={{ borderRadius: 9, objectFit: 'cover' }} />
              ) : (
                <img src="/favicon.svg" alt="" width={34} height={34} />
              )}
              FeeFlow
            </div>
            <div className="mobile-head-right">
              <button
                type="button"
                className="icon-btn mobile-bell"
                onClick={cycleTheme}
                aria-label={`Switch theme (currently ${theme})`}
                style={{ border: 'none', background: 'none' }}
              >
                <ThemeIcon aria-hidden="true" />
              </button>
              <a href="#/alerts" className="mobile-bell" aria-label={`Alerts${overdueCount > 0 ? `, ${overdueCount} overdue` : ''}`}>
                <Bell aria-hidden="true" />
                {overdueCount > 0 && <span className="bell-dot" key={overdueCount} />}
              </a>
              <a href="#/settings" className="mobile-avatar" aria-label="Settings and profile">
                {initials(business.ownerName)}
              </a>
            </div>
          </div>
          <div className="mobile-summary" aria-label="Fee summary">
            <span>
              Pending <strong>{formatINR(totalOutstanding)}</strong>
            </span>
            <span>
              Overdue <strong className="over">{formatINR(totalOverdue)}</strong>
            </span>
            <span>
              {overdueCount} {overdueCount === 1 ? 'invoice' : 'invoices'} overdue
            </span>
          </div>
        </header>

        <main className="app-main">
          <div key={route} className="page-enter">
            {renderPage()}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar: Home, Students, + , Money, Alerts */}
      <nav className="bottom-nav" aria-label="Sections">
        <a href="#/dashboard" className={linkClass('bottom-link', 'dashboard')}>
          <Home aria-hidden="true" />
          Home
        </a>
        <a href="#/students" className={linkClass('bottom-link', 'students')}>
          <Users aria-hidden="true" />
          Students
        </a>
        <div className="bottom-fab-wrap">
          <button
            type="button"
            className="bottom-fab"
            onClick={() => setSheet(sheet === 'add' ? null : 'add')}
            aria-expanded={sheet === 'add'}
            aria-label="Add — create a student, invoice or payment"
          >
            {sheet === 'add' ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
          </button>
        </div>
        <button
          type="button"
          className={`bottom-link${moneyActive ? ' active' : ''}`}
          onClick={() => setSheet(sheet === 'money' ? null : 'money')}
          aria-expanded={sheet === 'money'}
        >
          <Wallet aria-hidden="true" />
          Money
        </button>
        <a href="#/alerts" className={linkClass('bottom-link', 'alerts')}>
          <Bell aria-hidden="true" />
          Alerts
          {badge}
        </a>
      </nav>

      {/* Action sheets for the + FAB and Money tab */}
      {sheet !== null && (
        <>
          <div className="tab-sheet-backdrop" onClick={() => setSheet(null)} />
          <div className="tab-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-label={sheet === 'add' ? 'Add' : 'Money'}>
            {sheet === 'add' ? (
              <>
                <button type="button" className="tab-sheet-item" onClick={openAddStudent}>
                  <UserPlus aria-hidden="true" /> Add student
                  <span className="muted">New payer</span>
                </button>
                <button type="button" className="tab-sheet-item" onClick={openNewInvoice}>
                  <FileText aria-hidden="true" /> New invoice
                  <span className="muted">Bill a student</span>
                </button>
                <button
                  type="button"
                  className="tab-sheet-item"
                  onClick={() => {
                    window.location.hash = '#/invoices';
                    setSheet(null);
                  }}
                >
                  <Banknote aria-hidden="true" /> Record payment
                  <span className="muted">Mark a fee paid</span>
                </button>
              </>
            ) : (
              MONEY_ITEMS.map(({ route: r, label, Icon }) => (
                <a
                  key={r}
                  href={`#/${r}`}
                  className={r === route ? 'active' : undefined}
                  onClick={() => setSheet(null)}
                >
                  <Icon aria-hidden="true" /> {label}
                  {r === route && <span className="muted">You are here</span>}
                </a>
              ))
            )}
          </div>
        </>
      )}

      <Confetti burstKey={burstKey} />
      <Toasts />
      {tourOpen && <Tour onClose={closeTour} />}
    </div>
  );
}
