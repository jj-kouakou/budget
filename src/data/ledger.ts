import type {
  Account,
  AccountType,
  Category,
  Entry,
  LocalDate,
  MonthKey,
  Settings,
} from '../domain/types';
import { isValidLocalDate, isValidMonthKey } from '../domain/calendar';
import type { BudgetDatabase } from './db';
import { STARTER_CATEGORIES } from './seed';

export interface AddAccountInput {
  name: string;
  type: AccountType;
}

export interface AddExpenseInput {
  amountMinor: number;
  categoryId: string;
  accountId: string;
  date: LocalDate;
}

export interface CategorySpend {
  categoryId: string;
  name: string;
  amountMinor: number;
}

export interface MonthSummary {
  month: MonthKey;
  totalMinor: number;
  rows: CategorySpend[];
}

export type LedgerErrorCode =
  | 'invalid-name'
  | 'invalid-account-type'
  | 'invalid-amount'
  | 'invalid-date'
  | 'unknown-account'
  | 'unknown-category';

export class LedgerError extends Error {
  readonly name = 'LedgerError';

  constructor(
    readonly code: LedgerErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface Ledger {
  initialize(): Promise<void>;
  listAccounts(): Promise<Account[]>;
  addAccount(input: AddAccountInput): Promise<Account>;
  renameAccount(id: string, name: string): Promise<void>;
  listCategories(): Promise<Category[]>;
  addExpense(input: AddExpenseInput): Promise<Entry>;
  monthSummary(month: MonthKey): Promise<MonthSummary>;
  getSettings(): Promise<Settings>;
}

export function createLedger(db: BudgetDatabase): Ledger {
  return {
    async initialize() {
      await db.transaction('rw', db.settings, db.categories, async () => {
        const settings = await db.settings.get('app');
        if (!settings) {
          await db.settings.add({
            id: 'app',
            currency: 'CAD',
            currencyExponent: 2,
          });
        }

        for (const category of STARTER_CATEGORIES) {
          const existing = await db.categories.get(category.id);
          if (!existing) {
            await db.categories.add(category);
          }
        }
      });
    },

    async listAccounts() {
      throw new Error('not implemented');
    },

    async addAccount() {
      throw new Error('not implemented');
    },

    async renameAccount() {
      throw new Error('not implemented');
    },

    async listCategories() {
      throw new Error('not implemented');
    },

    async addExpense() {
      throw new Error('not implemented');
    },

    async monthSummary() {
      throw new Error('not implemented');
    },

    async getSettings() {
      throw new Error('not implemented');
    },
  };
}
