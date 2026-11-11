import { describe, expect, it } from 'vitest';
import type { Account, Category, Entry } from './types';
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  BackupError,
  backupFileName,
  createBackupFile,
  parseBackupFile,
  previewBackup,
  serializeBackup,
} from './backup';
import type { BackupData, BackupErrorCode, BackupFile } from './backup';

const EXPORTED_AT = new Date('2026-11-10T19:42:11.000Z');

function makeData(): BackupData {
  const accounts: Account[] = [
    {
      id: 'acct-b',
      name: 'Savings',
      type: 'savings',
      createdAt: '2026-11-02T14:03:00.000Z',
    },
    {
      id: 'acct-a',
      name: 'Checking',
      type: 'checking',
      createdAt: '2026-11-01T12:00:00.000Z',
    },
  ];
  const categories: Category[] = [
    { id: 'cat_transport', name: 'Transport', archived: false },
    { id: 'cat_groceries', name: 'Groceries', archived: true },
  ];
  const entries: Entry[] = [
    {
      id: 'entry-b',
      kind: 'expense',
      date: '2026-11-10',
      amountMinor: 1842,
      accountId: 'acct-a',
      categoryId: 'cat_groceries',
    },
    {
      id: 'entry-a',
      kind: 'transfer',
      date: '2026-11-03',
      amountMinor: 5000,
      accountId: 'acct-a',
      toAccountId: 'acct-b',
    },
  ];
  return {
    accounts,
    categories,
    entries,
    settings: { currency: 'CAD', currencyExponent: 2 },
  };
}

function expectCode(fn: () => unknown, code: BackupErrorCode): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BackupError);
    expect((error as BackupError).code).toBe(code);
    return;
  }
  throw new Error(`Expected BackupError ${code}`);
}

function parseJson(value: unknown): BackupFile {
  return parseBackupFile(JSON.stringify(value));
}

function envelope(overrides: Record<string, unknown> = {}) {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: EXPORTED_AT.toISOString(),
    data: {
      accounts: [],
      categories: [],
      entries: [],
      settings: { currency: 'CAD', currencyExponent: 2 },
    },
    ...overrides,
  };
}

function validAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'acct-a',
    name: 'Checking',
    type: 'checking',
    createdAt: '2026-11-01T12:00:00.000Z',
    ...overrides,
  };
}

function validCategory(overrides: Record<string, unknown> = {}) {
  return { id: 'cat_groceries', name: 'Groceries', archived: false, ...overrides };
}

function validEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry-a',
    kind: 'expense',
    date: '2026-11-10',
    amountMinor: 1842,
    accountId: 'acct-a',
    categoryId: 'cat_groceries',
    ...overrides,
  };
}

function dataWith(overrides: Record<string, unknown>) {
  return {
    accounts: [],
    categories: [],
    entries: [],
    settings: { currency: 'CAD', currencyExponent: 2 },
    ...overrides,
  };
}

describe('createBackupFile and serializeBackup', () => {
  it('round-trips every row and the currency pair through serialize and parse', () => {
    const parsed = parseBackupFile(
      serializeBackup(createBackupFile(makeData(), EXPORTED_AT)),
    );

    expect(parsed).toEqual({
      format: BACKUP_FORMAT,
      schemaVersion: 1,
      exportedAt: '2026-11-10T19:42:11.000Z',
      data: {
        accounts: [
          {
            id: 'acct-a',
            name: 'Checking',
            type: 'checking',
            createdAt: '2026-11-01T12:00:00.000Z',
          },
          {
            id: 'acct-b',
            name: 'Savings',
            type: 'savings',
            createdAt: '2026-11-02T14:03:00.000Z',
          },
        ],
        categories: [
          { id: 'cat_groceries', name: 'Groceries', archived: true },
          { id: 'cat_transport', name: 'Transport', archived: false },
        ],
        entries: [
          {
            id: 'entry-a',
            kind: 'transfer',
            date: '2026-11-03',
            amountMinor: 5000,
            accountId: 'acct-a',
            toAccountId: 'acct-b',
          },
          {
            id: 'entry-b',
            kind: 'expense',
            date: '2026-11-10',
            amountMinor: 1842,
            accountId: 'acct-a',
            categoryId: 'cat_groceries',
          },
        ],
        settings: { currency: 'CAD', currencyExponent: 2 },
      },
    });
  });

  it('sorts by code unit where localeCompare would disagree', () => {
    const data = makeData();
    const file = createBackupFile(
      {
        ...data,
        accounts: [
          { ...data.accounts[0]!, id: 'a' },
          { ...data.accounts[1]!, id: 'B' },
        ],
      },
      EXPORTED_AT,
    );

    expect(file.data.accounts.map((account) => account.id)).toEqual(['B', 'a']);
  });

  it('sorts by code unit and copies settings without device state', () => {
    const data = makeData();
    const file = createBackupFile(
      {
        ...data,
        settings: {
          currency: 'CAD',
          currencyExponent: 2,
          lastAccountId: 'acct-a',
          lastBackupAt: '2026-11-01T00:00:00.000Z',
        } as BackupData['settings'],
      },
      EXPORTED_AT,
    );

    expect(file.data.accounts.map((account) => account.id)).toEqual([
      'acct-a',
      'acct-b',
    ]);
    expect(file.data.settings).toEqual({
      currency: 'CAD',
      currencyExponent: 2,
    });
    expect('lastAccountId' in file.data.settings).toBe(false);
    expect('lastBackupAt' in file.data.settings).toBe(false);
  });

  it('produces byte-identical text on two runs, including shuffled input', () => {
    const data = makeData();
    const shuffled: BackupData = {
      accounts: [...data.accounts].reverse(),
      categories: [...data.categories].reverse(),
      entries: [...data.entries].reverse(),
      settings: data.settings,
    };

    const first = serializeBackup(createBackupFile(data, EXPORTED_AT));
    const second = serializeBackup(
      createBackupFile(shuffled, EXPORTED_AT),
    );

    expect(first).toBe(second);
    expect(first.endsWith('\n')).toBe(true);
    expect(first).toContain('\n  "format": "budget-backup",');
  });

  it('does not mutate the input arrays', () => {
    const data = makeData();
    const accountIds = data.accounts.map((account) => account.id);

    createBackupFile(data, EXPORTED_AT);

    expect(data.accounts.map((account) => account.id)).toEqual(accountIds);
  });
});

