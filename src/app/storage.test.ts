import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readStorageStatus, useStorageStatus } from './storage';

const originalStorage = Object.getOwnPropertyDescriptor(
  navigator,
  'storage',
);

function setStorage(storage: unknown): void {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: storage,
  });
}

function deferred<T>() {
  return Promise.withResolvers<T>();
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  if (originalStorage) {
    Object.defineProperty(navigator, 'storage', originalStorage);
  } else {
    Reflect.deleteProperty(navigator, 'storage');
  }
});

describe('readStorageStatus', () => {
  it('returns persisted when the browser reports true', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(true) });

    expect(await readStorageStatus()).toBe('persisted');
  });

  it('returns at-risk when the browser reports false', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(false) });

    expect(await readStorageStatus()).toBe('at-risk');
  });

  it('returns unknown when the API is missing', async () => {
    setStorage(undefined);

    expect(await readStorageStatus()).toBe('unknown');
  });

  it('returns unknown when persisted is missing', async () => {
    setStorage({ persist: vi.fn() });

    expect(await readStorageStatus()).toBe('unknown');
  });

  it('returns unknown when persisted throws', async () => {
    setStorage({
      persisted: vi.fn().mockRejectedValue(new Error('denied')),
    });

    expect(await readStorageStatus()).toBe('unknown');
  });
});

describe('requestPersistentStorage', () => {
  it('calls persist once for two requests', async () => {
    // The module-level memo must be fresh; a static import cannot reset it.
    vi.resetModules();
    const persist = vi.fn().mockResolvedValue(true);
    setStorage({ persist });
    const module = await import('./storage');

    await module.requestPersistentStorage();
    await module.requestPersistentStorage();

    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('swallows a rejection', async () => {
    vi.resetModules();
    setStorage({ persist: vi.fn().mockRejectedValue(new Error('no')) });
    const module = await import('./storage');

    await expect(module.requestPersistentStorage()).resolves.toBeUndefined();
  });

  it('resolves without an API', async () => {
    vi.resetModules();
    setStorage(undefined);
    const module = await import('./storage');

    await expect(module.requestPersistentStorage()).resolves.toBeUndefined();
  });
});

describe('useStorageStatus', () => {
  it('is undefined until the read resolves, then holds the status', async () => {
    const persist = deferred<boolean>();
    setStorage({
      persist: vi.fn().mockReturnValue(persist.promise),
      persisted: vi.fn().mockResolvedValue('persisted'),
    });

    const { result } = renderHook(() => useStorageStatus());

    expect(result.current).toBeUndefined();

    persist.resolve(true);

    await waitFor(() => {
      expect(result.current).toBe('persisted');
    });
  });

  it('re-reads on visibilitychange while visible', async () => {
    const persisted = vi.fn().mockResolvedValue(true);
    setStorage({
      persist: vi.fn().mockResolvedValue(true),
      persisted,
    });
    const { result } = renderHook(() => useStorageStatus());
    await waitFor(() => {
      expect(result.current).toBe('persisted');
    });

    persisted.mockResolvedValue(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(result.current).toBe('at-risk');
    });
  });

  it('removes the visibility listener on unmount', async () => {
    const persisted = vi.fn().mockResolvedValue(true);
    setStorage({
      persist: vi.fn().mockResolvedValue(true),
      persisted,
    });
    const { result, unmount } = renderHook(() => useStorageStatus());
    await waitFor(() => {
      expect(result.current).toBe('persisted');
    });
    const callsBeforeUnmount = persisted.mock.calls.length;

    unmount();
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(persisted).toHaveBeenCalledTimes(callsBeforeUnmount);
  });
});
