import type { LocalDate, MonthKey } from './types';

export const MIN_MONTH: MonthKey = '0001-01';
export const MAX_MONTH: MonthKey = '9999-12';

const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function isValidMonthKey(value: string): boolean {
  const match = MONTH_KEY_PATTERN.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  return year >= 1 && year <= 9999;
}

export function isValidLocalDate(value: string): boolean {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return (
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

export function todayLocalDate(now: Date = new Date()): LocalDate {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError('Invalid Date');
  }
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function monthOf(date: LocalDate): MonthKey {
  if (!isValidLocalDate(date)) {
    throw new RangeError('Invalid local date');
  }
  return date.slice(0, 7);
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  if (!isValidMonthKey(month)) {
    throw new RangeError('Invalid month key');
  }
  if (!Number.isInteger(delta)) {
    throw new RangeError('Month delta must be an integer');
  }

  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const total = year * 12 + (monthNumber - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = total - nextYear * 12 + 1;

  if (nextYear < 1 || nextYear > 9999) {
    throw new RangeError('Month is outside the representable range');
  }

  return `${String(nextYear).padStart(4, '0')}-${pad2(nextMonth)}`;
}

export function formatMonth(month: MonthKey, locale?: string): string {
  if (!isValidMonthKey(month)) {
    throw new RangeError('Invalid month key');
  }

  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const date = new Date(0);
  date.setFullYear(year, monthNumber - 1, 1);
  date.setHours(12, 0, 0, 0);

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}
