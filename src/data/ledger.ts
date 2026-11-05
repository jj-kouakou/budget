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

export interface ExpenseInput {
  amountMinor: number;
  categoryId: string;
  accountId: string;
  date: LocalDate;
}

export interface EntryListItem {
  id: string;
  date: LocalDate;
  amountMinor: number;
  accountId: string;
  accountName: string;
  accountType: AccountType | null;
}

export interface CategoryEntries {
  month: MonthKey;
  categoryId: string;
  categoryName: string;
  totalMinor: number;
  rows: EntryListItem[];
}

export const UNCATEGORIZED_CATEGORY_ID = '__uncategorized__';
export const UNCATEGORIZED_LABEL = 'Uncategorized';

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
  | 'unknown-category'
  | 'unknown-entry'
  | 'unsupported-entry-kind';

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
  addExpense(input: ExpenseInput): Promise<Entry>;
  getEntry(id: string): Promise<Entry | null>;
  categoryEntries(
    month: MonthKey,
    categoryId: string,
  ): Promise<CategoryEntries>;
  monthSummary(month: MonthKey): Promise<MonthSummary>;
  getSettings(): Promise<Settings>;
}

const MAX_ACCOUNT_NAME_LENGTH = 60;

function requireAccountName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_ACCOUNT_NAME_LENGTH) {
    throw new LedgerError(
      'invalid-name',
      'Enter an account name of 60 characters or fewer.',
    );
  }
  return trimmed;
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
      const accounts = await db.accounts.toArray();
      return accounts.sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) ||
          left.id.localeCompare(right.id),
      );
    },

    async addAccount(input) {
      const name = requireAccountName(input.name);
      if (
        input.type !== 'checking' &&
        input.type !== 'savings' &&
        input.type !== 'credit'
      ) {
        throw new LedgerError(
          'invalid-account-type',
          'Choose a valid account type.',
        );
      }

      const account: Account = {
        id: crypto.randomUUID(),
        name,
        type: input.type,
        createdAt: new Date().toISOString(),
      };

      await db.transaction('rw', db.accounts, async () => {
        await db.accounts.add(account);
      });

      return account;
    },

    async renameAccount(id, name) {
      const trimmed = requireAccountName(name);
      await db.transaction('rw', db.accounts, async () => {
        const updated = await db.accounts.update(id, { name: trimmed });
        if (updated === 0) {
          throw new LedgerError('unknown-account', 'That account no longer exists.');
        }
      });
    },

    async listCategories() {
      const categories = await db.categories.toArray();
      return categories.sort(
        (left, right) =>
          left.name.localeCompare(right.name) ||
          left.id.localeCompare(right.id),
      );
    },

    async addExpense(input) {
      return db.transaction(
        'rw',
        db.accounts,
        db.categories,
        db.entries,
        db.settings,
        async () => {
          if (
            !Number.isSafeInteger(input.amountMinor) ||
            input.amountMinor <= 0
          ) {
            throw new LedgerError(
              'invalid-amount',
              'Enter an amount greater than zero.',
            );
          }
          if (!isValidLocalDate(input.date)) {
            throw new LedgerError('invalid-date', 'Choose a valid date.');
          }

          const account = await db.accounts.get(input.accountId);
          if (!account) {
            throw new LedgerError(
              'unknown-account',
              'That account no longer exists. Choose another.',
            );
          }

          const category = await db.categories.get(input.categoryId);
          if (!category) {
            throw new LedgerError(
              'unknown-category',
              'That category no longer exists. Choose another.',
            );
          }

          const entry: Entry = {
            id: crypto.randomUUID(),
            kind: 'expense',
            date: input.date,
            amountMinor: input.amountMinor,
            accountId: input.accountId,
            categoryId: input.categoryId,
          };
          await db.entries.add(entry);

          const settings = await db.settings.get('app');
          if (!settings) {
            throw new Error('Ledger not initialized');
          }
          await db.settings.put({
            ...settings,
            lastAccountId: input.accountId,
          });

          return entry;
        },
      );
    },

    async monthSummary(month) {
      if (!isValidMonthKey(month)) {
        throw new RangeError('Invalid month key');
      }

      const entries = await db.entries
        .where('date')
        .startsWith(month)
        .toArray();

      const totals = new Map<string, number>();
      for (const entry of entries) {
        if (entry.kind !== 'expense') {
          continue;
        }
        const categoryId = entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID;
        totals.set(categoryId, (totals.get(categoryId) ?? 0) + entry.amountMinor);
      }

      const categoryIds = [...totals.keys()].filter(
        (id) => id !== UNCATEGORIZED_CATEGORY_ID,
      );
      const categories = await db.categories.bulkGet(categoryIds);
      const names = new Map<string, string>();
      categories.forEach((category, index) => {
        const categoryId = categoryIds[index];
        if (category && categoryId !== undefined) {
          names.set(categoryId, category.name);
        }
      });

      const rows = [...totals].map(([categoryId, amountMinor]) => ({
        categoryId,
        name:
          categoryId === UNCATEGORIZED_CATEGORY_ID
            ? UNCATEGORIZED_LABEL
            : (names.get(categoryId) ?? UNCATEGORIZED_LABEL),
        amountMinor,
      }));

      rows.sort(
        (left, right) =>
          right.amountMinor - left.amountMinor ||
          left.name.localeCompare(right.name) ||
          left.categoryId.localeCompare(right.categoryId),
      );

      return {
        month,
        totalMinor: rows.reduce((sum, row) => sum + row.amountMinor, 0),
        rows,
      };
    },

    async getEntry(id) {
      const entry = await db.entries.get(id);
      return entry ?? null;
    },

    async categoryEntries(month, categoryId) {
      if (!isValidMonthKey(month)) {
        throw new RangeError('Invalid month key');
      }

      const monthEntries = await db.entries
        .where('date')
        .startsWith(month)
        .toArray();

      const kept = monthEntries
        .filter((entry) => entry.kind === 'expense')
        .filter(
          (entry) =>
            (entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID) === categoryId,
        )
        .sort(
          (left, right) =>
            right.date.localeCompare(left.date) ||
            right.id.localeCompare(left.id),
        );

      const accountIds = [...new Set(kept.map((entry) => entry.accountId))];
      const accounts = await db.accounts.bulkGet(accountIds);
      const accountById = new Map<string, Account>();
      accounts.forEach((account, index) => {
        const accountId = accountIds[index];
        if (account && accountId !== undefined) {
          accountById.set(accountId, account);
        }
      });

      let categoryName: string;
      if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
        categoryName = UNCATEGORIZED_LABEL;
      } else {
        const category = await db.categories.get(categoryId);
        categoryName = category?.name ?? UNCATEGORIZED_LABEL;
      }

      const rows: EntryListItem[] = kept.map((entry) => {
        const account = accountById.get(entry.accountId);
        return {
          id: entry.id,
          date: entry.date,
          amountMinor: entry.amountMinor,
          accountId: entry.accountId,
          accountName: account?.name ?? 'Unknown account',
          accountType: account?.type ?? null,
        };
      });

      return {
        month,
        categoryId,
        categoryName,
        totalMinor: rows.reduce((sum, row) => sum + row.amountMinor, 0),
        rows,
      };
    },

    async getSettings() {
      const settings = await db.settings.get('app');
      if (!settings) {
        throw new Error('Ledger not initialized');
      }
      return settings;
    },
  };
}
