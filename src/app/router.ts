import { useEffect, useState } from 'react';
import type { LocalDate, MonthKey } from '../domain/types';
import {
  isValidMonthKey,
  monthOf,
  todayLocalDate,
} from '../domain/calendar';

export type Route =
  | { name: 'home'; month: MonthKey }
  | { name: 'add' }
  | { name: 'accounts' }
  | { name: 'backup' }
  | { name: 'categories' }
  | { name: 'category'; month: MonthKey; categoryId: string }
  | { name: 'entry'; entryId: string }
  | { name: 'transfers' }
  | { name: 'add-transfer' }
  | { name: 'transfer'; entryId: string }
  | { name: 'income' }
  | { name: 'add-income' }
  | { name: 'income-entry'; entryId: string };

export function parseHash(hash: string, today?: LocalDate): Route {
  const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const queryIndex = withoutHash.indexOf('?');
  const path =
    queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : withoutHash.slice(queryIndex + 1);

  if (path === '/add') {
    return { name: 'add' };
  }
  if (path === '/accounts') {
    return { name: 'accounts' };
  }
  if (path === '/backup') {
    return { name: 'backup' };
  }
  if (path === '/categories') {
    return { name: 'categories' };
  }
  if (path === '/transfers') {
    return { name: 'transfers' };
  }
  if (path === '/transfers/new') {
    return { name: 'add-transfer' };
  }
  if (path === '/income') {
    return { name: 'income' };
  }
  if (path === '/income/new') {
    return { name: 'add-income' };
  }

  const requestedMonth = new URLSearchParams(query).get('m');
  const currentMonth = monthOf(today ?? todayLocalDate());
  const month =
    requestedMonth !== null && isValidMonthKey(requestedMonth)
      ? requestedMonth
      : currentMonth;

  if (path === '/category') {
    const categoryId = new URLSearchParams(query).get('c');
    if (categoryId === null || categoryId === '') {
      return { name: 'home', month };
    }
    return { name: 'category', month, categoryId };
  }

  if (path.startsWith('/entry/')) {
    const raw = path.slice('/entry/'.length);
    if (raw === '' || raw.includes('/')) {
      return { name: 'home', month: currentMonth };
    }
    let entryId: string;
    try {
      entryId = decodeURIComponent(raw);
    } catch {
      return { name: 'home', month: currentMonth };
    }
    if (entryId === '') {
      return { name: 'home', month: currentMonth };
    }
    return { name: 'entry', entryId };
  }

  if (path.startsWith('/transfers/')) {
    const raw = path.slice('/transfers/'.length);
    if (raw === '' || raw.includes('/')) {
      return { name: 'home', month: currentMonth };
    }
    let entryId: string;
    try {
      entryId = decodeURIComponent(raw);
    } catch {
      return { name: 'home', month: currentMonth };
    }
    if (entryId === '') {
      return { name: 'home', month: currentMonth };
    }
    return { name: 'transfer', entryId };
  }

  if (path.startsWith('/income/')) {
    const raw = path.slice('/income/'.length);
    if (raw === '' || raw.includes('/')) {
      return { name: 'home', month: currentMonth };
    }
    let entryId: string;
    try {
      entryId = decodeURIComponent(raw);
    } catch {
      return { name: 'home', month: currentMonth };
    }
    if (entryId === '') {
      return { name: 'home', month: currentMonth };
    }
    return { name: 'income-entry', entryId };
  }

  return { name: 'home', month };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return `#/?m=${route.month}`;
    case 'add':
      return '#/add';
    case 'accounts':
      return '#/accounts';
    case 'backup':
      return '#/backup';
    case 'categories':
      return '#/categories';
    case 'category':
      return `#/category?m=${route.month}&c=${encodeURIComponent(route.categoryId)}`;
    case 'entry':
      return `#/entry/${encodeURIComponent(route.entryId)}`;
    case 'transfers':
      return '#/transfers';
    case 'add-transfer':
      return '#/transfers/new';
    case 'transfer':
      return `#/transfers/${encodeURIComponent(route.entryId)}`;
    case 'income':
      return '#/income';
    case 'add-income':
      return '#/income/new';
    case 'income-entry':
      return `#/income/${encodeURIComponent(route.entryId)}`;
  }
}

export function navigate(
  route: Route,
  options?: { replace?: boolean },
): void {
  const hash = routeToHash(route);
  if (options?.replace) {
    window.location.replace(hash);
  } else {
    window.location.hash = hash;
  }
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const update = () => setRoute(parseHash(window.location.hash));
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  return route;
}
