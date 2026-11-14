import type { LedgerErrorCode } from '../data/ledger';

export interface EntryFieldErrors {
  amount?: string;
  category?: string;
  account?: string;
  toAccount?: string;
  date?: string;
  form?: string;
}

export function entryFieldErrors(
  code: LedgerErrorCode,
): EntryFieldErrors | null {
  switch (code) {
    case 'invalid-amount':
      return { amount: 'Enter an amount greater than zero.' };
    case 'invalid-date':
      return { date: 'Choose a valid date.' };
    case 'unknown-account':
      return { account: 'That account no longer exists. Choose another.' };
    case 'unknown-category':
      return { category: 'That category no longer exists. Choose another.' };
    case 'archived-category':
      return { category: 'That category is archived. Choose another.' };
    case 'unknown-to-account':
      return { toAccount: 'That account no longer exists. Choose another.' };
    case 'same-transfer-account':
      return { form: 'Choose two different accounts.' };
    default:
      return null;
  }
}
