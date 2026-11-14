import type { Settings } from '../domain/types';
import { byCodeUnitId } from '../domain/backup';
import type { BackupData } from '../domain/backup';
import type { BudgetDatabase } from './db';

export function createBackupApi(db: BudgetDatabase) {
  return {
    async readBackupData(): Promise<BackupData> {
      return db.transaction(
        'r',
        db.accounts,
        db.categories,
        db.entries,
        db.settings,
        async () => {
          const settings = await db.settings.get('app');
          if (!settings) {
            throw new Error('Ledger not initialized');
          }
          const accounts = await db.accounts.toArray();
          const categories = await db.categories.toArray();
          const entries = await db.entries.toArray();
          return {
            accounts: accounts.sort(byCodeUnitId),
            categories: categories.sort(byCodeUnitId),
            entries: entries.sort(byCodeUnitId),
            settings: {
              currency: settings.currency,
              currencyExponent: settings.currencyExponent,
            },
          };
        },
      );
    },

    async restoreBackup(data: BackupData): Promise<void> {
      await db.transaction(
        'rw',
        db.accounts,
        db.categories,
        db.entries,
        db.settings,
        async () => {
          const current = await db.settings.get('app');
          const lastBackupAt = current?.lastBackupAt;

          await db.accounts.clear();
          await db.categories.clear();
          await db.entries.clear();
          await db.settings.clear();

          await db.accounts.bulkAdd(data.accounts);
          await db.categories.bulkAdd(data.categories);
          await db.entries.bulkAdd(data.entries);

          const settings: Settings = {
            id: 'app',
            currency: data.settings.currency,
            currencyExponent: data.settings.currencyExponent,
          };
          if (lastBackupAt !== undefined) {
            settings.lastBackupAt = lastBackupAt;
          }
          await db.settings.add(settings);
        },
      );
    },

    async markBackupSaved(at: string): Promise<void> {
      await db.transaction('rw', db.settings, async () => {
        const updated = await db.settings.update('app', {
          lastBackupAt: at,
        });
        if (updated === 0) {
          throw new Error('Ledger not initialized');
        }
      });
    },
  };
}
