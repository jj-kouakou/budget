import type { AccountType } from '../domain/types';

export const ACCOUNT_TYPES: readonly AccountType[] = [
  'checking',
  'savings',
  'credit',
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit card',
};

export function accountWithTypeLabel(
  name: string,
  type: AccountType | null,
): string {
  return type === null ? name : `${name} · ${ACCOUNT_TYPE_LABELS[type]}`;
}
