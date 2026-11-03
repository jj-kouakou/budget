import type { Category } from '../domain/types';

export const STARTER_CATEGORIES: readonly Category[] = [
  { id: 'cat_groceries', name: 'Groceries', archived: false },
  { id: 'cat_eating_out', name: 'Eating out', archived: false },
  { id: 'cat_transport', name: 'Transport', archived: false },
  { id: 'cat_housing', name: 'Housing', archived: false },
  { id: 'cat_bills', name: 'Bills', archived: false },
  { id: 'cat_shopping', name: 'Shopping', archived: false },
  { id: 'cat_health', name: 'Health', archived: false },
  { id: 'cat_fun', name: 'Fun', archived: false },
  { id: 'cat_other', name: 'Other', archived: false },
];
