import { afterEach, describe, expect, it } from 'vitest';
import { BudgetDatabase, SCHEMA_VERSION } from './db';
import { createLedger } from './ledger';
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