describe('parseBackupFile refusals', () => {
  it('rejects invalid JSON as not-a-backup', () => {
    expectCode(() => parseBackupFile('{'), 'not-a-backup');
  });

  it('rejects a non-object, including an array, as not-a-backup', () => {
    expectCode(() => parseJson(null), 'not-a-backup');
    expectCode(() => parseJson([]), 'not-a-backup');
    expectCode(() => parseJson('backup'), 'not-a-backup');
  });

  it('rejects a missing or wrong format as not-a-backup', () => {
    const { format: _format, ...withoutFormat } = envelope();
    expectCode(() => parseJson(withoutFormat), 'not-a-backup');
    expectCode(
      () => parseJson(envelope({ format: 'other-backup' })),
      'not-a-backup',
    );
  });

  it('rejects a missing, non-integer, or zero schemaVersion as damaged', () => {
    expectCode(
      () => parseJson({ ...envelope(), schemaVersion: undefined }),
      'damaged',
    );
    expectCode(() => parseJson(envelope({ schemaVersion: 1.5 })), 'damaged');
    expectCode(() => parseJson(envelope({ schemaVersion: 0 })), 'damaged');
    expectCode(() => parseJson(envelope({ schemaVersion: -1 })), 'damaged');
    expectCode(
      () => parseJson(envelope({ schemaVersion: '1' })),
      'damaged',
    );
  });

  it('rejects a newer schemaVersion as newer-version', () => {
    expectCode(() => parseJson(envelope({ schemaVersion: 2 })), 'newer-version');
  });

  it('rejects a bad exportedAt as damaged', () => {
    expectCode(
      () => parseJson({ ...envelope(), exportedAt: undefined }),
      'damaged',
    );
    expectCode(() => parseJson(envelope({ exportedAt: 42 })), 'damaged');
    expectCode(
      () => parseJson(envelope({ exportedAt: 'not-a-date' })),
      'damaged',
    );
  });

  it('rejects a bad data block as damaged', () => {
    const { data: _data, ...withoutData } = envelope();
    expectCode(() => parseJson(withoutData), 'damaged');
    expectCode(() => parseJson(envelope({ data: [] })), 'damaged');
    expectCode(
      () => parseJson(envelope({ data: dataWith({ accounts: {} }) })),
      'damaged',
    );
    expectCode(
      () => parseJson(envelope({ data: dataWith({ categories: null }) })),
      'damaged',
    );
    expectCode(
      () => parseJson(envelope({ data: dataWith({ entries: 'none' }) })),
      'damaged',
    );
    expectCode(
      () => parseJson(envelope({ data: dataWith({ settings: [] }) })),
      'damaged',
    );
  });
});

