import type {
  Account,
  Category,
  Entry,
  EntryKind,
} from '../domain/types';
import type { BudgetDatabase } from './db';
import { createEntry, requireEntryFields } from './ledgerEntryWrite';
import { LedgerError, UNCATEGORIZED_LABEL } from './ledgerShared';
import type {
  CategorizedEntryInput,
  IncomeListItem,
  TransferInput,
  TransferListItem,
} from './ledgerShared';

export function createEntriesApi(db: BudgetDatabase) {
  async function entriesOfKindNewestFirst(
    kind: EntryKind,
  ): Promise<Entry[]> {
    const entries = await db.entries.orderBy('date').reverse().toArray();
    return entries
      .filter((entry) => entry.kind === kind)
      .sort(
        (left, right) =>
          right.date.localeCompare(left.date) ||
          right.id.localeCompare(left.id),
      );
  }

  return {
    async addExpense(input: CategorizedEntryInput): Promise<Entry> {
      return db.transaction(
        'rw',
        db.accounts,
        db.categories,
        db.entries,
        db.settings,
        async () => {
          const entry = await createEntry(db, {
            kind: 'expense',
            ...input,
          });

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

    async updateExpense(
      id: string,
      input: CategorizedEntryInput,
    ): Promise<Entry> {
      return db.transaction(
        'rw',
        db.accounts,
        db.categories,
        db.entries,
        async () => {
          const existing = await db.entries.get(id);
          if (!existing) {
            throw new LedgerError(
              'unknown-entry',
              'That entry no longer exists.',
            );
          }
          if (existing.kind !== 'expense') {
            throw new LedgerError(
              'unsupported-entry-kind',
              'Only expenses can be corrected or removed.',
            );
          }

          await requireEntryFields(
            db,
            { kind: 'expense', ...input },
            { allowArchivedCategoryId: existing.categoryId },
          );

          const updated = await db.entries.update(id, {
            date: input.date,
            amountMinor: input.amountMinor,
            accountId: input.accountId,
            categoryId: input.categoryId,
          });
          if (updated === 0) {
            throw new LedgerError(
              'unknown-entry',
              'That entry no longer exists.',
            );
          }

          return {
            ...existing,
            date: input.date,
            amountMinor: input.amountMinor,
            accountId: input.accountId,
            categoryId: input.categoryId,
          };
        },
      );
    },

    async deleteExpense(id: string): Promise<Entry> {
      return db.transaction('rw', db.entries, async () => {
        const existing = await db.entries.get(id);
        if (!existing) {
          throw new LedgerError(
            'unknown-entry',
            'That entry no longer exists.',
          );
        }
        if (existing.kind !== 'expense') {
          throw new LedgerError(
            'unsupported-entry-kind',
            'Only expenses can be corrected or removed.',
          );
        }

        await db.entries.delete(id);
        return existing;
      });
    },

    async listTransfers(): Promise<TransferListItem[]> {
      return db.transaction('r', db.entries, db.accounts, async () => {
        const transfers = await entriesOfKindNewestFirst('transfer');

        const accountIds = [
          ...new Set(
            transfers.flatMap((entry) => {
              const destinationId = entry.toAccountId;
              return destinationId === undefined
                ? [entry.accountId]
                : [entry.accountId, destinationId];
            }),
          ),
        ].filter((id) => id !== '');

        const accounts = await db.accounts.bulkGet(accountIds);
        const accountById = new Map<string, Account>();
        accounts.forEach((account, index) => {
          const accountId = accountIds[index];
          if (account && accountId !== undefined) {
            accountById.set(accountId, account);
          }
        });

        return transfers.map((entry) => {
          const source = accountById.get(entry.accountId);
          const destinationId = entry.toAccountId;
          const destination =
            destinationId === undefined
              ? undefined
              : accountById.get(destinationId);

          return {
            id: entry.id,
            date: entry.date,
            amountMinor: entry.amountMinor,
            accountId: entry.accountId,
            accountName: source?.name ?? 'Unknown account',
            accountType: source?.type ?? null,
            toAccountId: destinationId ?? '',
            toAccountName: destination?.name ?? 'Unknown account',
            toAccountType: destination?.type ?? null,
          };
        });
      });
    },

    async addTransfer(input: TransferInput): Promise<Entry> {
      return db.transaction(
        'rw',
        db.accounts,
        db.entries,
        async () => {
          return createEntry(db, { kind: 'transfer', ...input });
        },
      );
    },

    async updateTransfer(
      id: string,
      input: TransferInput,
    ): Promise<Entry> {
      return db.transaction(
        'rw',
        db.accounts,
        db.entries,
        async () => {
          const existing = await db.entries.get(id);
          if (!existing) {
            throw new LedgerError(
              'unknown-entry',
              'That entry no longer exists.',
            );
          }
          if (existing.kind !== 'transfer') {
            throw new LedgerError(
              'unsupported-entry-kind',
              'Only transfers can be corrected or removed.',
            );
          }

          await requireEntryFields(db, { kind: 'transfer', ...input });

          const updated = await db.entries.update(id, {
            date: input.date,
            amountMinor: input.amountMinor,
            accountId: input.accountId,
            toAccountId: input.toAccountId,
          });
          if (updated === 0) {
            throw new LedgerError(
              'unknown-entry',
              'That entry no longer exists.',
            );
          }

          return {
            ...existing,
            date: input.date,
            amountMinor: input.amountMinor,
            accountId: input.accountId,
            toAccountId: input.toAccountId,
          };
        },
      );
    },

    async deleteTransfer(id: string): Promise<Entry> {
      return db.transaction('rw', db.entries, async () => {
        const existing = await db.entries.get(id);
        if (!existing) {
          throw new LedgerError(
            'unknown-entry',
            'That entry no longer exists.',
          );
        }
        if (existing.kind !== 'transfer') {
          throw new LedgerError(
            'unsupported-entry-kind',
            'Only transfers can be corrected or removed.',
          );
        }

        await db.entries.delete(id);
        return existing;
      });
    },

    async listIncome(): Promise<IncomeListItem[]> {
      return db.transaction(
        'r',
        db.entries,
        db.accounts,
        db.categories,
        async () => {
          const incomes = await entriesOfKindNewestFirst('income');

          const accountIds = [
            ...new Set(incomes.map((entry) => entry.accountId)),
          ];
          const categoryIds = [
            ...new Set(
              incomes.flatMap((entry) =>
                entry.categoryId === undefined ? [] : [entry.categoryId],
              ),
            ),
          ];

          const accounts = await db.accounts.bulkGet(accountIds);
          const categories = await db.categories.bulkGet(categoryIds);

          const accountById = new Map<string, Account>();
          accounts.forEach((account, index) => {
            const accountId = accountIds[index];
            if (account && accountId !== undefined) {
              accountById.set(accountId, account);
            }
          });

          const categoryById = new Map<string, Category>();
          categories.forEach((category, index) => {
            const categoryId = categoryIds[index];
            if (category && categoryId !== undefined) {
              categoryById.set(categoryId, category);
            }
          });

          return incomes.map((entry) => {
            const account = accountById.get(entry.accountId);
            const category =
              entry.categoryId === undefined
                ? undefined
                : categoryById.get(entry.categoryId);

            return {
              id: entry.id,
              date: entry.date,
              amountMinor: entry.amountMinor,
              categoryName: category?.name ?? UNCATEGORIZED_LABEL,
              accountId: entry.accountId,
              accountName: account?.name ?? 'Unknown account',
              accountType: account?.type ?? null,
            };
          });
        },
      );
    },

    async addIncome(input: CategorizedEntryInput): Promise<Entry> {
      return db.transaction(
        'rw',
        db.accounts,
        db.categories,
        db.entries,
        async () => {
          return createEntry(db, { kind: 'income', ...input });
        },
      );
    },

    async updateIncome(
      id: string,
      input: CategorizedEntryInput,
    ): Promise<Entry> {
      return db.transaction(
        'rw',
        db.accounts,
        db.categories,
        db.entries,
        async () => {
          const existing = await db.entries.get(id);
          if (!existing) {
            throw new LedgerError(
              'unknown-entry',
              'That entry no longer exists.',
            );
          }
          if (existing.kind !== 'income') {
            throw new LedgerError(
              'unsupported-entry-kind',
              'Only income can be corrected or removed.',
            );
          }

          await requireEntryFields(
            db,
            { kind: 'income', ...input },
            { allowArchivedCategoryId: existing.categoryId },
          );

          const updated = await db.entries.update(id, {
            date: input.date,
            amountMinor: input.amountMinor,
            accountId: input.accountId,
            categoryId: input.categoryId,
          });
          if (updated === 0) {
            throw new LedgerError(
              'unknown-entry',
              'That entry no longer exists.',
            );
          }

          return {
            ...existing,
            date: input.date,
            amountMinor: input.amountMinor,
            accountId: input.accountId,
            categoryId: input.categoryId,
          };
        },
      );
    },

    async deleteIncome(id: string): Promise<Entry> {
      return db.transaction('rw', db.entries, async () => {
        const existing = await db.entries.get(id);
        if (!existing) {
          throw new LedgerError(
            'unknown-entry',
            'That entry no longer exists.',
          );
        }
        if (existing.kind !== 'income') {
          throw new LedgerError(
            'unsupported-entry-kind',
            'Only income can be corrected or removed.',
          );
        }

        await db.entries.delete(id);
        return existing;
      });
    },

    async getEntry(id: string): Promise<Entry | null> {
      const entry = await db.entries.get(id);
      return entry ?? null;
    },
  };
}
