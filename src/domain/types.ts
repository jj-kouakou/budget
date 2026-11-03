export type AccountType = 'checking' | 'savings' | 'credit';
export type EntryKind = 'expense' | 'income' | 'transfer' | 'opening';
export type LocalDate = string; // YYYY-MM-DD
export type MonthKey = string; // YYYY-MM

export interface Account {
  id: string; // UUID
  name: string; // trimmed, 1..60 characters
  type: AccountType;
  createdAt: string; // ISO instant; ordering only
}

export interface Category {
  id: string; // stable string; seed ids are cat_*
  name: string; // display name
  archived: boolean;
}

export interface Entry {
  id: string; // UUID
  kind: EntryKind;
  date: LocalDate;
  amountMinor: number; // integer minor units
  accountId: string; // primary/source account
  categoryId?: string; // expense/income only
  toAccountId?: string; // transfer destination only
}

export interface Settings {
  id: 'app';
  currency: string; // ISO 4217 code
  currencyExponent: number; // minor-unit exponent; 2 for CAD
  lastAccountId?: string;
}
