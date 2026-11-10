import type { Account, Category, Entry } from './types';
import { isValidLocalDate } from './calendar';

export const BACKUP_FORMAT = 'budget-backup';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupSettings {
  currency: string;
  currencyExponent: number;
}

export interface BackupData {
  accounts: Account[];
  categories: Category[];
  entries: Entry[];
  settings: BackupSettings;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
}

export interface BackupPreview {
  exportedAt: string;
  accountCount: number;
  entryCount: number;
}

export type BackupErrorCode = 'not-a-backup' | 'newer-version' | 'damaged';

const ERROR_MESSAGES: Record<BackupErrorCode, string> = {
  'not-a-backup': 'This file is not a Budget backup.',
  'newer-version': 'This backup was made by a newer version of Budget.',
  damaged: 'This backup is damaged.',
};

export class BackupError extends Error {
  readonly name = 'BackupError';

  constructor(
    readonly code: BackupErrorCode,
    message: string,
  ) {
    super(message);
  }
}

type BackupMigration = (data: unknown) => unknown;

const MIGRATIONS: Record<number, BackupMigration> = {};

function fail(code: BackupErrorCode): never {
  throw new BackupError(code, ERROR_MESSAGES[code]);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function byCodeUnitId(
  left: { id: string },
  right: { id: string },
): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function parseAccount(value: unknown): Account {
  if (!isObject(value)) {
    fail('damaged');
  }
  const { id, name, type, createdAt } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(name)) {
    fail('damaged');
  }
  if (type !== 'checking' && type !== 'savings' && type !== 'credit') {
    fail('damaged');
  }
  if (typeof createdAt !== 'string') {
    fail('damaged');
  }
  return { id, name, type, createdAt };
}

function parseCategory(value: unknown): Category {
  if (!isObject(value)) {
    fail('damaged');
  }
  const { id, name, archived } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(name)) {
    fail('damaged');
  }
  if (typeof archived !== 'boolean') {
    fail('damaged');
  }
  return { id, name, archived };
}

function parseEntry(value: unknown): Entry {
  if (!isObject(value)) {
    fail('damaged');
  }
  const { id, kind, date, amountMinor, accountId, categoryId, toAccountId } =
    value;
  if (!isNonEmptyString(id)) {
    fail('damaged');
  }
  if (
    kind !== 'expense' &&
    kind !== 'income' &&
    kind !== 'transfer' &&
    kind !== 'opening'
  ) {
    fail('damaged');
  }
  if (typeof date !== 'string' || !isValidLocalDate(date)) {
    fail('damaged');
  }
  if (typeof amountMinor !== 'number' || !Number.isSafeInteger(amountMinor)) {
    fail('damaged');
  }
  if (kind !== 'opening' && amountMinor <= 0) {
    fail('damaged');
  }
  if (!isNonEmptyString(accountId)) {
    fail('damaged');
  }
  if (kind === 'transfer' && !isNonEmptyString(toAccountId)) {
    fail('damaged');
  }
  if (categoryId !== undefined && !isNonEmptyString(categoryId)) {
    fail('damaged');
  }
  if (toAccountId !== undefined && !isNonEmptyString(toAccountId)) {
    fail('damaged');
  }

  const entry: Entry = {
    id,
    kind,
    date,
    amountMinor,
    accountId,
  };
  if (isNonEmptyString(categoryId)) {
    entry.categoryId = categoryId;
  }
  if (isNonEmptyString(toAccountId)) {
    entry.toAccountId = toAccountId;
  }
  return entry;
}

function parseSettings(value: unknown): BackupSettings {
  if (!isObject(value)) {
    fail('damaged');
  }
  const { currency, currencyExponent } = value;
  if (!isNonEmptyString(currency)) {
    fail('damaged');
  }
  if (
    typeof currencyExponent !== 'number' ||
    !Number.isSafeInteger(currencyExponent) ||
    currencyExponent < 0
  ) {
    fail('damaged');
  }
  return { currency, currencyExponent };
}

function parseRowArray<T>(
  value: unknown,
  parseRow: (row: unknown) => T,
): T[] {
  if (!Array.isArray(value)) {
    fail('damaged');
  }
  return value.map(parseRow);
}

function parseData(value: unknown): BackupData {
  if (!isObject(value)) {
    fail('damaged');
  }
  return {
    accounts: parseRowArray(value.accounts, parseAccount),
    categories: parseRowArray(value.categories, parseCategory),
    entries: parseRowArray(value.entries, parseEntry),
    settings: parseSettings(value.settings),
  };
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

export function createBackupFile(
  data: BackupData,
  exportedAt: Date,
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    data: {
      accounts: [...data.accounts].sort(byCodeUnitId),
      categories: [...data.categories].sort(byCodeUnitId),
      entries: [...data.entries].sort(byCodeUnitId),
      settings: {
        currency: data.settings.currency,
        currencyExponent: data.settings.currencyExponent,
      },
    },
  };
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2) + '\n';
}

export function parseBackupFile(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail('not-a-backup');
  }

  if (!isObject(raw)) {
    fail('not-a-backup');
  }
  if (raw.format !== BACKUP_FORMAT) {
    fail('not-a-backup');
  }

  const schemaVersion = raw.schemaVersion;
  if (
    typeof schemaVersion !== 'number' ||
    !Number.isSafeInteger(schemaVersion) ||
    schemaVersion < 1
  ) {
    fail('damaged');
  }
  if (schemaVersion > BACKUP_SCHEMA_VERSION) {
    fail('newer-version');
  }
  if (
    typeof raw.exportedAt !== 'string' ||
    Number.isNaN(Date.parse(raw.exportedAt))
  ) {
    fail('damaged');
  }
  if (!isObject(raw.data)) {
    fail('damaged');
  }

  let migrated: unknown = raw.data;
  for (
    let version = schemaVersion;
    version < BACKUP_SCHEMA_VERSION;
    version += 1
  ) {
    const migration = MIGRATIONS[version];
    if (!migration) {
      fail('damaged');
    }
    migrated = migration(migrated);
  }

  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: raw.exportedAt,
    data: parseData(migrated),
  };
}

export function previewBackup(file: BackupFile): BackupPreview {
  return {
    exportedAt: file.exportedAt,
    accountCount: file.data.accounts.length,
    entryCount: file.data.entries.length,
  };
}

export function backupFileName(at: Date): string {
  const year = pad(at.getFullYear(), 4);
  const month = pad(at.getMonth() + 1, 2);
  const day = pad(at.getDate(), 2);
  const hours = pad(at.getHours(), 2);
  const minutes = pad(at.getMinutes(), 2);
  const seconds = pad(at.getSeconds(), 2);
  return `budget-backup-${year}-${month}-${day}-${hours}${minutes}${seconds}.json`;
}
