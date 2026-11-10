import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { BudgetDatabase } from '../../data/db';
import { createLedger } from '../../data/ledger';
import type { Ledger } from '../../data/ledger';
import { BackupScreen } from './BackupScreen';

let db: BudgetDatabase;
let ledger: Ledger;
const originalStorage = Object.getOwnPropertyDescriptor(navigator, 'storage');

function setStorage(storage: unknown): void {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: storage,
  });
}

function stubPicker(behavior: 'resolve' | 'reject', error?: Error): Mock {
  const write = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn().mockResolvedValue(undefined);
  const picker = vi.fn(() =>
    behavior === 'resolve'
      ? Promise.resolve({
          createWritable: vi.fn().mockResolvedValue({ write, close }),
        })
      : Promise.reject(error),
  );
  Object.defineProperty(window, 'showSaveFilePicker', {
    configurable: true,
    value: picker,
  });
  return picker;
}

function namedError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

function removePicker(): void {
  Reflect.deleteProperty(window, 'showSaveFilePicker');
}

function removeShare(): void {
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
}

beforeEach(async () => {
  db = new BudgetDatabase(`budget-test-${crypto.randomUUID()}`);
  ledger = createLedger(db);
  await ledger.initialize();
  await ledger.addAccount({ name: 'Checking', type: 'checking' });
  removePicker();
  removeShare();
});

afterEach(async () => {
  vi.restoreAllMocks();
  removePicker();
  removeShare();
  if (originalStorage) {
    Object.defineProperty(navigator, 'storage', originalStorage);
  } else {
    Reflect.deleteProperty(navigator, 'storage');
  }
  await db.delete();
});

describe('BackupScreen last backup', () => {
  it('says no backup yet before any backup', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(true) });

    render(<BackupScreen ledger={ledger} />);

    expect(await screen.findByText('No backup yet.')).toBeInTheDocument();
  });

  it('shows the recorded backup time as a time element', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(true) });
    await ledger.markBackupSaved('2026-11-09T08:00:00.000Z');

    render(<BackupScreen ledger={ledger} />);

    const time = await screen.findByText(/Last backup/, { selector: 'p' });
    expect(time.querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-11-09T08:00:00.000Z',
    );
    expect(time.querySelector('time')?.textContent?.length).toBeGreaterThan(0);
  });
});

describe('BackupScreen storage status', () => {
  it('explains persisted storage', async () => {
    setStorage({
      persist: vi.fn().mockResolvedValue(true),
      persisted: vi.fn().mockResolvedValue(true),
    });

    render(<BackupScreen ledger={ledger} />);

    expect(
      await screen.findByText(
        'This phone has agreed to keep your ledger.',
      ),
    ).toBeInTheDocument();
  });

  it('explains at-risk storage', async () => {
    setStorage({
      persist: vi.fn().mockResolvedValue(false),
      persisted: vi.fn().mockResolvedValue(false),
    });

    render(<BackupScreen ledger={ledger} />);

    expect(
      await screen.findByText(
        'This phone may discard your ledger. A backup file is the only protection.',
      ),
    ).toBeInTheDocument();
  });

  it('explains an unknown storage status', async () => {
    setStorage(undefined);

    render(<BackupScreen ledger={ledger} />);

    expect(
      await screen.findByText(
        "This browser can't confirm it will keep your ledger. Keep a backup.",
      ),
    ).toBeInTheDocument();
  });

  it('shows a checking state before the status resolves', async () => {
    const persisted = Promise.withResolvers<boolean>();
    setStorage({
      persist: vi.fn().mockResolvedValue(true),
      persisted: vi.fn().mockReturnValue(persisted.promise),
    });

    render(<BackupScreen ledger={ledger} />);
    await screen.findByText('No backup yet.');

    expect(
      screen.getByText('Checking whether this phone will keep your ledger…'),
    ).toBeInTheDocument();

    persisted.resolve(true);
    await screen.findByText('This phone has agreed to keep your ledger.');
  });
});

describe('BackupScreen save', () => {
  it('records and displays the time after a confirmed save', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(true) });
    const picker = stubPicker('resolve');
    const user = userEvent.setup();
    render(<BackupScreen ledger={ledger} />);
    await screen.findByText('No backup yet.');

    await user.click(screen.getByRole('button', { name: 'Save backup' }));

    expect(await screen.findByText('Backup saved.')).toBeInTheDocument();
    expect(picker).toHaveBeenCalledTimes(1);
    const settings = await ledger.getSettings();
    expect(settings.lastBackupAt).toBeDefined();
    await waitFor(() =>
      expect(
        screen.getByText(/Last backup/, { selector: 'p' }).querySelector('time'),
      ).toHaveAttribute(
        'datetime',
        settings.lastBackupAt,
      ),
    );
  });

  it('records nothing and says so when the picker is cancelled', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(true) });
    stubPicker('reject', namedError('AbortError'));
    const user = userEvent.setup();
    render(<BackupScreen ledger={ledger} />);
    await screen.findByText('No backup yet.');

    await user.click(screen.getByRole('button', { name: 'Save backup' }));

    expect(await screen.findByText('No file was saved.')).toBeInTheDocument();
    expect((await ledger.getSettings()).lastBackupAt).toBeUndefined();
  });

  it('records nothing and says the download is unconfirmed', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(true) });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn().mockReturnValue('blob:backup'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined,
    );
    const user = userEvent.setup();
    render(<BackupScreen ledger={ledger} />);
    await screen.findByText('No backup yet.');

    await user.click(screen.getByRole('button', { name: 'Save backup' }));

    expect(
      await screen.findByText(
        'Your browser has taken the file. It is a backup only if you saved it.',
      ),
    ).toBeInTheDocument();
    expect((await ledger.getSettings()).lastBackupAt).toBeUndefined();
  });

  it('shows the error copy when the save throws', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(true) });
    stubPicker('reject', namedError('QuotaExceededError'));
    const user = userEvent.setup();
    render(<BackupScreen ledger={ledger} />);
    await screen.findByText('No backup yet.');

    await user.click(screen.getByRole('button', { name: 'Save backup' }));

    expect(
      await screen.findByText("Couldn't make the backup. Try again."),
    ).toBeInTheDocument();
    expect((await ledger.getSettings()).lastBackupAt).toBeUndefined();
  });

  it('disables the button while a save is in flight', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(true) });
    const pending = Promise.withResolvers<{
      createWritable: () => Promise<{
        write: () => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>();
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: vi.fn().mockReturnValue(pending.promise),
    });
    const user = userEvent.setup();
    render(<BackupScreen ledger={ledger} />);
    await screen.findByText('No backup yet.');

    await user.click(screen.getByRole('button', { name: 'Save backup' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save backup' })).toBeDisabled();
    });

    pending.resolve({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      }),
    });
    await screen.findByText('Backup saved.');
  });
});
