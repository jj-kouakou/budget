import { afterEach, describe, expect, it } from 'vitest';
import type { Account, Entry } from '../domain/types';
import { BudgetDatabase, SCHEMA_VERSION } from './db';
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

  it('accepts an archived category', async () => {
    const { db, ledger, account } = await setup();
    await db.categories.update('cat_groceries', { archived: true });

    const entry = await ledger.addExpense({
      amountMinor: 100,
      categoryId: 'cat_groceries',
      accountId: account.id,
      date: '2026-11-02',
    });

    expect(entry.categoryId).toBe('cat_groceries');
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
      rows: [
        { categoryId: 'cat_groceries', name: 'Groceries', amountMinor: 2000 },
        { categoryId: 'cat_transport', name: 'Transport', amountMinor: 500 },
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
      rows: [
        {
          categoryId: 'cat_missing',
          name: 'Uncategorized',
          amountMinor: 750,
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
      { categoryId: 'cat_other', name: 'Other', amountMinor: 400 },
    ]);
  });

  it('throws RangeError for a malformed month', async () => {
    const { ledger } = await setup();

    await expect(ledger.monthSummary('2026-13')).rejects.toThrow(RangeError);
  });
});

describe('categories and settings reads', () => {
  it('lists categories by name then id, including archived rows', async () => {
    const db = openDatabase();
    const ledger = createLedger(db);
    await ledger.initialize();
    await db.categories.add({ id: 'cat_aaa', name: 'Bills', archived: true });

    expect((await ledger.listCategories()).map((category) => category.id)).toEqual([
      'cat_aaa',
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
    await db.categories.update('cat_groceries', { archived: true });
    await ledger.addExpense({
      amountMinor: 100,
      categoryId: 'cat_groceries',
      accountId: checking.id,
      date: '2026-11-02',
    });

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
      rows: [
        { categoryId: 'cat_transport', name: 'Transport', amountMinor: 500 },
      ],
    });
    expect(await ledger.monthSummary('2026-12')).toEqual({
      month: '2026-12',
      totalMinor: 700,
      rows: [
        { categoryId: 'cat_transport', name: 'Transport', amountMinor: 700 },
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
      rows: [
        { categoryId: 'cat_groceries', name: 'Groceries', amountMinor: 500 },
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
