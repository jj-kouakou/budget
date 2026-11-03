import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { randomUUID } from 'node:crypto';

if (typeof globalThis.crypto?.randomUUID !== 'function') {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    configurable: true,
    value: randomUUID,
  });
}
