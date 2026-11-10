import { useEffect, useState } from 'react';

export type StorageStatus = 'persisted' | 'at-risk' | 'unknown';

let persistenceRequest: Promise<void> | undefined;

export function requestPersistentStorage(): Promise<void> {
  if (!persistenceRequest) {
    const persist = navigator.storage?.persist;
    persistenceRequest = persist
      ? Promise.resolve(persist.call(navigator.storage)).then(
          () => undefined,
          () => undefined,
        )
      : Promise.resolve();
  }
  return persistenceRequest;
}

export async function readStorageStatus(): Promise<StorageStatus> {
  try {
    const persisted = navigator.storage?.persisted;
    if (!persisted) {
      return 'unknown';
    }
    return (await persisted.call(navigator.storage))
      ? 'persisted'
      : 'at-risk';
  } catch {
    return 'unknown';
  }
}

export function useStorageStatus(): StorageStatus | undefined {
  const [status, setStatus] = useState<StorageStatus | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function read(): Promise<void> {
      await requestPersistentStorage();
      if (!active) {
        return;
      }
      const next = await readStorageStatus();
      if (active) {
        setStatus(next);
      }
    }

    void read();

    function onVisibilityChange(): void {
      if (document.visibilityState === 'visible') {
        void read();
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return status;
}
