import type { Category } from '../domain/types';
import type { BudgetDatabase } from './db';
import {
  LedgerError,
  categoryNameKey,
  requireCategoryName,
} from './ledgerShared';

export function createCategoriesApi(db: BudgetDatabase) {
  async function requireUniqueCategoryName(
    name: string,
    exceptId?: string,
  ): Promise<void> {
    const categories = await db.categories.toArray();
    const key = categoryNameKey(name);
    const existing = categories.find(
      (category) =>
        category.id !== exceptId && categoryNameKey(category.name) === key,
    );
    if (existing) {
      throw new LedgerError(
        'duplicate-category-name',
        `A category named “${existing.name}” already exists.`,
        existing.name,
      );
    }
  }

  return {
    async listCategories(): Promise<Category[]> {
      const categories = await db.categories.toArray();
      return categories.sort(
        (left, right) =>
          Number(left.archived) - Number(right.archived) ||
          left.name.localeCompare(right.name) ||
          left.id.localeCompare(right.id),
      );
    },

    async addCategory(name: string): Promise<Category> {
      return db.transaction('rw', db.categories, async () => {
        const trimmed = requireCategoryName(name);
        await requireUniqueCategoryName(trimmed);
        const category: Category = {
          id: crypto.randomUUID(),
          name: trimmed,
          archived: false,
        };
        await db.categories.add(category);
        return category;
      });
    },

    async renameCategory(id: string, name: string): Promise<void> {
      await db.transaction('rw', db.categories, async () => {
        const row = await db.categories.get(id);
        if (!row) {
          throw new LedgerError(
            'unknown-category',
            'That category no longer exists.',
          );
        }
        const trimmed = requireCategoryName(name);
        await requireUniqueCategoryName(trimmed, id);
        await db.categories.update(id, { name: trimmed });
      });
    },

    async setCategoryArchived(
      id: string,
      archived: boolean,
    ): Promise<void> {
      await db.transaction('rw', db.categories, async () => {
        const row = await db.categories.get(id);
        if (!row) {
          throw new LedgerError(
            'unknown-category',
            'That category no longer exists.',
          );
        }
        if (row.archived === archived) {
          return;
        }
        await db.categories.update(id, { archived });
      });
    },
  };
}
