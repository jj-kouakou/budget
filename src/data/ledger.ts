import type { Settings } from '../domain/types';
import type { BudgetDatabase } from './db';
import { createAccountsApi } from './ledgerAccounts';
import { createBackupApi } from './ledgerBackup';
import { createCategoriesApi } from './ledgerCategories';
import { createEntriesApi } from './ledgerEntries';
import { createReportsApi } from './ledgerReports';
import { STARTER_CATEGORIES } from './seed';
import type { Ledger } from './ledgerShared';

export type {
  AccountBalanceListItem,
  AddAccountInput,
  CategorizedEntryInput,
  CategoryEntries,
  CategorySpend,
  EntryListItem,
  IncomeListItem,
  Ledger,
  LedgerErrorCode,
  MonthSummary,
  TransferInput,
  TransferListItem,
} from './ledgerShared';
export {
  LedgerError,
  UNCATEGORIZED_CATEGORY_ID,
  UNCATEGORIZED_LABEL,
} from './ledgerShared';

export function createLedger(db: BudgetDatabase): Ledger {
  return {
    ...createBackupApi(db),
    ...createAccountsApi(db),
    ...createCategoriesApi(db),
    ...createEntriesApi(db),
    ...createReportsApi(db),

    async initialize() {
      await db.transaction('rw', db.settings, db.categories, async () => {
        const settings = await db.settings.get('app');
        if (!settings) {
          await db.settings.add({
            id: 'app',
            currency: 'CAD',
            currencyExponent: 2,
          });

          for (const category of STARTER_CATEGORIES) {
            if (!(await db.categories.get(category.id))) {
              await db.categories.add(category);
            }
          }
        }
      });
    },

    async getSettings(): Promise<Settings> {
      const settings = await db.settings.get('app');
      if (!settings) {
        throw new Error('Ledger not initialized');
      }
      return settings;
    },
  };
}
