import { useEffect, useState } from 'react';

export type Route =
  | 'dashboard'
  | 'invoices'
  | 'students'
  | 'forecast'
  | 'alerts'
  | 'settings'
  | 'bills'
  | 'whatif';

const ROUTES: Route[] = [
  'dashboard',
  'invoices',
  'students',
  'forecast',
  'alerts',
  'settings',
  'bills',
  'whatif',
];

export type ParsedHash = { route: Route; preset: string | null };

// '#/whatif/overdue' -> { route: 'whatif', preset: 'overdue' }
export function parseHash(hash: string): { route: Route; preset: string | null } {
  const path = hash.replace(/^#/, '').replace(/^\//, '');
  const [first = '', second = ''] = path.split('/');
  let route: Route = 'dashboard';
  if (first === 'customers') {
    route = 'students';
  } else if ((ROUTES as string[]).includes(first)) {
    route = first as Route;
  }
  let preset: string | null = null;
  if (second !== '') {
    try {
      preset = decodeURIComponent(second);
    } catch {
      preset = second;
    }
  }
  return { route, preset };
}

// Accepts a route ('students') or a full path ('whatif/overdue').
export function navigate(target: Route | string): void {
  window.location.hash = '#/' + target;
}

export function useRoute(): {
  route: Route;
  preset: string | null;
  navigate: (target: Route | string) => void;
} {
  const [parsed, setParsed] = useState<ParsedHash>(() => parseHash(window.location.hash));

  useEffect(() => {
    function onChange(): void {
      setParsed(parseHash(window.location.hash));
    }
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return { route: parsed.route, preset: parsed.preset, navigate };
}