describe('parseBackupFile row validation', () => {
  const malformed: Array<[string, Record<string, unknown>, BackupErrorCode]> = [
    ['account id missing', { accounts: [validAccount({ id: '' })] }, 'damaged'],
    ['account id not a string', { accounts: [validAccount({ id: 1 })] }, 'damaged'],
    ['account name empty', { accounts: [validAccount({ name: '' })] }, 'damaged'],
    ['account type unknown', { accounts: [validAccount({ type: 'cash' })] }, 'damaged'],
    ['account createdAt missing', { accounts: [validAccount({ createdAt: 3 })] }, 'damaged'],
    ['category id missing', { categories: [validCategory({ id: '' })] }, 'damaged'],
    ['category name not a string', { categories: [validCategory({ name: 2 })] }, 'damaged'],
    ['category archived not boolean', { categories: [validCategory({ archived: 'no' })] }, 'damaged'],
    ['entry id missing', { entries: [validEntry({ id: '' })] }, 'damaged'],
    ['entry kind unknown', { entries: [validEntry({ kind: 'refund' })] }, 'damaged'],
    ['entry date invalid', { entries: [validEntry({ date: '2026-02-30' })] }, 'damaged'],
    ['entry amount zero expense', { entries: [validEntry({ amountMinor: 0 })] }, 'damaged'],
    ['entry amount negative income', { entries: [validEntry({ kind: 'income', amountMinor: -5 })] }, 'damaged'],
    ['entry amount not safe integer', { entries: [validEntry({ amountMinor: 1.5 })] }, 'damaged'],
    ['entry accountId missing', { entries: [validEntry({ accountId: '' })] }, 'damaged'],
    ['transfer without destination', { entries: [validEntry({ kind: 'transfer', categoryId: undefined, toAccountId: undefined })] }, 'damaged'],
    ['transfer empty destination', { entries: [validEntry({ kind: 'transfer', categoryId: undefined, toAccountId: '' })] }, 'damaged'],
    ['optional categoryId empty', { entries: [validEntry({ categoryId: '' })] }, 'damaged'],
    ['settings currency empty', { settings: { currency: '', currencyExponent: 2 } }, 'damaged'],
    ['settings exponent negative', { settings: { currency: 'CAD', currencyExponent: -1 } }, 'damaged'],
    ['settings exponent fractional', { settings: { currency: 'CAD', currencyExponent: 0.5 } }, 'damaged'],
    ['settings exponent missing', { settings: { currency: 'CAD' } }, 'damaged'],
  ];

  for (const [name, overrides, code] of malformed) {
    it(`rejects ${name}`, () => {
      expectCode(
        () => parseJson(envelope({ data: dataWith(overrides) })),
        code,
      );
    });
  }

  it('accepts any safe integer for an opening balance, including zero and negative', () => {
    const parsed = parseJson(
      envelope({
        data: dataWith({
          entries: [
            validEntry({
              id: 'opening-zero',
              kind: 'opening',
              amountMinor: 0,
              categoryId: undefined,
            }),
            validEntry({
              id: 'opening-negative',
              kind: 'opening',
              amountMinor: -24000,
              categoryId: undefined,
            }),
          ],
        }),
      }),
    );

    expect(parsed.data.entries.map((entry) => entry.amountMinor)).toEqual([
      0,
      -24000,
    ]);
  });

  it('drops unknown extra envelope, data, and row fields', () => {
    const parsed = parseJson(
      envelope({
        unknownEnvelope: true,
        data: dataWith({
          accounts: [validAccount({ extraAccount: 'x' })],
          categories: [validCategory({ extraCategory: 'x' })],
          entries: [validEntry({ extraEntry: 'x' })],
          unknownTable: [],
        }),
      }),
    );

    expect(parsed).not.toHaveProperty('unknownEnvelope');
    expect(parsed.data).not.toHaveProperty('unknownTable');
    expect(parsed.data.accounts[0]).not.toHaveProperty('extraAccount');
    expect(parsed.data.categories[0]).not.toHaveProperty('extraCategory');
    expect(parsed.data.entries[0]).not.toHaveProperty('extraEntry');
  });

  it('omits absent optional entry fields rather than setting them undefined', () => {
    const parsed = parseJson(
      envelope({
        data: dataWith({
          entries: [validEntry({ categoryId: undefined })],
        }),
      }),
    );

    expect('categoryId' in parsed.data.entries[0]!).toBe(false);
  });
});

describe('previewBackup', () => {
  it('counts accounts and entries from the parsed file', () => {
    const preview = previewBackup(
      parseBackupFile(
        serializeBackup(createBackupFile(makeData(), EXPORTED_AT)),
      ),
    );

    expect(preview).toEqual({
      exportedAt: '2026-11-10T19:42:11.000Z',
      accountCount: 2,
      entryCount: 2,
    });
  });
});

describe('backupFileName', () => {
  it('uses local date parts and the budget-backup prefix', () => {
    const at = new Date(2026, 10, 9, 7, 42, 11);

    expect(backupFileName(at)).toBe('budget-backup-2026-11-09-074211.json');
  });

  it('zero-pads single-digit parts', () => {
    const at = new Date(2026, 0, 2, 3, 4, 5);

    expect(backupFileName(at)).toBe('budget-backup-2026-01-02-030405.json');
  });
});
