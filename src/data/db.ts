import Dexie, { type Table } from 'dexie';
import type { Account, Category, Entry, Settings } from '../domain/types';

export const SCHEMA_VERSION = 1;

export class BudgetDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  entries!: Table<Entry, string>;
  settings!: Table<Settings, string>;

  constructor(name = 'budget') {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      accounts: 'id, createdAt',
      categories: 'id',
      entries: 'id, date',
      settings: 'id',
    });
  }
}
