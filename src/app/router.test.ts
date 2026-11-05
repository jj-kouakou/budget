import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { navigate, parseHash, routeToHash, useHashRoute } from './router';

beforeEach(() => {
  window.location.hash = '';
});

describe('parseHash', () => {
  it.each([
    ['', { name: 'home', month: '2026-11' }],
    ['#', { name: 'home', month: '2026-11' }],
    ['#/', { name: 'home', month: '2026-11' }],
    ['#/?m=2026-11', { name: 'home', month: '2026-11' }],
    ['#/?m=2026-11&x=1', { name: 'home', month: '2026-11' }],
    ['#/?m=2026-13', { name: 'home', month: '2026-11' }],
    ['#/?m=2026-11&m=2025-01', { name: 'home', month: '2026-11' }],
    ['#/add', { name: 'add' }],
    ['#/add?m=2026-11', { name: 'add' }],
    ['#/accounts', { name: 'accounts' }],
    ['#/accounts?x=1', { name: 'accounts' }],
    [
      '#/category?m=2026-11&c=cat_groceries',
      { name: 'category', month: '2026-11', categoryId: 'cat_groceries' },
    ],
    [
      '#/category?c=cat_groceries',
      { name: 'category', month: '2026-11', categoryId: 'cat_groceries' },
    ],
    [
      '#/category?m=bad&c=cat_groceries',
      { name: 'category', month: '2026-11', categoryId: 'cat_groceries' },
    ],
    ['#/category?m=2026-11', { name: 'home', month: '2026-11' }],
    ['#/category?m=2026-11&c=', { name: 'home', month: '2026-11' }],
    ['#/nope', { name: 'home', month: '2026-11' }],
    ['#/add/', { name: 'home', month: '2026-11' }],
    ['#//', { name: 'home', month: '2026-11' }],
  ])('parses %j', (hash, expected) => {
    expect(parseHash(hash, '2026-11-02')).toEqual(expected);
  });
});

describe('routeToHash', () => {
  it('encodes each route shape', () => {
    expect(routeToHash({ name: 'home', month: '2026-11' })).toBe(
      '#/?m=2026-11',
    );
    expect(routeToHash({ name: 'add' })).toBe('#/add');
    expect(routeToHash({ name: 'accounts' })).toBe('#/accounts');
    expect(
      routeToHash({
        name: 'category',
        month: '2026-11',
        categoryId: 'cat_groceries',
      }),
    ).toBe('#/category?m=2026-11&c=cat_groceries');
  });

  it('round-trips a category id containing reserved characters', () => {
    const route = {
      name: 'category' as const,
      month: '2026-11',
      categoryId: 'cat &? #/space',
    };

    expect(parseHash(routeToHash(route), '2026-11-02')).toEqual(route);
  });
});

describe('navigate', () => {
  it('sets the hash', () => {
    navigate({ name: 'add' });
    expect(window.location.hash).toBe('#/add');
  });

  it('replaces the hash', () => {
    window.location.hash = '#/add';
    navigate({ name: 'accounts' }, { replace: true });
    expect(window.location.hash).toBe('#/accounts');
  });

  it('does nothing when assigning the current hash', () => {
    window.location.hash = '#/add';
    let events = 0;
    const listener = () => {
      events += 1;
    };
    window.addEventListener('hashchange', listener);

    navigate({ name: 'add' });

    window.removeEventListener('hashchange', listener);
    expect(events).toBe(0);
  });
});

describe('useHashRoute', () => {
  it('parses the current hash and updates on hashchange', () => {
    window.location.hash = '#/?m=2025-01';
    const { result } = renderHook(() => useHashRoute());

    expect(result.current).toEqual({ name: 'home', month: '2025-01' });

    act(() => {
      window.location.hash = '#/add';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(result.current).toEqual({ name: 'add' });
  });
});
