import type { Account, MonthKey } from '../domain/types';
import {
  MIN_MONTH,
  addMonths,
  isValidMonthKey,
} from '../domain/calendar';
import type { BudgetDatabase } from './db';
import {
  UNCATEGORIZED_CATEGORY_ID,
  UNCATEGORIZED_LABEL,
  compareSummaryRows,
  expenseTotals,
} from './ledgerShared';
import type {
  CategoryEntries,
  CategorySpend,
  EntryListItem,
  MonthSummary,
} from './ledgerShared';

export function createReportsApi(db: BudgetDatabase) {
  return {
    async monthSummary(month: MonthKey): Promise<MonthSummary> {
      if (!isValidMonthKey(month)) {
        throw new RangeError('Invalid month key');
      }

      return db.transaction('r', db.entries, db.categories, async () => {
        const previousMonth =
          month === MIN_MONTH ? null : addMonths(month, -1);

        const currentEntries = await db.entries
          .where('date')
          .startsWith(month)
          .toArray();
        const previousEntries =
          previousMonth === null
            ? []
            : await db.entries
                .where('date')
                .startsWith(previousMonth)
                .toArray();

        const currentTotals = expenseTotals(currentEntries);
        const previousTotals = expenseTotals(previousEntries);

        const categoryIds = [
          ...new Set([...currentTotals.keys(), ...previousTotals.keys()]),
        ];
        const namedIds = categoryIds.filter(
          (id) => id !== UNCATEGORIZED_CATEGORY_ID,
        );
        const categories = await db.categories.bulkGet(namedIds);
        const names = new Map<string, string>();
        categories.forEach((category, index) => {
          const categoryId = namedIds[index];
          if (category && categoryId !== undefined) {
            names.set(categoryId, category.name);
          }
        });

        const rows: CategorySpend[] = categoryIds.map((categoryId) => ({
          categoryId,
          name:
            categoryId === UNCATEGORIZED_CATEGORY_ID
              ? UNCATEGORIZED_LABEL
              : (names.get(categoryId) ?? UNCATEGORIZED_LABEL),
          amountMinor: currentTotals.get(categoryId) ?? 0,
          previousAmountMinor: previousTotals.get(categoryId) ?? 0,
        }));
        rows.sort(compareSummaryRows);

        return {
          month,
          totalMinor: rows.reduce((sum, row) => sum + row.amountMinor, 0),
          previousMonth,
          previousMonthHasSpending: previousTotals.size > 0,
          rows,
        };
      });
    },

    async categoryEntries(
      month: MonthKey,
      categoryId: string,
    ): Promise<CategoryEntries> {
      if (!isValidMonthKey(month)) {
        throw new RangeError('Invalid month key');
      }

      return db.transaction(
        'r',
        db.entries,
        db.accounts,
        db.categories,
        async () => {
          const monthEntries = await db.entries
            .where('date')
            .startsWith(month)
            .toArray();

          const kept = monthEntries
            .filter((entry) => entry.kind === 'expense')
            .filter(
              (entry) =>
                (entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID) ===
                categoryId,
            )
            .sort(
              (left, right) =>
                right.date.localeCompare(left.date) ||
                right.id.localeCompare(left.id),
            );

          const accountIds = [
            ...new Set(kept.map((entry) => entry.accountId)),
          ];
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
            totalMinor: rows.reduce(
              (sum, row) => sum + row.amountMinor,
              0,
            ),
            rows,
          };
        },
      );
    },
  };
}
