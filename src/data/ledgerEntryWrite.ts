import type { Entry, LocalDate } from '../domain/types';
import { isValidLocalDate } from '../domain/calendar';
import type { BudgetDatabase } from './db';
import { LedgerError } from './ledgerShared';

export interface CategorizedEntryDraft {
  kind: 'expense' | 'income';
  amountMinor: number;
  accountId: string;
  categoryId: string;
  date: LocalDate;
}

export interface TransferDraft {
  kind: 'transfer';
  amountMinor: number;
  accountId: string;
  toAccountId: string;
  date: LocalDate;
}

export interface OpeningDraft {
  kind: 'opening';
  amountMinor: number;
  accountId: string;
  date: LocalDate;
}

export type EntryDraft =
  | CategorizedEntryDraft
  | TransferDraft
  | OpeningDraft;

export interface EntryWriteOptions {
  allowArchivedCategoryId?: string;
}

export function requireOpeningAmount(amountMinor: number): void {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new LedgerError(
      'invalid-opening-amount',
      'Enter a valid starting amount.',
    );
  }
}

export async function requireEntryFields(
  db: BudgetDatabase,
  draft: EntryDraft,
  options?: EntryWriteOptions,
): Promise<void> {
  if (draft.kind === 'opening') {
    requireOpeningAmount(draft.amountMinor);
    return;
  }

  if (!Number.isSafeInteger(draft.amountMinor) || draft.amountMinor <= 0) {
    throw new LedgerError(
      'invalid-amount',
      'Enter an amount greater than zero.',
    );
  }
  if (!isValidLocalDate(draft.date)) {
    throw new LedgerError('invalid-date', 'Choose a valid date.');
  }

  if (draft.kind === 'transfer') {
    if (draft.accountId === draft.toAccountId) {
      throw new LedgerError(
        'same-transfer-account',
        'Choose two different accounts.',
      );
    }

    const source = await db.accounts.get(draft.accountId);
    if (!source) {
      throw new LedgerError(
        'unknown-account',
        'That account no longer exists. Choose another.',
      );
    }

    const destination = await db.accounts.get(draft.toAccountId);
    if (!destination) {
      throw new LedgerError(
        'unknown-to-account',
        'That account no longer exists. Choose another.',
      );
    }
    return;
  }

  const account = await db.accounts.get(draft.accountId);
  if (!account) {
    throw new LedgerError(
      'unknown-account',
      'That account no longer exists. Choose another.',
    );
  }

  const category = await db.categories.get(draft.categoryId);
  if (!category) {
    throw new LedgerError(
      'unknown-category',
      'That category no longer exists. Choose another.',
    );
  }
  if (category.archived && category.id !== options?.allowArchivedCategoryId) {
    throw new LedgerError(
      'archived-category',
      'That category is archived. Choose another.',
    );
  }
}

export async function createEntry(
  db: BudgetDatabase,
  draft: EntryDraft,
  options?: EntryWriteOptions,
): Promise<Entry> {
  await requireEntryFields(db, draft, options);

  const entry: Entry = {
    id: crypto.randomUUID(),
    kind: draft.kind,
    date: draft.date,
    amountMinor: draft.amountMinor,
    accountId: draft.accountId,
  };
  if (draft.kind === 'expense' || draft.kind === 'income') {
    entry.categoryId = draft.categoryId;
  }
  if (draft.kind === 'transfer') {
    entry.toAccountId = draft.toAccountId;
  }

  await db.entries.add(entry);
  return entry;
}
