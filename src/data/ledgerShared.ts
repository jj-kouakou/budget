import type {
  Account,
  AccountType,
  Category,
  Entry,
  LocalDate,
  MonthKey,
  Settings,
} from '../domain/types';
import { isValidLocalDate, todayLocalDate } from '../domain/calendar';
import type { BackupData } from '../domain/backup';

export interface AddAccountInput {
  name: string;
  type: AccountType;
  openingBalanceMinor?: number;
}

export interface AccountBalanceListItem {
  id: string;
  name: string;
  type: AccountType;
  balanceMinor: number;
  openingBalanceMinor: number;
  hasOpeningBalance: boolean;
}

export interface CategorizedEntryInput {
  amountMinor: number;
  categoryId: string;
  accountId: string;
  date: LocalDate;
}

export interface TransferInput {
  amountMinor: number;
  accountId: string;
  toAccountId: string;
  date: LocalDate;
}

export interface TransferListItem {
  id: string;
  date: LocalDate;
  amountMinor: number;
  accountId: string;
  accountName: string;
  accountType: AccountType | null;
  toAccountId: string;
  toAccountName: string;
  toAccountType: AccountType | null;
}

export interface IncomeListItem {
  id: string;
  date: LocalDate;
  amountMinor: number;
  categoryName: string;
  accountId: string;
  accountName: string;
  accountType: AccountType | null;
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
  previousAmountMinor: number;
}

export interface MonthSummary {
  month: MonthKey;
  totalMinor: number;
  previousMonth: MonthKey | null;
  previousMonthHasSpending: boolean;
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
  | 'unsupported-entry-kind'
  | 'duplicate-category-name'
  | 'archived-category'
  | 'unknown-to-account'
  | 'same-transfer-account'
  | 'invalid-opening-amount';

export class LedgerError extends Error {
  readonly name = 'LedgerError';

  constructor(
    readonly code: LedgerErrorCode,
    message: string,
    readonly existingCategoryName?: string,
  ) {
    super(message);
  }
}

export interface Ledger {
  initialize(): Promise<void>;
  listAccounts(): Promise<Account[]>;
  listAccountBalances(): Promise<AccountBalanceListItem[]>;
  addAccount(input: AddAccountInput): Promise<Account>;
  setOpeningBalance(
    accountId: string,
    amountMinor: number | null,
  ): Promise<void>;
  renameAccount(id: string, name: string): Promise<void>;
  listCategories(): Promise<Category[]>;
  addCategory(name: string): Promise<Category>;
  renameCategory(id: string, name: string): Promise<void>;
  setCategoryArchived(id: string, archived: boolean): Promise<void>;
  addExpense(input: CategorizedEntryInput): Promise<Entry>;
  updateExpense(id: string, input: CategorizedEntryInput): Promise<Entry>;
  deleteExpense(id: string): Promise<Entry>;
  listTransfers(): Promise<TransferListItem[]>;
  addTransfer(input: TransferInput): Promise<Entry>;
  updateTransfer(id: string, input: TransferInput): Promise<Entry>;
  deleteTransfer(id: string): Promise<Entry>;
  listIncome(): Promise<IncomeListItem[]>;
  addIncome(input: CategorizedEntryInput): Promise<Entry>;
  updateIncome(id: string, input: CategorizedEntryInput): Promise<Entry>;
  deleteIncome(id: string): Promise<Entry>;
  getEntry(id: string): Promise<Entry | null>;
  categoryEntries(
    month: MonthKey,
    categoryId: string,
  ): Promise<CategoryEntries>;
  monthSummary(month: MonthKey): Promise<MonthSummary>;
  getSettings(): Promise<Settings>;
  readBackupData(): Promise<BackupData>;
  restoreBackup(data: BackupData): Promise<void>;
  markBackupSaved(at: string): Promise<void>;
}

export const MAX_ACCOUNT_NAME_LENGTH = 60;
export const MAX_CATEGORY_NAME_LENGTH = 60;

export function requireAccountName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_ACCOUNT_NAME_LENGTH) {
    throw new LedgerError(
      'invalid-name',
      'Enter an account name of 60 characters or fewer.',
    );
  }
  return trimmed;
}

export function requireCategoryName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    throw new LedgerError(
      'invalid-name',
      'Enter a category name of 60 characters or fewer.',
    );
  }
  return trimmed;
}

export function categoryNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function compareAccountsByCreation(
  left: Account,
  right: Account,
): number {
  return (
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

export function expenseTotals(entries: Entry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind !== 'expense') {
      continue;
    }
    const categoryId = entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID;
    totals.set(categoryId, (totals.get(categoryId) ?? 0) + entry.amountMinor);
  }
  return totals;
}

export function compareSummaryRows(
  left: CategorySpend,
  right: CategorySpend,
): number {
  const leftHasCurrent = left.amountMinor > 0;
  const rightHasCurrent = right.amountMinor > 0;
  if (leftHasCurrent !== rightHasCurrent) {
    return leftHasCurrent ? -1 : 1;
  }
  if (leftHasCurrent) {
    return (
      right.amountMinor - left.amountMinor ||
      left.name.localeCompare(right.name) ||
      left.categoryId.localeCompare(right.categoryId)
    );
  }
  return (
    right.previousAmountMinor - left.previousAmountMinor ||
    left.name.localeCompare(right.name) ||
    left.categoryId.localeCompare(right.categoryId)
  );
}

export function openingDateFor(account: Account): LocalDate {
  const created = new Date(account.createdAt);
  if (Number.isNaN(created.getTime())) {
    return todayLocalDate();
  }
  const date = todayLocalDate(created);
  return isValidLocalDate(date) ? date : todayLocalDate();
}
