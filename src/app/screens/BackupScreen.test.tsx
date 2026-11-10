import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { monthOf, todayLocalDate } from '../../domain/calendar';
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  createBackupFile,
  serializeBackup,
} from '../../domain/backup';
import type { BackupData } from '../../domain/backup';
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

    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);

    expect(await screen.findByText('No backup yet.')).toBeInTheDocument();
  });

  it('shows the recorded backup time as a time element', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(true) });
    await ledger.markBackupSaved('2026-11-09T08:00:00.000Z');

    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);

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

    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);

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

    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);

    expect(
      await screen.findByText(
        'This phone may discard your ledger. A backup file is the only protection.',
      ),
    ).toBeInTheDocument();
  });

  it('explains an unknown storage status', async () => {
    setStorage(undefined);

    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);

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

    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
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
    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
    await screen.findByText('No backup yet.');

    await user.click(screen.getByRole('button', { name: 'Save backup' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Backup saved.',
    );
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
    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
    await screen.findByText('No backup yet.');

    await user.click(screen.getByRole('button', { name: 'Save backup' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'No file was saved.',
    );
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
    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
    await screen.findByText('No backup yet.');

    await user.click(screen.getByRole('button', { name: 'Save backup' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your browser has taken the file. It is a backup only if you saved it.',
    );
    expect((await ledger.getSettings()).lastBackupAt).toBeUndefined();
  });

  it('shows the error copy when the save throws', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(true) });
    stubPicker('reject', namedError('QuotaExceededError'));
    const user = userEvent.setup();
    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
    await screen.findByText('No backup yet.');

    await user.click(screen.getByRole('button', { name: 'Save backup' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't make the backup. Try again.",
    );
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
    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
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

  it('says the backup was saved but the time could not be recorded', async () => {
    setStorage({ persisted: vi.fn().mockResolvedValue(true) });
    const pending = Promise.withResolvers<{
      createWritable: () => Promise<{
        write: () => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>();
    const picker = vi.fn().mockReturnValue(pending.promise);
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: picker,
    });
    const user = userEvent.setup();
    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
    await screen.findByText('No backup yet.');

    await user.click(screen.getByRole('button', { name: 'Save backup' }));
    await waitFor(() => {
      expect(picker).toHaveBeenCalledTimes(1);
    });
    db.close({ disableAutoOpen: true });
    pending.resolve({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "The backup was saved, but the app couldn't record when.",
    );
    expect(screen.getByRole('status')).toHaveTextContent('Backup saved.');
    await db.open();
  });
});


function backupData(overrides: Partial<BackupData> = {}): BackupData {
  return {
    accounts: [
      {
        id: 'acct-restored',
        name: 'Restored savings',
        type: 'savings',
        createdAt: '2026-11-01T12:00:00.000Z',
      },
    ],
    categories: [{ id: 'cat_food', name: 'Food', archived: false }],
    entries: [
      {
        id: 'entry-restored-1',
        kind: 'expense',
        date: '2026-11-05',
        amountMinor: 1250,
        accountId: 'acct-restored',
        categoryId: 'cat_food',
      },
      {
        id: 'entry-restored-2',
        kind: 'opening',
        date: '2026-11-01',
        amountMinor: 5000,
        accountId: 'acct-restored',
      },
    ],
    settings: { currency: 'CAD', currencyExponent: 2 },
    ...overrides,
  };
}

function backupText(data: BackupData = backupData()): string {
  return serializeBackup(
    createBackupFile(data, new Date('2026-11-09T08:00:00.000Z')),
  );
}

function fileWith(text: string, name = 'budget-backup.json'): File {
  return new File([text], name, { type: 'application/json' });
}

async function uploadBackup(text: string): Promise<void> {
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText('Restore from backup'), fileWith(text));
}

describe('BackupScreen restore preview', () => {
  it('shows the file date, counts, and replacement warning', async () => {
    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
    await screen.findByText('No backup yet.');

    await uploadBackup(backupText());

    expect(
      await screen.findByRole('heading', { name: 'Restore this backup?' }),
    ).toBeInTheDocument();
    const summary = screen.getByText(/This backup was made on/);
    expect(summary).toHaveTextContent(
      'It contains 1 account and 2 entries.',
    );
    expect(summary.querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-11-09T08:00:00.000Z',
    );
    expect(
      screen.getByText('Restoring replaces everything currently in the app.'),
    ).toBeInTheDocument();
  });

  it('uses singular counts for one account and one entry', async () => {
    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
    await screen.findByText('No backup yet.');

    await uploadBackup(
      backupText(backupData({ entries: backupData().entries.slice(0, 1) })),
    );

    expect(
      await screen.findByText(/It contains 1 account and 1 entry\./),
    ).toBeInTheDocument();
  });

  it('cancels without writing and allows choosing the same file again', async () => {
    const user = userEvent.setup();
    const before = {
      accounts: await db.accounts.toArray(),
      categories: await db.categories.toArray(),
      entries: await db.entries.toArray(),
      settings: await db.settings.toArray(),
    };
    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
    await screen.findByText('No backup yet.');
    const input = screen.getByLabelText('Restore from backup');

    await user.upload(input, fileWith(backupText()));
    await screen.findByRole('heading', { name: 'Restore this backup?' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('heading', { name: 'Restore this backup?' }),
    ).not.toBeInTheDocument();
    expect({
      accounts: await db.accounts.toArray(),
      categories: await db.categories.toArray(),
      entries: await db.entries.toArray(),
      settings: await db.settings.toArray(),
    }).toEqual(before);

    await user.upload(input, fileWith(backupText()));
    expect(
      await screen.findByRole('heading', { name: 'Restore this backup?' }),
    ).toBeInTheDocument();
  });
});

describe('BackupScreen restore errors', () => {
  it.each([
    ['not a backup', 'not json', "That file isn't a Budget backup."],
    [
      'damaged',
      JSON.stringify({
        format: BACKUP_FORMAT,
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: '2026-11-09T08:00:00.000Z',
        data: {
          accounts: [{ id: '', name: '', type: 'checking', createdAt: '' }],
          categories: [],
          entries: [],
          settings: { currency: 'CAD', currencyExponent: 2 },
        },
      }),
      "That backup is damaged and can't be restored.",
    ],
    [
      'newer version',
      JSON.stringify({
        format: BACKUP_FORMAT,
        schemaVersion: BACKUP_SCHEMA_VERSION + 1,
        exportedAt: '2026-11-09T08:00:00.000Z',
        data: backupData(),
      }),
      'That backup was made by a newer version of Budget. Update the app and try again.',
    ],
  ])('maps a %s file to its message and writes nothing', async (_name, text, copy) => {
    const before = {
      accounts: await db.accounts.toArray(),
      entries: await db.entries.toArray(),
    };
    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
    await screen.findByText('No backup yet.');

    await uploadBackup(text);

    expect(await screen.findByRole('alert')).toHaveTextContent(copy);
    expect({
      accounts: await db.accounts.toArray(),
      entries: await db.entries.toArray(),
    }).toEqual(before);
    expect(
      screen.queryByRole('heading', { name: 'Restore this backup?' }),
    ).not.toBeInTheDocument();
    expect(
      (screen.getByLabelText('Restore from backup') as HTMLInputElement)
        .files?.length,
    ).toBe(0);
  });
});

describe('BackupScreen restore confirm', () => {
  it('replaces the ledger, reports the count, and lands on home', async () => {
    const onRestored = vi.fn();
    const user = userEvent.setup();
    render(<BackupScreen ledger={ledger} onRestored={onRestored} />);
    await screen.findByText('No backup yet.');
    await uploadBackup(backupText());
    await screen.findByRole('heading', { name: 'Restore this backup?' });

    await user.click(screen.getByRole('button', { name: 'Restore backup' }));

    await waitFor(async () => {
      expect((await db.accounts.toArray()).map((account) => account.id)).toEqual(
        ['acct-restored'],
      );
    });
    expect(onRestored).toHaveBeenCalledWith(1);
    expect((await db.entries.toArray()).map((entry) => entry.id)).toEqual([
      'entry-restored-1',
      'entry-restored-2',
    ]);
    await waitFor(() => {
      expect(window.location.hash).toBe(
        `#/?m=${monthOf(todayLocalDate())}`,
      );
    });
  });

  it('keeps the preview and the previous ledger when the write fails', async () => {
    const data = backupData({
      entries: [backupData().entries[0]!, backupData().entries[0]!],
    });
    const before = {
      accounts: await db.accounts.toArray(),
      entries: await db.entries.toArray(),
    };
    const user = userEvent.setup();
    render(<BackupScreen ledger={ledger} onRestored={vi.fn()} />);
    await screen.findByText('No backup yet.');
    await uploadBackup(backupText(data));
    await screen.findByRole('heading', { name: 'Restore this backup?' });

    await user.click(screen.getByRole('button', { name: 'Restore backup' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't restore the backup. Your ledger is unchanged.",
    );
    expect(
      screen.getByRole('heading', { name: 'Restore this backup?' }),
    ).toBeInTheDocument();
    expect({
      accounts: await db.accounts.toArray(),
      entries: await db.entries.toArray(),
    }).toEqual(before);
    expect(
      (screen.getByLabelText('Restore from backup') as HTMLInputElement)
        .files?.length,
    ).toBe(0);
  });
});
