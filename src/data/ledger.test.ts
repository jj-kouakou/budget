import { afterEach, describe, expect, it } from 'vitest';
import type { Account } from '../domain/types';
import { BudgetDatabase, SCHEMA_VERSION } from './db';
import { LedgerError, createLedger } from './ledger';
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
