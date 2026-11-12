import { afterEach, describe, expect, it } from 'vitest';
import type { Account, Entry } from '../domain/types';
import { BudgetDatabase, SCHEMA_VERSION } from './db';
import { BACKUP_SCHEMA_VERSION } from '../domain/backup';
import { MAX_MONTH, MIN_MONTH } from '../domain/calendar';
import {
  LedgerError,
  UNCATEGORIZED_CATEGORY_ID,
  UNCATEGORIZED_LABEL,
  createLedger,
} from './ledger';
import { STARTER_CATEGORIES } from './seed';

const databases: BudgetDatabase[] = [];

function openDatabase(): BudgetDatabase {
  const db = new BudgetDatabase(`budget-test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});

describe('database schema', () => {
  it('uses schema version 1 with the declared tables and indexes', async () => {
    const db = openDatabase();
    await db.open();

    expect(SCHEMA_VERSION).toBe(1);
    expect(
      db.tables.map((table) => [
        table.name,
        Object.keys(table.schema.idxByName).sort(),
      ]),
    ).toEqual([
      ['accounts', ['createdAt']],
      ['categories', []],
      ['entries', ['date']],
      ['settings', []],
    ]);
  });
});

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acct-1',
    name: 'Checking',
    type: 'checking',
    createdAt: '2026-11-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('initialize', () => {
  it('seeds CAD settings and nine starter categories', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);

    await ledger.initialize();

    expect(await db.settings.get('app')).toEqual({
      id: 'app',
      currency: 'CAD',
      currencyExponent: 2,
    });
    const categories = await db.categories.toArray();
    expect(categories).toHaveLength(9);
    const byId = (left: { id: string }, right: { id: string }) =>
      left.id.localeCompare(right.id);
    expect(
      categories.sort(byId).map((category) => [category.id, category.name]),
    ).toEqual(
      [...STARTER_CATEGORIES]
        .sort(byId)
        .map((category) => [category.id, category.name]),
    );
    expect(categories.every((category) => category.archived === false)).toBe(
      true,
    );
  });

  it('leaves accounts empty', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);

    await ledger.initialize();

    expect(await db.accounts.count()).toBe(0);
  });

  it('is idempotent and never overwrites existing rows', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    await db.settings.update('app', { lastAccountId: 'acct-1' });
    await db.categories.update('cat_groceries', {
      name: 'Food',
      archived: true,
    });

    await ledger.initialize();

    expect(await db.categories.count()).toBe(9);
    expect(await db.categories.get('cat_groceries')).toEqual({
      id: 'cat_groceries',
      name: 'Food',
      archived: true,
    });
    expect(await db.settings.get('app')).toEqual({
      id: 'app',
      currency: 'CAD',
      currencyExponent: 2,
      lastAccountId: 'acct-1',
    });
  });
});

describe('accounts', () => {
  it('adds a trimmed account without writing an entry', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();

    const account = await ledger.addAccount({
      name: '  Checking  ',
      type: 'checking',
    });

    expect(account.name).toBe('Checking');
    expect(account.type).toBe('checking');
    expect(account.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(new Date(account.createdAt).toISOString()).toBe(account.createdAt);
    expect(await db.entries.count()).toBe(0);
    expect(await db.accounts.get(account.id)).toEqual(account);
  });

  it.each(['', '   ', 'a'.repeat(61)])(
    'rejects an invalid name %j',
    async (name) => {
      const db = openDatabase();
      const ledger = createLedger(db);
      await ledger.initialize();

      const error = await ledger
        .addAccount({ name, type: 'checking' })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(LedgerError);
      expect(error).toMatchObject({ code: 'invalid-name' });
    },
  );

  it('accepts a 60-character name', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();

    const account = await ledger.addAccount({
      name: 'a'.repeat(60),
      type: 'savings',
    });

    expect(account.name).toHaveLength(60);
  });

  it('rejects an invalid account type', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();

    const error = await ledger
      .addAccount({ name: 'Card', type: 'cash' as 'credit' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'invalid-account-type' });
  });

  it('allows duplicate account names', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();

    await ledger.addAccount({ name: 'Visa', type: 'credit' });
    await ledger.addAccount({ name: 'Visa', type: 'credit' });

    expect(await db.accounts.count()).toBe(2);
  });

  it('lists accounts by createdAt then id', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    await db.accounts.bulkAdd([
      makeAccount({
        id: 'acct-b',
        createdAt: '2026-11-01T12:00:00.000Z',
      }),
      makeAccount({
        id: 'acct-a',
        createdAt: '2026-11-01T12:00:00.000Z',
      }),
      makeAccount({
        id: 'acct-earlier',
        createdAt: '2026-10-01T12:00:00.000Z',
      }),
    ]);

    expect((await ledger.listAccounts()).map((account) => account.id)).toEqual([
      'acct-earlier',
      'acct-a',
      'acct-b',
    ]);
  });

  it('renames an account and leaves existing entries referencing it', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    await db.accounts.add(makeAccount());
    await db.entries.add({
      id: 'entry-1',
      kind: 'expense',
      date: '2026-11-02',
      amountMinor: 1234,
      accountId: 'acct-1',
      categoryId: 'cat_groceries',
    });

    await ledger.renameAccount('acct-1', '  Chequing  ');

    expect(await db.accounts.get('acct-1')).toEqual(
      makeAccount({ name: 'Chequing' }),
    );
    expect(await db.entries.get('entry-1')).toEqual({
      id: 'entry-1',
      kind: 'expense',
      date: '2026-11-02',
      amountMinor: 1234,
      accountId: 'acct-1',
      categoryId: 'cat_groceries',
    });
  });

  it('rejects an empty rename', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    await db.accounts.add(makeAccount());

    const error = await ledger
      .renameAccount('acct-1', '   ')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'invalid-name' });
  });

  it('rejects renaming an unknown account', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();

    const error = await ledger
      .renameAccount('missing', 'Name')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'unknown-account' });
  });
});

describe('category writes', () => {
  async function setup() {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    return { db, ledger };
  }

  it('adds a trimmed active category and lists the stored row', async () => {
    const { ledger } = await setup();

    const category = await ledger.addCategory('  Coffee  ');

    expect(category).toMatchObject({ name: 'Coffee', archived: false });
    expect(category.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(await ledger.listCategories()).toContainEqual(category);
  });

  it.each(['', '   ', 'a'.repeat(61)])(
    'rejects an invalid category name %j',
    async (name) => {
      const { ledger } = await setup();

      const error = await ledger
        .addCategory(name)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(LedgerError);
      expect(error).toMatchObject({ code: 'invalid-name' });
    },
  );

  it('accepts a 60-character category name', async () => {
    const { ledger } = await setup();

    const category = await ledger.addCategory('a'.repeat(60));

    expect(category.name).toHaveLength(60);
  });

  it('refuses a duplicate name ignoring case and spaces, naming the stored category', async () => {
    const { db, ledger } = await setup();

    const error = await ledger
      .addCategory(' groceries ')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({
      code: 'duplicate-category-name',
      existingCategoryName: 'Groceries',
    });
    expect(await db.categories.count()).toBe(9);
  });

  it('refuses a duplicate name held by an archived category', async () => {
    const { db, ledger } = await setup();
    await db.categories.update('cat_groceries', { archived: true });

    const error = await ledger
      .addCategory('GROCERIES')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({
      code: 'duplicate-category-name',
      existingCategoryName: 'Groceries',
    });
  });

  it('renames a category, trimming the name', async () => {
    const { db, ledger } = await setup();

    await ledger.renameCategory('cat_groceries', '  Food  ');

    expect(await db.categories.get('cat_groceries')).toEqual({
      id: 'cat_groceries',
      name: 'Food',
      archived: false,
    });
  });

  it('allows renaming a category to its own name with different capitalisation', async () => {
    const { db, ledger } = await setup();

    await ledger.renameCategory('cat_groceries', 'GROCERIES');

    expect((await db.categories.get('cat_groceries'))?.name).toBe('GROCERIES');
  });

  it('refuses renaming to another category name', async () => {
    const { db, ledger } = await setup();

    const error = await ledger
      .renameCategory('cat_groceries', 'Transport')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({
      code: 'duplicate-category-name',
      existingCategoryName: 'Transport',
    });
    expect((await db.categories.get('cat_groceries'))?.name).toBe('Groceries');
  });

  it('refuses renaming an unknown category', async () => {
    const { ledger } = await setup();

    const error = await ledger
      .renameCategory('cat_missing', 'Food')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'unknown-category' });
  });

  it('propagates a rename to a past month without changing totals or entries', async () => {
    const { db, ledger } = await setup();
    const account = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    const entry = await ledger.addExpense({
      amountMinor: 1234,
      categoryId: 'cat_groceries',
      accountId: account.id,
      date: '2026-10-14',
    });

    await ledger.renameCategory('cat_groceries', 'Food');

    expect(await db.entries.get(entry.id)).toEqual(entry);
    const summary = await ledger.monthSummary('2026-10');
    expect(summary.totalMinor).toBe(1234);
    expect(summary.rows).toEqual([
      {
        categoryId: 'cat_groceries',
        name: 'Food',
        amountMinor: 1234,
        previousAmountMinor: 0,
      },
    ]);
    const entries = await ledger.categoryEntries('2026-10', 'cat_groceries');
    expect(entries.categoryName).toBe('Food');
    expect(entries.totalMinor).toBe(1234);
  });

  it('archives and unarchives idempotently', async () => {
    const { db, ledger } = await setup();

    await ledger.setCategoryArchived('cat_fun', true);
    expect((await db.categories.get('cat_fun'))?.archived).toBe(true);

    await ledger.setCategoryArchived('cat_fun', true);
    expect(await db.categories.get('cat_fun')).toEqual({
      id: 'cat_fun',
      name: 'Fun',
      archived: true,
    });

    await ledger.setCategoryArchived('cat_fun', false);
    expect((await db.categories.get('cat_fun'))?.archived).toBe(false);
  });

  it('allows archiving every seed category', async () => {
    const { ledger } = await setup();

    for (const category of await ledger.listCategories()) {
      await ledger.setCategoryArchived(category.id, true);
    }

    expect(
      (await ledger.listCategories()).every((category) => category.archived),
    ).toBe(true);
  });

  it('refuses archiving an unknown category', async () => {
    const { ledger } = await setup();

    const error = await ledger
      .setCategoryArchived('cat_missing', true)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'unknown-category' });
  });

  it('round-trips added, renamed, and archived categories through backup data', async () => {
    const { ledger } = await setup();
    const older = await ledger.readBackupData();

    await ledger.addCategory('Coffee');
    await ledger.renameCategory('cat_groceries', 'Dining');
    await ledger.setCategoryArchived('cat_fun', true);
    const newer = await ledger.readBackupData();

    const secondDb = openDatabase();
    const second = createLedger(secondDb);
    await second.initialize();

    await second.restoreBackup(newer);
    const restored = await second.listCategories();
    const byId = (left: { id: string }, right: { id: string }) =>
      left.id.localeCompare(right.id);
    expect([...restored].sort(byId)).toEqual([...newer.categories].sort(byId));
    expect(restored.some((category) => category.name === 'Coffee')).toBe(true);
    expect(
      restored.find((category) => category.id === 'cat_groceries'),
    ).toMatchObject({ name: 'Dining', archived: false });
    expect(
      restored.find((category) => category.id === 'cat_fun'),
    ).toMatchObject({ archived: true });

    await second.restoreBackup(older);
    const restoredOlder = await second.listCategories();
    expect(restoredOlder.some((category) => category.name === 'Coffee')).toBe(
      false,
    );
    expect(
      restoredOlder.find((category) => category.id === 'cat_groceries')?.name,
    ).toBe('Groceries');
    expect(
      restoredOlder.find((category) => category.id === 'cat_fun')?.archived,
    ).toBe(false);
    expect([...restoredOlder].sort(byId)).toEqual(
      [...older.categories].sort(byId),
    );
  });
});

describe('addExpense', () => {
  async function setup() {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    const account = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    return { db, ledger, account };
  }

  it('writes one expense and remembers the account', async () => {
    const { db, ledger, account } = await setup();

    const entry = await ledger.addExpense({
      amountMinor: 1234,
      categoryId: 'cat_groceries',
      accountId: account.id,
      date: '2026-11-02',
    });

    expect(entry).toMatchObject({
      kind: 'expense',
      date: '2026-11-02',
      amountMinor: 1234,
      accountId: account.id,
      categoryId: 'cat_groceries',
    });
    expect(entry).not.toHaveProperty('toAccountId');
    expect(await db.entries.get(entry.id)).toEqual(entry);
    expect((await db.settings.get('app'))?.lastAccountId).toBe(account.id);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects amount %s',
    async (amountMinor) => {
      const { db, ledger, account } = await setup();

      const error = await ledger
        .addExpense({
          amountMinor,
          categoryId: 'cat_groceries',
          accountId: account.id,
          date: '2026-11-02',
        })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(LedgerError);
      expect(error).toMatchObject({ code: 'invalid-amount' });
      expect(await db.entries.count()).toBe(0);
    },
  );

  it('rejects an invalid date', async () => {
    const { db, ledger, account } = await setup();

    const error = await ledger
      .addExpense({
        amountMinor: 100,
        categoryId: 'cat_groceries',
        accountId: account.id,
        date: '2026-02-30',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'invalid-date' });
    expect(await db.entries.count()).toBe(0);
  });

  it('rejects an unknown account', async () => {
    const { db, ledger } = await setup();

    const error = await ledger
      .addExpense({
        amountMinor: 100,
        categoryId: 'cat_groceries',
        accountId: 'missing',
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'unknown-account' });
    expect(await db.entries.count()).toBe(0);
  });

  it('rejects an unknown category', async () => {
    const { db, ledger, account } = await setup();

    const error = await ledger
      .addExpense({
        amountMinor: 100,
        categoryId: 'missing',
        accountId: account.id,
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'unknown-category' });
    expect(await db.entries.count()).toBe(0);
  });

  it('reports invalid amount before an unknown account', async () => {
    const { ledger } = await setup();

    const error = await ledger
      .addExpense({
        amountMinor: 0,
        categoryId: 'cat_groceries',
        accountId: 'missing',
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: 'invalid-amount' });
  });

  it('rejects an archived category and writes nothing', async () => {
    const { db, ledger, account } = await setup();
    await db.categories.update('cat_groceries', { archived: true });

    const error = await ledger
      .addExpense({
        amountMinor: 100,
        categoryId: 'cat_groceries',
        accountId: account.id,
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'archived-category' });
    expect(await db.entries.count()).toBe(0);
  });

  it('reports a missing category as unknown, not archived', async () => {
    const { ledger, account } = await setup();

    const error = await ledger
      .addExpense({
        amountMinor: 100,
        categoryId: 'cat_missing',
        accountId: account.id,
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'unknown-category' });
  });

  it('aborts when settings are missing', async () => {
    const { db, ledger, account } = await setup();
    await db.settings.delete('app');

    const error = await ledger
      .addExpense({
        amountMinor: 100,
        categoryId: 'cat_groceries',
        accountId: account.id,
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ message: 'Ledger not initialized' });
    expect(await db.entries.count()).toBe(0);
  });
});

describe('monthSummary', () => {
  async function setup() {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    const card = await ledger.addAccount({ name: 'Visa', type: 'credit' });
    return { db, ledger, checking, card };
  }

  it('groups expenses by category across accounts, including credit', async () => {
    const { ledger, checking, card } = await setup();
    await ledger.addExpense({
      amountMinor: 1200,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    await ledger.addExpense({
      amountMinor: 800,
      categoryId: 'cat_groceries',
      accountId: card.id,
      date: '2026-11-03',
    });
    await ledger.addExpense({
      amountMinor: 500,
      categoryId: 'cat_transport',
      accountId: card.id,
      date: '2026-11-04',
    });

    const summary = await ledger.monthSummary('2026-11');

    expect(summary).toEqual({
      month: '2026-11',
      totalMinor: 2500,
      previousMonth: '2026-10',
      previousMonthHasSpending: false,
      rows: [
        {
          categoryId: 'cat_groceries',
          name: 'Groceries',
          amountMinor: 2000,
          previousAmountMinor: 0,
        },
        {
          categoryId: 'cat_transport',
          name: 'Transport',
          amountMinor: 500,
          previousAmountMinor: 0,
        },
      ],
    });
  });

  it('sorts by amount, then name, then category id', async () => {
    const { db, ledger, checking } = await setup();
    await db.categories.bulkAdd([
      { id: 'cat_z_same', name: 'Same', archived: false },
      { id: 'cat_a_same', name: 'Same', archived: false },
    ]);
    await db.entries.bulkAdd([
      {
        id: 'entry-groceries',
        kind: 'expense',
        date: '2026-11-01',
        amountMinor: 500,
        accountId: checking.id,
        categoryId: 'cat_groceries',
      },
      {
        id: 'entry-health',
        kind: 'expense',
        date: '2026-11-02',
        amountMinor: 500,
        accountId: checking.id,
        categoryId: 'cat_health',
      },
      {
        id: 'entry-same-z',
        kind: 'expense',
        date: '2026-11-03',
        amountMinor: 500,
        accountId: checking.id,
        categoryId: 'cat_z_same',
      },
      {
        id: 'entry-same-a',
        kind: 'expense',
        date: '2026-11-04',
        amountMinor: 500,
        accountId: checking.id,
        categoryId: 'cat_a_same',
      },
      {
        id: 'entry-big',
        kind: 'expense',
        date: '2026-11-05',
        amountMinor: 900,
        accountId: checking.id,
        categoryId: 'cat_fun',
      },
    ]);

    const summary = await ledger.monthSummary('2026-11');

    expect(summary.rows.map((row) => row.categoryId)).toEqual([
      'cat_fun',
      'cat_groceries',
      'cat_health',
      'cat_a_same',
      'cat_z_same',
    ]);
    expect(summary.rows.reduce((sum, row) => sum + row.amountMinor, 0)).toBe(
      summary.totalMinor,
    );
  });

  it('excludes other months and puts backdated entries in their month', async () => {
    const { ledger, checking } = await setup();
    await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-10-31',
    });
    await ledger.addExpense({
      amountMinor: 2000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-01',
    });

    expect((await ledger.monthSummary('2026-10')).totalMinor).toBe(1000);
    expect((await ledger.monthSummary('2026-11')).totalMinor).toBe(2000);
  });

  it('returns an empty summary for a month with no spending', async () => {
    const { ledger } = await setup();

    expect(await ledger.monthSummary('2026-11')).toEqual({
      month: '2026-11',
      totalMinor: 0,
      previousMonth: '2026-10',
      previousMonthHasSpending: false,
      rows: [],
    });
  });

  it('keeps a missing category as an Uncategorized row', async () => {
    const { db, ledger, checking } = await setup();
    await db.entries.add({
      id: 'entry-missing-category',
      kind: 'expense',
      date: '2026-11-02',
      amountMinor: 750,
      accountId: checking.id,
      categoryId: 'cat_missing',
    });

    expect(await ledger.monthSummary('2026-11')).toEqual({
      month: '2026-11',
      totalMinor: 750,
      previousMonth: '2026-10',
      previousMonthHasSpending: false,
      rows: [
        {
          categoryId: 'cat_missing',
          name: 'Uncategorized',
          amountMinor: 750,
          previousAmountMinor: 0,
        },
      ],
    });
  });

  it('ignores non-expense kinds', async () => {
    const { db, ledger, checking } = await setup();
    await db.entries.bulkAdd([
      {
        id: 'entry-income',
        kind: 'income',
        date: '2026-11-01',
        amountMinor: 1000,
        accountId: checking.id,
        categoryId: 'cat_other',
      },
      {
        id: 'entry-transfer',
        kind: 'transfer',
        date: '2026-11-02',
        amountMinor: 2000,
        accountId: checking.id,
        toAccountId: checking.id,
      },
      {
        id: 'entry-opening',
        kind: 'opening',
        date: '2026-11-03',
        amountMinor: -3000,
        accountId: checking.id,
      },
      {
        id: 'entry-expense',
        kind: 'expense',
        date: '2026-11-04',
        amountMinor: 400,
        accountId: checking.id,
        categoryId: 'cat_other',
      },
    ]);

    const summary = await ledger.monthSummary('2026-11');

    expect(summary.totalMinor).toBe(400);
    expect(summary.rows).toEqual([
      {
        categoryId: 'cat_other',
        name: 'Other',
        amountMinor: 400,
        previousAmountMinor: 0,
      },
    ]);
  });

  it('throws RangeError for a malformed month', async () => {
    const { ledger } = await setup();

    await expect(ledger.monthSummary('2026-13')).rejects.toThrow(RangeError);
  });

  describe('comparison', () => {
    it('returns both months for categories with spending in either', async () => {
      const { ledger, checking } = await setup();
      await ledger.addExpense({
        amountMinor: 1500,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-10-05',
      });
      await ledger.addExpense({
        amountMinor: 300,
        categoryId: 'cat_health',
        accountId: checking.id,
        date: '2026-10-06',
      });
      await ledger.addExpense({
        amountMinor: 1200,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-11-02',
      });
      await ledger.addExpense({
        amountMinor: 800,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-11-03',
      });
      await ledger.addExpense({
        amountMinor: 500,
        categoryId: 'cat_transport',
        accountId: checking.id,
        date: '2026-11-04',
      });

      expect(await ledger.monthSummary('2026-11')).toEqual({
        month: '2026-11',
        totalMinor: 2500,
        previousMonth: '2026-10',
        previousMonthHasSpending: true,
        rows: [
          {
            categoryId: 'cat_groceries',
            name: 'Groceries',
            amountMinor: 2000,
            previousAmountMinor: 1500,
          },
          {
            categoryId: 'cat_transport',
            name: 'Transport',
            amountMinor: 500,
            previousAmountMinor: 0,
          },
          {
            categoryId: 'cat_health',
            name: 'Health',
            amountMinor: 0,
            previousAmountMinor: 300,
          },
        ],
      });
    });

    it('zero-fills the previous amount when only the current month has spending', async () => {
      const { ledger, checking } = await setup();
      await ledger.addExpense({
        amountMinor: 500,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-11-02',
      });
      await ledger.addExpense({
        amountMinor: 300,
        categoryId: 'cat_transport',
        accountId: checking.id,
        date: '2026-11-03',
      });

      expect(await ledger.monthSummary('2026-11')).toEqual({
        month: '2026-11',
        totalMinor: 800,
        previousMonth: '2026-10',
        previousMonthHasSpending: false,
        rows: [
          {
            categoryId: 'cat_groceries',
            name: 'Groceries',
            amountMinor: 500,
            previousAmountMinor: 0,
          },
          {
            categoryId: 'cat_transport',
            name: 'Transport',
            amountMinor: 300,
            previousAmountMinor: 0,
          },
        ],
      });
    });

    it('zero-fills the current amount when only the previous month has spending', async () => {
      const { ledger, checking } = await setup();
      await ledger.addExpense({
        amountMinor: 1000,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-10-05',
      });
      await ledger.addExpense({
        amountMinor: 300,
        categoryId: 'cat_health',
        accountId: checking.id,
        date: '2026-10-06',
      });

      expect(await ledger.monthSummary('2026-11')).toEqual({
        month: '2026-11',
        totalMinor: 0,
        previousMonth: '2026-10',
        previousMonthHasSpending: true,
        rows: [
          {
            categoryId: 'cat_groceries',
            name: 'Groceries',
            amountMinor: 0,
            previousAmountMinor: 1000,
          },
          {
            categoryId: 'cat_health',
            name: 'Health',
            amountMinor: 0,
            previousAmountMinor: 300,
          },
        ],
      });
    });

    it('returns no rows when neither month has spending', async () => {
      const { ledger } = await setup();

      expect(await ledger.monthSummary('2026-11')).toEqual({
        month: '2026-11',
        totalMinor: 0,
        previousMonth: '2026-10',
        previousMonthHasSpending: false,
        rows: [],
      });
    });

    it('orders current rows first, then previous-only rows, with name and id tie-breaks', async () => {
      const { db, ledger, checking } = await setup();
      await db.categories.bulkAdd([
        { id: 'cat_a_same_current', name: 'Same current', archived: false },
        { id: 'cat_z_same_current', name: 'Same current', archived: false },
        { id: 'cat_a_same_prev', name: 'Same prev', archived: false },
        { id: 'cat_z_same_prev', name: 'Same prev', archived: false },
      ]);
      await ledger.addExpense({
        amountMinor: 900,
        categoryId: 'cat_fun',
        accountId: checking.id,
        date: '2026-11-01',
      });
      await ledger.addExpense({
        amountMinor: 500,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-11-02',
      });
      await ledger.addExpense({
        amountMinor: 500,
        categoryId: 'cat_health',
        accountId: checking.id,
        date: '2026-11-03',
      });
      await ledger.addExpense({
        amountMinor: 200,
        categoryId: 'cat_z_same_current',
        accountId: checking.id,
        date: '2026-11-04',
      });
      await ledger.addExpense({
        amountMinor: 200,
        categoryId: 'cat_a_same_current',
        accountId: checking.id,
        date: '2026-11-05',
      });
      await ledger.addExpense({
        amountMinor: 50,
        categoryId: 'cat_fun',
        accountId: checking.id,
        date: '2026-10-01',
      });
      await ledger.addExpense({
        amountMinor: 700,
        categoryId: 'cat_housing',
        accountId: checking.id,
        date: '2026-10-02',
      });
      await ledger.addExpense({
        amountMinor: 400,
        categoryId: 'cat_transport',
        accountId: checking.id,
        date: '2026-10-03',
      });
      await ledger.addExpense({
        amountMinor: 400,
        categoryId: 'cat_bills',
        accountId: checking.id,
        date: '2026-10-04',
      });
      await ledger.addExpense({
        amountMinor: 100,
        categoryId: 'cat_z_same_prev',
        accountId: checking.id,
        date: '2026-10-05',
      });
      await ledger.addExpense({
        amountMinor: 100,
        categoryId: 'cat_a_same_prev',
        accountId: checking.id,
        date: '2026-10-06',
      });

      const summary = await ledger.monthSummary('2026-11');

      expect(summary.rows.map((row) => row.categoryId)).toEqual([
        'cat_fun',
        'cat_groceries',
        'cat_health',
        'cat_a_same_current',
        'cat_z_same_current',
        'cat_housing',
        'cat_bills',
        'cat_transport',
        'cat_a_same_prev',
        'cat_z_same_prev',
      ]);
      expect(summary.rows[5]?.previousAmountMinor).toBe(700);
      expect(summary.rows[9]?.previousAmountMinor).toBe(100);
    });

    it('compares January with the previous December', async () => {
      const { ledger, checking } = await setup();
      await ledger.addExpense({
        amountMinor: 800,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-12-05',
      });
      await ledger.addExpense({
        amountMinor: 500,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2027-01-05',
      });

      expect(await ledger.monthSummary('2027-01')).toEqual({
        month: '2027-01',
        totalMinor: 500,
        previousMonth: '2026-12',
        previousMonthHasSpending: true,
        rows: [
          {
            categoryId: 'cat_groceries',
            name: 'Groceries',
            amountMinor: 500,
            previousAmountMinor: 800,
          },
        ],
      });
    });

    it('returns a null predecessor at the lower bound and a real one at the upper bound', async () => {
      const { ledger } = await setup();

      expect(await ledger.monthSummary(MIN_MONTH)).toEqual({
        month: MIN_MONTH,
        totalMinor: 0,
        previousMonth: null,
        previousMonthHasSpending: false,
        rows: [],
      });

      const upper = await ledger.monthSummary(MAX_MONTH);
      expect(upper.previousMonth).toBe('9999-11');
      expect(upper.previousMonthHasSpending).toBe(false);
    });

    it('keeps totalMinor as the sum of current amounts only', async () => {
      const { ledger, checking } = await setup();
      await ledger.addExpense({
        amountMinor: 300,
        categoryId: 'cat_health',
        accountId: checking.id,
        date: '2026-10-05',
      });
      await ledger.addExpense({
        amountMinor: 500,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-11-05',
      });

      const summary = await ledger.monthSummary('2026-11');

      expect(summary.totalMinor).toBe(500);
      expect(summary.totalMinor).toBe(
        summary.rows.reduce((sum, row) => sum + row.amountMinor, 0),
      );
      expect(summary.rows.find((row) => row.categoryId === 'cat_health')).toEqual(
        {
          categoryId: 'cat_health',
          name: 'Health',
          amountMinor: 0,
          previousAmountMinor: 300,
        },
      );
    });

    it('ignores non-expense kinds in both months and an income-only predecessor', async () => {
      const { db, ledger, checking } = await setup();
      await db.entries.bulkAdd([
        {
          id: 'oct-income',
          kind: 'income',
          date: '2026-10-01',
          amountMinor: 2000,
          accountId: checking.id,
          categoryId: 'cat_other',
        },
        {
          id: 'oct-transfer',
          kind: 'transfer',
          date: '2026-10-02',
          amountMinor: 500,
          accountId: checking.id,
          toAccountId: checking.id,
        },
        {
          id: 'oct-opening',
          kind: 'opening',
          date: '2026-10-03',
          amountMinor: -3000,
          accountId: checking.id,
        },
        {
          id: 'nov-income',
          kind: 'income',
          date: '2026-11-01',
          amountMinor: 1000,
          accountId: checking.id,
          categoryId: 'cat_other',
        },
        {
          id: 'nov-transfer',
          kind: 'transfer',
          date: '2026-11-02',
          amountMinor: 500,
          accountId: checking.id,
          toAccountId: checking.id,
        },
        {
          id: 'nov-opening',
          kind: 'opening',
          date: '2026-11-03',
          amountMinor: -3000,
          accountId: checking.id,
        },
        {
          id: 'nov-expense',
          kind: 'expense',
          date: '2026-11-04',
          amountMinor: 400,
          accountId: checking.id,
          categoryId: 'cat_groceries',
        },
      ]);

      expect(await ledger.monthSummary('2026-11')).toEqual({
        month: '2026-11',
        totalMinor: 400,
        previousMonth: '2026-10',
        previousMonthHasSpending: false,
        rows: [
          {
            categoryId: 'cat_groceries',
            name: 'Groceries',
            amountMinor: 400,
            previousAmountMinor: 0,
          },
        ],
      });
      expect(await ledger.monthSummary('2026-10')).toEqual({
        month: '2026-10',
        totalMinor: 0,
        previousMonth: '2026-09',
        previousMonthHasSpending: false,
        rows: [],
      });
    });

    it('keeps a missing category id and the sentinel as distinct rows', async () => {
      const { db, ledger, checking } = await setup();
      await db.entries.bulkAdd([
        {
          id: 'nov-missing-category',
          kind: 'expense',
          date: '2026-11-02',
          amountMinor: 750,
          accountId: checking.id,
          categoryId: 'cat_missing',
        },
        {
          id: 'nov-no-category',
          kind: 'expense',
          date: '2026-11-03',
          amountMinor: 250,
          accountId: checking.id,
        },
      ]);

      expect((await ledger.monthSummary('2026-11')).rows).toEqual([
        {
          categoryId: 'cat_missing',
          name: UNCATEGORIZED_LABEL,
          amountMinor: 750,
          previousAmountMinor: 0,
        },
        {
          categoryId: UNCATEGORIZED_CATEGORY_ID,
          name: UNCATEGORIZED_LABEL,
          amountMinor: 250,
          previousAmountMinor: 0,
        },
      ]);
    });

    it('shows a renamed category in both columns and keeps an archived one', async () => {
      const { ledger, checking } = await setup();
      await ledger.addExpense({
        amountMinor: 1000,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-10-05',
      });
      await ledger.addExpense({
        amountMinor: 500,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-11-05',
      });

      await ledger.renameCategory('cat_groceries', 'Food');

      expect((await ledger.monthSummary('2026-11')).rows).toEqual([
        {
          categoryId: 'cat_groceries',
          name: 'Food',
          amountMinor: 500,
          previousAmountMinor: 1000,
        },
      ]);
      expect((await ledger.monthSummary('2026-10')).rows).toEqual([
        {
          categoryId: 'cat_groceries',
          name: 'Food',
          amountMinor: 1000,
          previousAmountMinor: 0,
        },
      ]);

      await ledger.setCategoryArchived('cat_groceries', true);

      expect((await ledger.monthSummary('2026-11')).rows).toEqual([
        {
          categoryId: 'cat_groceries',
          name: 'Food',
          amountMinor: 500,
          previousAmountMinor: 1000,
        },
      ]);
      expect((await ledger.monthSummary('2026-10')).rows).toEqual([
        {
          categoryId: 'cat_groceries',
          name: 'Food',
          amountMinor: 1000,
          previousAmountMinor: 0,
        },
      ]);
    });

    it('reflects corrections and removals in both months', async () => {
      const { ledger, checking } = await setup();
      const entry = await ledger.addExpense({
        amountMinor: 1000,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-11-02',
      });

      await ledger.updateExpense(entry.id, {
        amountMinor: 700,
        categoryId: 'cat_transport',
        accountId: checking.id,
        date: '2026-10-15',
      });

      expect(await ledger.monthSummary('2026-10')).toEqual({
        month: '2026-10',
        totalMinor: 700,
        previousMonth: '2026-09',
        previousMonthHasSpending: false,
        rows: [
          {
            categoryId: 'cat_transport',
            name: 'Transport',
            amountMinor: 700,
            previousAmountMinor: 0,
          },
        ],
      });
      expect(await ledger.monthSummary('2026-11')).toEqual({
        month: '2026-11',
        totalMinor: 0,
        previousMonth: '2026-10',
        previousMonthHasSpending: true,
        rows: [
          {
            categoryId: 'cat_transport',
            name: 'Transport',
            amountMinor: 0,
            previousAmountMinor: 700,
          },
        ],
      });

      await ledger.updateExpense(entry.id, {
        amountMinor: 700,
        categoryId: 'cat_fun',
        accountId: checking.id,
        date: '2026-10-15',
      });

      expect((await ledger.monthSummary('2026-10')).rows).toEqual([
        {
          categoryId: 'cat_fun',
          name: 'Fun',
          amountMinor: 700,
          previousAmountMinor: 0,
        },
      ]);
      expect((await ledger.monthSummary('2026-11')).rows).toEqual([
        {
          categoryId: 'cat_fun',
          name: 'Fun',
          amountMinor: 0,
          previousAmountMinor: 700,
        },
      ]);

      await ledger.deleteExpense(entry.id);

      expect(await ledger.monthSummary('2026-10')).toEqual({
        month: '2026-10',
        totalMinor: 0,
        previousMonth: '2026-09',
        previousMonthHasSpending: false,
        rows: [],
      });
      expect(await ledger.monthSummary('2026-11')).toEqual({
        month: '2026-11',
        totalMinor: 0,
        previousMonth: '2026-10',
        previousMonthHasSpending: false,
        rows: [],
      });
    });

    it('agrees with categoryEntries for current and previous-only rows', async () => {
      const { ledger, checking } = await setup();
      await ledger.addExpense({
        amountMinor: 1000,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-10-05',
      });
      await ledger.addExpense({
        amountMinor: 300,
        categoryId: 'cat_health',
        accountId: checking.id,
        date: '2026-10-06',
      });
      await ledger.addExpense({
        amountMinor: 500,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-11-05',
      });

      const summary = await ledger.monthSummary('2026-11');
      for (const row of summary.rows) {
        const list = await ledger.categoryEntries('2026-11', row.categoryId);
        expect(list.totalMinor).toBe(row.amountMinor);
      }

      const previousOnly = await ledger.categoryEntries(
        '2026-11',
        'cat_health',
      );
      expect(previousOnly.totalMinor).toBe(0);
      expect(previousOnly.rows).toEqual([]);
    });

    it('keeps the schema and backup versions at 1', () => {
      expect(SCHEMA_VERSION).toBe(1);
      expect(BACKUP_SCHEMA_VERSION).toBe(1);
    });
  });
});

describe('categories and settings reads', () => {
  it('lists active categories before archived, alphabetical within each group', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    await db.categories.add({ id: 'cat_aaa', name: 'Bills', archived: true });

    expect((await ledger.listCategories()).map((category) => category.id)).toEqual([
      'cat_bills',
      'cat_eating_out',
      'cat_fun',
      'cat_groceries',
      'cat_health',
      'cat_housing',
      'cat_other',
      'cat_shopping',
      'cat_transport',
      'cat_aaa',
    ]);
  });

  it('breaks same-name ties by id inside a group', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    await db.categories.bulkAdd([
      { id: 'cat_z_same', name: 'Same', archived: false },
      { id: 'cat_a_same', name: 'Same', archived: false },
    ]);

    const sameIds = (await ledger.listCategories())
      .filter((category) => category.name === 'Same')
      .map((category) => category.id);

    expect(sameIds).toEqual(['cat_a_same', 'cat_z_same']);
  });

  it('returns the seeded settings row', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();

    expect(await ledger.getSettings()).toEqual({
      id: 'app',
      currency: 'CAD',
      currencyExponent: 2,
    });
  });

  it('throws a plain Error when settings are missing', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    await db.settings.delete('app');

    const error = await ledger.getSettings().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ message: 'Ledger not initialized' });
  });
});

describe('categoryEntries', () => {
  async function setup() {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    const card = await ledger.addAccount({ name: 'Visa', type: 'credit' });
    return { db, ledger, checking, card };
  }

  it('returns only the requested category and month, newest first', async () => {
    const { ledger, checking, card } = await setup();
    await ledger.addExpense({
      amountMinor: 1200,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    await ledger.addExpense({
      amountMinor: 800,
      categoryId: 'cat_groceries',
      accountId: card.id,
      date: '2026-11-03',
    });
    await ledger.addExpense({
      amountMinor: 500,
      categoryId: 'cat_transport',
      accountId: card.id,
      date: '2026-11-04',
    });
    await ledger.addExpense({
      amountMinor: 999,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-10-31',
    });

    const result = await ledger.categoryEntries('2026-11', 'cat_groceries');

    expect(result.month).toBe('2026-11');
    expect(result.categoryId).toBe('cat_groceries');
    expect(result.categoryName).toBe('Groceries');
    expect(result.totalMinor).toBe(2000);
    expect(result.rows.map((row) => [row.amountMinor, row.date])).toEqual([
      [800, '2026-11-03'],
      [1200, '2026-11-02'],
    ]);
    expect(result.rows.map((row) => row.accountName)).toEqual([
      'Visa',
      'Checking',
    ]);
    expect(result.rows.map((row) => row.accountType)).toEqual([
      'credit',
      'checking',
    ]);
  });

  it('sorts same-day rows by id descending, not insertion order', async () => {
    const { db, ledger, checking } = await setup();
    await db.entries.bulkAdd([
      {
        id: 'entry-b',
        kind: 'expense',
        date: '2026-11-05',
        amountMinor: 200,
        accountId: checking.id,
        categoryId: 'cat_groceries',
      },
      {
        id: 'entry-a',
        kind: 'expense',
        date: '2026-11-05',
        amountMinor: 100,
        accountId: checking.id,
        categoryId: 'cat_groceries',
      },
    ]);

    const result = await ledger.categoryEntries('2026-11', 'cat_groceries');

    expect(result.rows.map((row) => row.id)).toEqual(['entry-b', 'entry-a']);
    expect(result.rows.reduce((sum, row) => sum + row.amountMinor, 0)).toBe(
      result.totalMinor,
    );
  });

  it('matches the month summary total for every row of a mixed month', async () => {
    const { ledger, checking, card } = await setup();
    await ledger.addExpense({
      amountMinor: 1200,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    await ledger.addExpense({
      amountMinor: 800,
      categoryId: 'cat_groceries',
      accountId: card.id,
      date: '2026-11-03',
    });
    await ledger.addExpense({
      amountMinor: 500,
      categoryId: 'cat_transport',
      accountId: card.id,
      date: '2026-11-04',
    });

    const summary = await ledger.monthSummary('2026-11');

    expect(summary.totalMinor).toBe(2500);
    for (const row of summary.rows) {
      const list = await ledger.categoryEntries('2026-11', row.categoryId);
      expect(list.totalMinor).toBe(row.amountMinor);
    }
  });

  it('returns an empty list with the resolved category name', async () => {
    const { ledger } = await setup();

    expect(await ledger.categoryEntries('2026-11', 'cat_transport')).toEqual({
      month: '2026-11',
      categoryId: 'cat_transport',
      categoryName: 'Transport',
      totalMinor: 0,
      rows: [],
    });
  });

  it('throws RangeError for a malformed month', async () => {
    const { ledger } = await setup();

    await expect(
      ledger.categoryEntries('2026-13', 'cat_groceries'),
    ).rejects.toThrow(RangeError);
  });

  it('groups a raw entry without a category under the sentinel', async () => {
    const { db, ledger, checking } = await setup();
    await db.entries.add({
      id: 'entry-orphan-category',
      kind: 'expense',
      date: '2026-11-02',
      amountMinor: 750,
      accountId: checking.id,
    });

    const result = await ledger.categoryEntries(
      '2026-11',
      UNCATEGORIZED_CATEGORY_ID,
    );

    expect(result.categoryName).toBe(UNCATEGORIZED_LABEL);
    expect(result.totalMinor).toBe(750);
    expect(result.rows).toEqual([
      {
        id: 'entry-orphan-category',
        date: '2026-11-02',
        amountMinor: 750,
        accountId: checking.id,
        accountName: 'Checking',
        accountType: 'checking',
      },
    ]);
    expect((await ledger.monthSummary('2026-11')).rows).toEqual([
      {
        categoryId: UNCATEGORIZED_CATEGORY_ID,
        name: UNCATEGORIZED_LABEL,
        amountMinor: 750,
        previousAmountMinor: 0,
      },
    ]);
  });

  it('degrades a missing account to Unknown account and keeps the amount', async () => {
    const { db, ledger } = await setup();
    await db.entries.add({
      id: 'entry-orphan-account',
      kind: 'expense',
      date: '2026-11-02',
      amountMinor: 4500,
      accountId: 'acct-missing',
      categoryId: 'cat_groceries',
    });

    const result = await ledger.categoryEntries('2026-11', 'cat_groceries');

    expect(result.rows).toEqual([
      {
        id: 'entry-orphan-account',
        date: '2026-11-02',
        amountMinor: 4500,
        accountId: 'acct-missing',
        accountName: 'Unknown account',
        accountType: null,
      },
    ]);
    expect(result.totalMinor).toBe(4500);
  });

  it('degrades a missing category to Uncategorized and keeps the amount', async () => {
    const { db, ledger, checking } = await setup();
    await db.entries.add({
      id: 'entry-orphan-category-row',
      kind: 'expense',
      date: '2026-11-02',
      amountMinor: 300,
      accountId: checking.id,
      categoryId: 'cat_missing',
    });

    const result = await ledger.categoryEntries('2026-11', 'cat_missing');

    expect(result.categoryName).toBe(UNCATEGORIZED_LABEL);
    expect(result.totalMinor).toBe(300);
  });

  it('resolves an archived category name', async () => {
    const { db, ledger, checking } = await setup();
    await ledger.addExpense({
      amountMinor: 100,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    await db.categories.update('cat_groceries', { archived: true });

    expect(
      (await ledger.categoryEntries('2026-11', 'cat_groceries')).categoryName,
    ).toBe('Groceries');
  });

  it('ignores non-expense kinds', async () => {
    const { db, ledger, checking } = await setup();
    await db.entries.bulkAdd([
      {
        id: 'entry-income',
        kind: 'income',
        date: '2026-11-01',
        amountMinor: 1000,
        accountId: checking.id,
        categoryId: 'cat_groceries',
      },
      {
        id: 'entry-opening',
        kind: 'opening',
        date: '2026-11-02',
        amountMinor: -3000,
        accountId: checking.id,
      },
      {
        id: 'entry-expense',
        kind: 'expense',
        date: '2026-11-03',
        amountMinor: 400,
        accountId: checking.id,
        categoryId: 'cat_groceries',
      },
    ]);

    const result = await ledger.categoryEntries('2026-11', 'cat_groceries');

    expect(result.rows.map((row) => row.id)).toEqual(['entry-expense']);
    expect(result.totalMinor).toBe(400);
  });
});

describe('getEntry', () => {
  it('returns the stored row for a known id', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    const account = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    const entry = await ledger.addExpense({
      amountMinor: 1234,
      categoryId: 'cat_groceries',
      accountId: account.id,
      date: '2026-11-02',
    });

    expect(await ledger.getEntry(entry.id)).toEqual(entry);
  });

  it('returns null, never undefined, for an unknown id', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();

    const result = await ledger.getEntry('missing');

    expect(result).toBeNull();
    expect(result).not.toBeUndefined();
  });

  it('returns a non-expense row unchanged', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    const income: Entry = {
      id: 'entry-income',
      kind: 'income',
      date: '2026-11-02',
      amountMinor: 5000,
      accountId: 'acct-1',
      categoryId: 'cat_other',
    };
    await db.entries.add(income);

    expect(await ledger.getEntry('entry-income')).toEqual(income);
  });
});

describe('updateExpense', () => {
  async function setup() {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    const card = await ledger.addAccount({ name: 'Visa', type: 'credit' });
    return { db, ledger, checking, card };
  }

  it('keeps an entry filed under its own archived category', async () => {
    const { db, ledger, checking } = await setup();
    const entry = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    await db.categories.update('cat_groceries', { archived: true });

    const updated = await ledger.updateExpense(entry.id, {
      amountMinor: 450,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-05',
    });

    expect(updated.categoryId).toBe('cat_groceries');
    expect(await db.entries.get(entry.id)).toEqual({
      id: entry.id,
      kind: 'expense',
      date: '2026-11-05',
      amountMinor: 450,
      accountId: checking.id,
      categoryId: 'cat_groceries',
    });
  });

  it('refuses moving an entry to a different archived category', async () => {
    const { db, ledger, checking } = await setup();
    const entry = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    const before = await db.entries.get(entry.id);
    await db.categories.update('cat_groceries', { archived: true });
    await db.categories.update('cat_fun', { archived: true });

    const error = await ledger
      .updateExpense(entry.id, {
        amountMinor: 1000,
        categoryId: 'cat_fun',
        accountId: checking.id,
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'archived-category' });
    expect(await db.entries.get(entry.id)).toEqual(before);
  });

  it('reports a missing category as unknown on update', async () => {
    const { ledger, checking } = await setup();
    const entry = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

    const error = await ledger
      .updateExpense(entry.id, {
        amountMinor: 1000,
        categoryId: 'cat_missing',
        accountId: checking.id,
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'unknown-category' });
  });

  it('overwrites the four fields and preserves identity', async () => {
    const { db, ledger, checking, card } = await setup();
    const entry = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

    const updated = await ledger.updateExpense(entry.id, {
      amountMinor: 450,
      categoryId: 'cat_eating_out',
      accountId: card.id,
      date: '2026-11-03',
    });

    expect(updated).toEqual({
      id: entry.id,
      kind: 'expense',
      date: '2026-11-03',
      amountMinor: 450,
      accountId: card.id,
      categoryId: 'cat_eating_out',
    });
    expect(await db.entries.get(entry.id)).toEqual(updated);
  });

  it('leaves every other entry untouched', async () => {
    const { db, ledger, checking } = await setup();
    const first = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    const second = await ledger.addExpense({
      amountMinor: 500,
      categoryId: 'cat_transport',
      accountId: checking.id,
      date: '2026-11-05',
    });
    const before = await db.entries.get(second.id);

    await ledger.updateExpense(first.id, {
      amountMinor: 2000,
      categoryId: 'cat_fun',
      accountId: checking.id,
      date: '2026-11-04',
    });

    expect(await db.entries.get(second.id)).toEqual(before);
  });

  it('moves an amount between category rows and between months', async () => {
    const { ledger, checking, card } = await setup();
    const entry = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    await ledger.addExpense({
      amountMinor: 500,
      categoryId: 'cat_transport',
      accountId: card.id,
      date: '2026-11-05',
    });

    await ledger.updateExpense(entry.id, {
      amountMinor: 700,
      categoryId: 'cat_transport',
      accountId: card.id,
      date: '2026-12-01',
    });

    expect(await ledger.monthSummary('2026-11')).toEqual({
      month: '2026-11',
      totalMinor: 500,
      previousMonth: '2026-10',
      previousMonthHasSpending: false,
      rows: [
        {
          categoryId: 'cat_transport',
          name: 'Transport',
          amountMinor: 500,
          previousAmountMinor: 0,
        },
      ],
    });
    expect(await ledger.monthSummary('2026-12')).toEqual({
      month: '2026-12',
      totalMinor: 700,
      previousMonth: '2026-11',
      previousMonthHasSpending: true,
      rows: [
        {
          categoryId: 'cat_transport',
          name: 'Transport',
          amountMinor: 700,
          previousAmountMinor: 500,
        },
      ],
    });
  });

  it('rejects an unknown id before anything else', async () => {
    const { ledger } = await setup();

    const error = await ledger
      .updateExpense('missing', {
        amountMinor: 0,
        categoryId: 'cat_groceries',
        accountId: 'acct-missing',
        date: '2026-02-30',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'unknown-entry' });
  });

  it('rejects a raw non-expense row', async () => {
    const { db, ledger, checking } = await setup();
    await db.entries.add({
      id: 'entry-income',
      kind: 'income',
      date: '2026-11-02',
      amountMinor: 1000,
      accountId: checking.id,
      categoryId: 'cat_other',
    });

    const error = await ledger
      .updateExpense('entry-income', {
        amountMinor: 1000,
        categoryId: 'cat_other',
        accountId: checking.id,
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: 'unsupported-entry-kind' });
  });

  it.each([
    [{ amountMinor: 0 }, 'invalid-amount'],
    [{ date: '2026-02-30' }, 'invalid-date'],
    [{ accountId: 'acct-missing' }, 'unknown-account'],
    [{ categoryId: 'cat_missing' }, 'unknown-category'],
  ] as const)('rejects %j with %s', async (override, code) => {
    const { db, ledger, checking } = await setup();
    const entry = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

    const error = await ledger
      .updateExpense(entry.id, {
        amountMinor: 1000,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-11-02',
        ...override,
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code });
    expect(await db.entries.get(entry.id)).toEqual(entry);
  });

  it('reports an invalid amount before an unknown account', async () => {
    const { ledger, checking } = await setup();
    const entry = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

    const error = await ledger
      .updateExpense(entry.id, {
        amountMinor: -5,
        categoryId: 'cat_groceries',
        accountId: 'acct-missing',
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: 'invalid-amount' });
  });

  it('succeeds when saving identical values', async () => {
    const { ledger, checking } = await setup();
    const entry = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

    expect(
      await ledger.updateExpense(entry.id, {
        amountMinor: 1000,
        categoryId: 'cat_groceries',
        accountId: checking.id,
        date: '2026-11-02',
      }),
    ).toEqual(entry);
  });

  it('does not change settings.lastAccountId', async () => {
    const { db, ledger, checking, card } = await setup();
    const entry = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

    await ledger.updateExpense(entry.id, {
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: card.id,
      date: '2026-11-02',
    });
    await ledger.deleteExpense(entry.id);

    expect((await db.settings.get('app'))?.lastAccountId).toBe(checking.id);
  });
});

describe('deleteExpense', () => {
  async function setup() {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    return { db, ledger, checking };
  }

  it('removes exactly one row and returns its snapshot', async () => {
    const { db, ledger, checking } = await setup();
    const first = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    const second = await ledger.addExpense({
      amountMinor: 500,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-03',
    });

    const removed = await ledger.deleteExpense(first.id);

    expect(removed).toEqual(first);
    expect(await db.entries.get(first.id)).toBeUndefined();
    expect(await ledger.getEntry(second.id)).toEqual(second);
    expect(await ledger.monthSummary('2026-11')).toEqual({
      month: '2026-11',
      totalMinor: 500,
      previousMonth: '2026-10',
      previousMonthHasSpending: false,
      rows: [
        {
          categoryId: 'cat_groceries',
          name: 'Groceries',
          amountMinor: 500,
          previousAmountMinor: 0,
        },
      ],
    });
  });

  it('empties the month when it was the last entry', async () => {
    const { ledger, checking } = await setup();
    const entry = await ledger.addExpense({
      amountMinor: 1000,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

    await ledger.deleteExpense(entry.id);

    expect(await ledger.monthSummary('2026-11')).toEqual({
      month: '2026-11',
      totalMinor: 0,
      previousMonth: '2026-10',
      previousMonthHasSpending: false,
      rows: [],
    });
  });

  it('rejects an unknown id', async () => {
    const { ledger } = await setup();

    const error = await ledger
      .deleteExpense('missing')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'unknown-entry' });
  });

  it('rejects a raw non-expense row and keeps it', async () => {
    const { db, ledger, checking } = await setup();
    const opening: Entry = {
      id: 'entry-opening',
      kind: 'opening',
      date: '2026-11-02',
      amountMinor: -3000,
      accountId: checking.id,
    };
    await db.entries.add(opening);

    const error = await ledger
      .deleteExpense('entry-opening')
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: 'unsupported-entry-kind' });
    expect(await db.entries.get('entry-opening')).toEqual(opening);
  });
});

describe('transfers', () => {
  async function setup() {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    const card = await ledger.addAccount({ name: 'Visa', type: 'credit' });
    return { db, ledger, checking, card };
  }

  it('writes exactly one transfer row and returns it', async () => {
    const { db, ledger, checking, card } = await setup();

    const entry = await ledger.addTransfer({
      amountMinor: 24000,
      accountId: checking.id,
      toAccountId: card.id,
      date: '2026-11-02',
    });

    expect(entry).toMatchObject({
      kind: 'transfer',
      date: '2026-11-02',
      amountMinor: 24000,
      accountId: checking.id,
      toAccountId: card.id,
    });
    expect(entry).not.toHaveProperty('categoryId');
    expect(await db.entries.get(entry.id)).toEqual(entry);
    expect(await db.entries.count()).toBe(1);
  });

  it('accepts a credit account on either side', async () => {
    const { ledger, checking, card } = await setup();

    const fromCard = await ledger.addTransfer({
      amountMinor: 500,
      accountId: card.id,
      toAccountId: checking.id,
      date: '2026-11-02',
    });
    const toCard = await ledger.addTransfer({
      amountMinor: 700,
      accountId: checking.id,
      toAccountId: card.id,
      date: '2026-11-03',
    });

    expect(fromCard.accountId).toBe(card.id);
    expect(fromCard.toAccountId).toBe(checking.id);
    expect(toCard.accountId).toBe(checking.id);
    expect(toCard.toAccountId).toBe(card.id);
  });

  it('rejects the same account on both sides and writes nothing', async () => {
    const { db, ledger, checking } = await setup();

    const error = await ledger
      .addTransfer({
        amountMinor: 100,
        accountId: checking.id,
        toAccountId: checking.id,
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ code: 'same-transfer-account' });
    expect(await db.entries.count()).toBe(0);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects amount %s',
    async (amountMinor) => {
      const { db, ledger, checking, card } = await setup();

      const error = await ledger
        .addTransfer({
          amountMinor,
          accountId: checking.id,
          toAccountId: card.id,
          date: '2026-11-02',
        })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(LedgerError);
      expect(error).toMatchObject({ code: 'invalid-amount' });
      expect(await db.entries.count()).toBe(0);
    },
  );

  it.each(['', '2026-02-30', '2026-1-1', '2026-11-02x'])(
    'rejects date %j',
    async (date) => {
      const { db, ledger, checking, card } = await setup();

      const error = await ledger
        .addTransfer({
          amountMinor: 100,
          accountId: checking.id,
          toAccountId: card.id,
          date,
        })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(LedgerError);
      expect(error).toMatchObject({ code: 'invalid-date' });
      expect(await db.entries.count()).toBe(0);
    },
  );

  it('rejects an unknown source and an unknown destination', async () => {
    const { db, ledger, checking, card } = await setup();

    const unknownSource = await ledger
      .addTransfer({
        amountMinor: 100,
        accountId: 'missing',
        toAccountId: card.id,
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);
    const unknownDestination = await ledger
      .addTransfer({
        amountMinor: 100,
        accountId: checking.id,
        toAccountId: 'missing',
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(unknownSource).toMatchObject({ code: 'unknown-account' });
    expect(unknownDestination).toMatchObject({ code: 'unknown-to-account' });
    expect(await db.entries.count()).toBe(0);
  });

  it('checks amount, date, same-account, then source and destination', async () => {
    const { ledger, checking, card } = await setup();

    const sameAccount = await ledger
      .addTransfer({
        amountMinor: 100,
        accountId: 'missing-a',
        toAccountId: 'missing-a',
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);
    const amountBeforeDate = await ledger
      .addTransfer({
        amountMinor: 0,
        accountId: checking.id,
        toAccountId: card.id,
        date: '2026-02-30',
      })
      .catch((caught: unknown) => caught);
    const dateBeforeAccount = await ledger
      .addTransfer({
        amountMinor: 100,
        accountId: checking.id,
        toAccountId: checking.id,
        date: '2026-02-30',
      })
      .catch((caught: unknown) => caught);
    const sourceBeforeDestination = await ledger
      .addTransfer({
        amountMinor: 100,
        accountId: 'missing-a',
        toAccountId: 'missing-b',
        date: '2026-11-02',
      })
      .catch((caught: unknown) => caught);

    expect(sameAccount).toMatchObject({ code: 'same-transfer-account' });
    expect(amountBeforeDate).toMatchObject({ code: 'invalid-amount' });
    expect(dateBeforeAccount).toMatchObject({ code: 'invalid-date' });
    expect(sourceBeforeDestination).toMatchObject({
      code: 'unknown-account',
    });
  });

  it('does not change settings.lastAccountId', async () => {
    const { db, ledger, checking, card } = await setup();
    await db.settings.update('app', { lastAccountId: card.id });

    await ledger.addTransfer({
      amountMinor: 100,
      accountId: checking.id,
      toAccountId: card.id,
      date: '2026-11-02',
    });

    expect((await db.settings.get('app'))?.lastAccountId).toBe(card.id);
  });

  it('addTransfer and addExpense each still write one row', async () => {
    const { db, ledger, checking, card } = await setup();

    await ledger.addTransfer({
      amountMinor: 100,
      accountId: checking.id,
      toAccountId: card.id,
      date: '2026-11-02',
    });
    await ledger.addExpense({
      amountMinor: 200,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-03',
    });

    expect(await db.entries.count()).toBe(2);
  });

  it('lists only transfers, never expenses, income, or openings', async () => {
    const { db, ledger, checking, card } = await setup();
    await db.entries.bulkAdd([
      {
        id: 'entry-expense',
        kind: 'expense',
        date: '2026-11-02',
        amountMinor: 100,
        accountId: checking.id,
        categoryId: 'cat_groceries',
      },
      {
        id: 'entry-income',
        kind: 'income',
        date: '2026-11-02',
        amountMinor: 200,
        accountId: checking.id,
        categoryId: 'cat_other',
      },
      {
        id: 'entry-opening',
        kind: 'opening',
        date: '2026-11-02',
        amountMinor: -300,
        accountId: checking.id,
      },
      {
        id: 'entry-transfer',
        kind: 'transfer',
        date: '2026-11-02',
        amountMinor: 400,
        accountId: checking.id,
        toAccountId: card.id,
      },
    ]);

    const rows = await ledger.listTransfers();

    expect(rows.map((row) => row.id)).toEqual(['entry-transfer']);
  });

  it('orders by date descending, then id descending', async () => {
    const { db, ledger, checking, card } = await setup();
    await db.entries.bulkAdd([
      {
        id: 'a',
        kind: 'transfer',
        date: '2026-11-02',
        amountMinor: 100,
        accountId: checking.id,
        toAccountId: card.id,
      },
      {
        id: 'b',
        kind: 'transfer',
        date: '2026-11-02',
        amountMinor: 200,
        accountId: checking.id,
        toAccountId: card.id,
      },
      {
        id: 'c',
        kind: 'transfer',
        date: '2026-11-03',
        amountMinor: 300,
        accountId: checking.id,
        toAccountId: card.id,
      },
    ]);

    const rows = await ledger.listTransfers();

    expect(rows.map((row) => row.id)).toEqual(['c', 'b', 'a']);
  });

  it('joins both account names and types', async () => {
    const { ledger, checking, card } = await setup();
    const entry = await ledger.addTransfer({
      amountMinor: 24000,
      accountId: checking.id,
      toAccountId: card.id,
      date: '2026-11-02',
    });

    const rows = await ledger.listTransfers();

    expect(rows).toEqual([
      {
        id: entry.id,
        date: '2026-11-02',
        amountMinor: 24000,
        accountId: checking.id,
        accountName: 'Checking',
        accountType: 'checking',
        toAccountId: card.id,
        toAccountName: 'Visa',
        toAccountType: 'credit',
      },
    ]);
  });

  it('keeps rows whose accounts are missing and degrades both sides', async () => {
    const { db, ledger } = await setup();
    await db.entries.bulkAdd([
      {
        id: 'missing-source',
        kind: 'transfer',
        date: '2026-11-02',
        amountMinor: 100,
        accountId: 'gone-source',
        toAccountId: 'gone-destination',
      },
    ]);

    const rows = await ledger.listTransfers();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      accountId: 'gone-source',
      accountName: 'Unknown account',
      accountType: null,
      toAccountId: 'gone-destination',
      toAccountName: 'Unknown account',
      toAccountType: null,
    });
  });

  it('shows renamed accounts on later reads without rewriting the entry', async () => {
    const { db, ledger, checking, card } = await setup();
    const entry = await ledger.addTransfer({
      amountMinor: 100,
      accountId: checking.id,
      toAccountId: card.id,
      date: '2026-11-02',
    });

    await ledger.renameAccount(checking.id, 'Current');
    await ledger.renameAccount(card.id, 'Rewards card');

    const rows = await ledger.listTransfers();

    expect(rows[0]?.accountName).toBe('Current');
    expect(rows[0]?.toAccountName).toBe('Rewards card');
    expect(await db.entries.get(entry.id)).toEqual(entry);
  });

  it('returns an empty list for an empty table', async () => {
    const { ledger } = await setup();

    expect(await ledger.listTransfers()).toEqual([]);
  });

  it('keeps a corrupt transfer with no destination', async () => {
    const { db, ledger, checking } = await setup();
    await db.entries.add({
      id: 'corrupt',
      kind: 'transfer',
      date: '2026-11-02',
      amountMinor: 100,
      accountId: checking.id,
    });

    const rows = await ledger.listTransfers();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'corrupt',
      toAccountId: '',
      toAccountName: 'Unknown account',
      toAccountType: null,
    });
  });

  it('includes transfers from every month in one array', async () => {
    const { ledger, checking, card } = await setup();
    await ledger.addTransfer({
      amountMinor: 100,
      accountId: checking.id,
      toAccountId: card.id,
      date: '2025-01-15',
    });
    await ledger.addTransfer({
      amountMinor: 200,
      accountId: checking.id,
      toAccountId: card.id,
      date: '2027-01-01',
    });

    const rows = await ledger.listTransfers();

    expect(rows.map((row) => row.date)).toEqual([
      '2027-01-01',
      '2025-01-15',
    ]);
  });
});

describe('backup operations', () => {
  function backupData() {
    return {
      accounts: [
        {
          id: 'acct-z',
          name: 'Visa',
          type: 'credit' as const,
          createdAt: '2026-11-02T14:03:00.000Z',
        },
      ],
      categories: [
        { id: 'cat_food', name: 'Food', archived: false },
        { id: 'cat_fun', name: 'Fun', archived: true },
      ],
      entries: [
        {
          id: 'entry-2',
          kind: 'opening' as const,
          date: '2026-11-02',
          amountMinor: -24000,
          accountId: 'acct-z',
        },
        {
          id: 'entry-1',
          kind: 'expense' as const,
          date: '2026-11-03',
          amountMinor: 1842,
          accountId: 'acct-z',
          categoryId: 'cat_food',
        },
      ],
      settings: { currency: 'EUR', currencyExponent: 2 },
    };
  }

  async function snapshot(db: BudgetDatabase) {
    return {
      accounts: await db.accounts.toArray(),
      categories: await db.categories.toArray(),
      entries: await db.entries.toArray(),
      settings: await db.settings.toArray(),
    };
  }

  it('readBackupData returns every row sorted by id and only the currency pair', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    await db.accounts.bulkAdd([
      makeAccount({ id: 'acct-b', name: 'Savings' }),
      makeAccount({ id: 'acct-a', name: 'Checking' }),
    ]);
    await db.entries.bulkAdd([
      {
        id: 'entry-b',
        kind: 'expense',
        date: '2026-11-02',
        amountMinor: 500,
        accountId: 'acct-a',
        categoryId: 'cat_groceries',
      },
      {
        id: 'entry-a',
        kind: 'income',
        date: '2026-11-03',
        amountMinor: 900,
        accountId: 'acct-a',
        categoryId: 'cat_other',
      },
    ]);
    await db.settings.update('app', {
      lastAccountId: 'acct-a',
      lastBackupAt: '2026-11-09T08:00:00.000Z',
    });

    const data = await ledger.readBackupData();

    expect(data.accounts.map((account) => account.id)).toEqual([
      'acct-a',
      'acct-b',
    ]);
    expect(data.categories.map((category) => category.id)).toEqual([
      'cat_bills',
      'cat_eating_out',
      'cat_fun',
      'cat_groceries',
      'cat_health',
      'cat_housing',
      'cat_other',
      'cat_shopping',
      'cat_transport',
    ]);
    expect(data.entries.map((entry) => entry.id)).toEqual([
      'entry-a',
      'entry-b',
    ]);
    expect(data.settings).toEqual({ currency: 'CAD', currencyExponent: 2 });
    expect('lastAccountId' in data.settings).toBe(false);
    expect('lastBackupAt' in data.settings).toBe(false);
  });

  it('readBackupData throws before initialize', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);

    const error = await ledger
      .readBackupData()
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ message: 'Ledger not initialized' });
  });

  it('restoreBackup replaces all four tables, preserves lastBackupAt, and drops lastAccountId', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    const old = await ledger.addAccount({ name: 'Checking', type: 'checking' });
    await ledger.addExpense({
      amountMinor: 700,
      categoryId: 'cat_groceries',
      accountId: old.id,
      date: '2026-11-02',
    });
    await db.settings.update('app', {
      lastAccountId: old.id,
      lastBackupAt: '2026-11-09T08:00:00.000Z',
    });

    await ledger.restoreBackup(backupData());

    expect((await db.accounts.toArray()).map((account) => account.name)).toEqual([
      'Visa',
    ]);
    expect(await db.categories.count()).toBe(2);
    expect(
      (await db.entries.toArray()).map((entry) => [entry.id, entry.amountMinor]),
    ).toEqual([
      ['entry-1', 1842],
      ['entry-2', -24000],
    ]);
    expect(await db.settings.get('app')).toEqual({
      id: 'app',
      currency: 'EUR',
      currencyExponent: 2,
      lastBackupAt: '2026-11-09T08:00:00.000Z',
    });
  });

  it('restoreBackup omits lastBackupAt when the previous ledger had none', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();

    await ledger.restoreBackup(backupData());

    expect(await db.settings.get('app')).toEqual({
      id: 'app',
      currency: 'EUR',
      currencyExponent: 2,
    });
  });

  it('restoreBackup accepts entries whose account or category is missing', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();

    await ledger.restoreBackup({
      accounts: [],
      categories: [],
      entries: [
        {
          id: 'orphan',
          kind: 'expense',
          date: '2026-11-03',
          amountMinor: 300,
          accountId: 'missing-account',
          categoryId: 'missing-category',
        },
      ],
      settings: { currency: 'CAD', currencyExponent: 2 },
    });

    expect(await ledger.readBackupData()).toEqual({
      accounts: [],
      categories: [],
      entries: [
        {
          id: 'orphan',
          kind: 'expense',
          date: '2026-11-03',
          amountMinor: 300,
          accountId: 'missing-account',
          categoryId: 'missing-category',
        },
      ],
      settings: { currency: 'CAD', currencyExponent: 2 },
    });
  });

  it('fails on duplicate entry ids and leaves the previous ledger byte-for-byte intact', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    const checking = await ledger.addAccount({
      name: 'Checking',
      type: 'checking',
    });
    await ledger.addExpense({
      amountMinor: 700,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });
    const before = await snapshot(db);
    const data = backupData();
    data.entries.push({ ...data.entries[0]! });

    const error = await ledger
      .restoreBackup(data)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(await snapshot(db)).toEqual(before);
  });

  it('markBackupSaved writes only lastBackupAt', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    await db.settings.update('app', { lastAccountId: 'acct-1' });

    await ledger.markBackupSaved('2026-11-10T19:42:11.000Z');

    expect(await db.settings.get('app')).toEqual({
      id: 'app',
      currency: 'CAD',
      currencyExponent: 2,
      lastAccountId: 'acct-1',
      lastBackupAt: '2026-11-10T19:42:11.000Z',
    });
  });

  it('markBackupSaved throws before initialize', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);

    const error = await ledger
      .markBackupSaved('2026-11-10T19:42:11.000Z')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(LedgerError);
    expect(error).toMatchObject({ message: 'Ledger not initialized' });
  });

  it('does not re-seed starter categories after a reduced restore', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    await db.settings.update('app', {
      lastBackupAt: '2026-11-09T08:00:00.000Z',
    });

    await ledger.restoreBackup(backupData());
    await ledger.initialize();

    expect(
      (await db.categories.toArray()).map((category) => category.id).sort(),
    ).toEqual(['cat_food', 'cat_fun']);
    expect(await db.settings.get('app')).toEqual({
      id: 'app',
      currency: 'EUR',
      currencyExponent: 2,
      lastBackupAt: '2026-11-09T08:00:00.000Z',
    });
  });
});
