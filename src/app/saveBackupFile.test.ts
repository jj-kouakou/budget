import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { saveBackupFile } from './saveBackupFile';

const originalStorage = Object.getOwnPropertyDescriptor(
  navigator,
  'storage',
);

function makeFile(): File {
  return new File(['{"format":"budget-backup"}'], 'budget-backup.json', {
    type: 'application/json',
  });
}

function namedError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

interface PickerStub {
  showSaveFilePicker: Mock;
  write: Mock;
  close: Mock;
}

function stubPicker(
  behavior: 'resolve' | 'reject',
  error?: Error,
): PickerStub {
  const write = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn().mockResolvedValue(undefined);
  const handle = {
    createWritable: vi.fn().mockResolvedValue({ write, close }),
  };
  const showSaveFilePicker = vi.fn(() =>
    behavior === 'resolve'
      ? Promise.resolve(handle)
      : Promise.reject(error),
  );
  Object.defineProperty(window, 'showSaveFilePicker', {
    configurable: true,
    value: showSaveFilePicker,
  });
  return { showSaveFilePicker, write, close };
}

function stubShare(behavior: 'resolve' | 'reject', error?: Error) {
  const share = vi.fn(() =>
    behavior === 'resolve' ? Promise.resolve() : Promise.reject(error),
  );
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: vi.fn().mockReturnValue(true),
  });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: share,
  });
  return share;
}

function removePicker(): void {
  Reflect.deleteProperty(window, 'showSaveFilePicker');
}

function removeShare(): void {
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
}

let createObjectURL: Mock;
let revokeObjectURL: Mock;
let anchorClick: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  removePicker();
  removeShare();
  createObjectURL = vi.fn().mockReturnValue('blob:backup');
  revokeObjectURL = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectURL,
  });
  anchorClick = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  removePicker();
  removeShare();
  if (originalStorage) {
    Object.defineProperty(navigator, 'storage', originalStorage);
  }
});

describe('saveBackupFile', () => {
  describe('file picker', () => {
    it('returns saved after writing and closing the picker stream', async () => {
      const picker = stubPicker('resolve');
      const file = makeFile();

      await expect(saveBackupFile(file)).resolves.toBe('saved');

      expect(picker.showSaveFilePicker).toHaveBeenCalledWith({
        suggestedName: 'budget-backup.json',
        types: [
          {
            description: 'Budget backup',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      expect(picker.write).toHaveBeenCalledWith(file);
      expect(picker.close).toHaveBeenCalledTimes(1);
    });

    it('returns cancelled on AbortError and never tries share', async () => {
      stubPicker('reject', namedError('AbortError'));
      const share = stubShare('resolve');

      await expect(saveBackupFile(makeFile())).resolves.toBe('cancelled');

      expect(share).not.toHaveBeenCalled();
    });

    it.each(['NotAllowedError', 'SecurityError'])(
      'falls through to share on %s',
      async (name) => {
        stubPicker('reject', namedError(name));
        const share = stubShare('resolve');

        await expect(saveBackupFile(makeFile())).resolves.toBe('saved');

        expect(share).toHaveBeenCalledTimes(1);
      },
    );

    it('rethrows any other picker error', async () => {
      stubPicker('reject', namedError('QuotaExceededError'));

      await expect(saveBackupFile(makeFile())).rejects.toThrow(
        'QuotaExceededError',
      );
    });
  });

  describe('share sheet', () => {
    it('returns saved when the share resolves', async () => {
      const share = stubShare('resolve');
      const file = makeFile();

      await expect(saveBackupFile(file)).resolves.toBe('saved');

      expect(share).toHaveBeenCalledWith({
        files: [file],
        title: 'budget-backup.json',
      });
    });

    it('returns cancelled on AbortError', async () => {
      stubShare('reject', namedError('AbortError'));

      await expect(saveBackupFile(makeFile())).resolves.toBe('cancelled');
    });

    it('falls through to the anchor on any other failure', async () => {
      stubShare('reject', namedError('DataError'));

      await expect(saveBackupFile(makeFile())).resolves.toBe('unconfirmed');

      expect(createObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  describe('anchor download', () => {
    it('returns unconfirmed and removes the anchor', async () => {
      const appended: HTMLAnchorElement[] = [];
      vi.spyOn(document.body, 'append').mockImplementation((...nodes) => {
        for (const node of nodes) {
          if (node instanceof HTMLAnchorElement) {
            appended.push(node);
          }
        }
      });

      await expect(saveBackupFile(makeFile())).resolves.toBe('unconfirmed');

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(anchorClick).toHaveBeenCalledTimes(1);
      expect(appended).toHaveLength(1);
      expect(appended[0]!.download).toBe('budget-backup.json');
      expect(appended[0]!.href).toBe('blob:backup');
      expect(appended[0]!.isConnected).toBe(false);
    });

    it('revokes the blob URL on a later macrotask', async () => {
      await saveBackupFile(makeFile());

      await waitFor(() => {
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup');
      });
    });
  });
});
