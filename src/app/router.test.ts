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
    ['#/add/income', { name: 'add-income' }],
    ['#/add/income?x=1', { name: 'add-income' }],
    ['#/add/transfer', { name: 'add-transfer' }],
    ['#/add/transfer?x=1', { name: 'add-transfer' }],
    ['#/add/income/', { name: 'home', month: '2026-11' }],
    ['#/add/transfer/', { name: 'home', month: '2026-11' }],
    ['#/add/', { name: 'home', month: '2026-11' }],
    ['#/accounts', { name: 'accounts' }],
    ['#/accounts?x=1', { name: 'accounts' }],
    ['#/backup', { name: 'backup' }],
    ['#/backup?x=1', { name: 'backup' }],
    ['#/categories', { name: 'categories' }],
    ['#/categories?x=1', { name: 'categories' }],
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
    ['#/entry/3f1c-abc', { name: 'entry', entryId: '3f1c-abc' }],
    ['#/entry/3f1c-abc?m=2026-11', { name: 'entry', entryId: '3f1c-abc' }],
    ['#/entry/abc%2Fdef', { name: 'entry', entryId: 'abc/def' }],
    ['#/entry/', { name: 'home', month: '2026-11' }],
    ['#/entry/a/b', { name: 'home', month: '2026-11' }],
    ['#/entry/%E0%A4%A', { name: 'home', month: '2026-11' }],
    ['#/income', { name: 'income' }],
    ['#/income?x=1', { name: 'income' }],
    ['#/transfers', { name: 'transfers' }],
    ['#/transfers?x=1', { name: 'transfers' }],
    ['#/nope', { name: 'home', month: '2026-11' }],
    ['#//', { name: 'home', month: '2026-11' }],
  ])('parses %j', (hash, expected) => {
    expect(parseHash(hash, '2026-11-02')).toEqual(expected);
  });

  it.each([
    '#/income/new',
    '#/income/abc',
    '#/transfers/new',
    '#/transfers/abc',
  ])('treats the retired route %s as home', (hash) => {
    expect(parseHash(hash, '2026-11-02')).toEqual({
      name: 'home',
      month: '2026-11',
    });
  });
});

describe('routeToHash', () => {
  it('encodes each route shape', () => {
    expect(routeToHash({ name: 'home', month: '2026-11' })).toBe(
      '#/?m=2026-11',
    );
    expect(routeToHash({ name: 'add' })).toBe('#/add');
    expect(routeToHash({ name: 'add-income' })).toBe('#/add/income');
    expect(routeToHash({ name: 'add-transfer' })).toBe('#/add/transfer');
    expect(routeToHash({ name: 'accounts' })).toBe('#/accounts');
    expect(routeToHash({ name: 'backup' })).toBe('#/backup');
    expect(routeToHash({ name: 'categories' })).toBe('#/categories');
    expect(
      routeToHash({
        name: 'category',
        month: '2026-11',
        categoryId: 'cat_groceries',
      }),
    ).toBe('#/category?m=2026-11&c=cat_groceries');
    expect(routeToHash({ name: 'entry', entryId: '3f1c-abc' })).toBe(
      '#/entry/3f1c-abc',
    );
    expect(routeToHash({ name: 'income' })).toBe('#/income');
    expect(routeToHash({ name: 'transfers' })).toBe('#/transfers');
  });

  it('round-trips a category id containing reserved characters', () => {
    const route = {
      name: 'category' as const,
      month: '2026-11',
      categoryId: 'cat &? #/space',
    };

    expect(parseHash(routeToHash(route), '2026-11-02')).toEqual(route);
  });

  it('round-trips an entry id containing reserved characters', () => {
    const route = {
      name: 'entry' as const,
      entryId: 'entry &? #/space',
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
