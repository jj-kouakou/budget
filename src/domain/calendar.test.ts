import { describe, expect, it } from 'vitest';
import {
  MAX_MONTH,
  MIN_MONTH,
  addMonths,
  formatMonth,
  isValidLocalDate,
  isValidMonthKey,
  monthOf,
  todayLocalDate,
} from './calendar';

describe('todayLocalDate', () => {
  it('reads local calendar fields and zero-pads', () => {
    expect(todayLocalDate(new Date(2026, 0, 5, 0, 0, 0))).toBe('2026-01-05');
  });

  it('uses the local date near midnight, not UTC', () => {
    expect(todayLocalDate(new Date(2026, 10, 2, 23, 59, 59))).toBe(
      '2026-11-02',
    );
    expect(todayLocalDate(new Date(2026, 10, 3, 0, 0, 0))).toBe('2026-11-03');
  });

  it('throws RangeError for an invalid Date', () => {
    expect(() => todayLocalDate(new Date(Number.NaN))).toThrow(RangeError);
  });
});

describe('monthOf', () => {
  it('returns the first seven characters of a valid date', () => {
    expect(monthOf('2026-11-02')).toBe('2026-11');
  });

  it('throws RangeError for an invalid date', () => {
    expect(() => monthOf('2026-13-02')).toThrow(RangeError);
  });
});

describe('addMonths', () => {
  it('steps across year boundaries', () => {
    expect(addMonths('2026-11', 2)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-11', 12)).toBe('2027-11');
    expect(addMonths('2026-11', -12)).toBe('2025-11');
  });

  it('throws at the representable bounds', () => {
    expect(() => addMonths(MIN_MONTH, -1)).toThrow(RangeError);
    expect(() => addMonths(MAX_MONTH, 1)).toThrow(RangeError);
  });

  it('throws for a non-integer delta', () => {
    expect(() => addMonths('2026-11', 1.5)).toThrow(RangeError);
  });

  it('throws for a malformed month', () => {
    expect(() => addMonths('2026-13', 1)).toThrow(RangeError);
  });
});

describe('isValidLocalDate', () => {
  it.each([
    ['2024-02-29', true],
    ['2023-02-29', false],
    ['1900-02-29', false],
    ['2000-02-29', true],
    ['2026-13-01', false],
    ['2026-01-32', false],
    ['2026-1-01', false],
    ['0000-01-01', false],
    ['2026-01-01 ', false],
  ])('validates %j as %s', (value, expected) => {
    expect(isValidLocalDate(value)).toBe(expected);
  });
});

describe('isValidMonthKey', () => {
  it.each([
    ['2026-11', true],
    ['2026-00', false],
    ['2026-13', false],
    ['2026-1', false],
    ['0000-01', false],
    ['9999-12', true],
  ])('validates %j as %s', (value, expected) => {
    expect(isValidMonthKey(value)).toBe(expected);
  });
});

describe('formatMonth', () => {
  it('formats a month label', () => {
    expect(formatMonth('2026-11', 'en-CA')).toBe('November 2026');
  });

  it('formats across a year boundary', () => {
    expect(formatMonth('2026-01', 'en-CA')).toBe('January 2026');
    expect(formatMonth('2025-12', 'en-CA')).toBe('December 2025');
  });

  it('throws for a malformed month', () => {
    expect(() => formatMonth('2026-13', 'en-CA')).toThrow(RangeError);
  });
});
