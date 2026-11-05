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
  | { name: 'category'; month: MonthKey; categoryId: string };

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
    case 'category':
      return `#/category?m=${route.month}&c=${encodeURIComponent(route.categoryId)}`;
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
