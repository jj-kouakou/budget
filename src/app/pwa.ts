import { registerSW } from 'virtual:pwa-register';

export function requestPersistentStorage(): void {
  if (navigator.storage?.persist) {
    void navigator.storage.persist().catch(() => undefined);
  }
}

export function registerPwa(): void {
  registerSW({ immediate: true });
}
