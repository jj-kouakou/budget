import { describe, expect, it } from 'vitest';
import { formatAmount, formatAmountInput, parseAmount } from './money';

describe('parseAmount', () => {
  it.each([
    ['12', 1200],
    ['12.3', 1230],
    ['12,34', 1234],
    ['0', 0],
    ['0.00', 0],
    [' 12,34 ', 1234],
    ['00012.30', 1230],
  ])('parses %j at exponent 2', (input, expected) => {
    expect(parseAmount(input, 2)).toBe(expected);
  });

  it.each([
    '12.345',
    '1,234.56',
    '1.234,56',
    '1,2,3',
    '-1',
    '+1',
    '.5',
    '5.',
    '',
    '   ',
    '1 000',
    '1e3',
    'NaN',
    'Infinity',
  ])('rejects %j at exponent 2', (input) => {
    expect(parseAmount(input, 2)).toBeNull();
  });

  it('rejects values above Number.MAX_SAFE_INTEGER', () => {
    expect(parseAmount('90071992547409.92', 2)).toBeNull();
  });

  it('accepts only digits at exponent 0', () => {
    expect(parseAmount('12', 0)).toBe(12);
    expect(parseAmount('12.5', 0)).toBeNull();
    expect(parseAmount('12,0', 0)).toBeNull();
    expect(parseAmount('12.', 0)).toBeNull();
  });

  it('rejects unsafe exponent-0 values', () => {
    expect(parseAmount('9007199254740992', 0)).toBeNull();
    expect(parseAmount('9'.repeat(400), 0)).toBeNull();
  });

  it.each([-1, 7, 1.5])('throws RangeError for exponent %s', (exponent) => {
    expect(() => parseAmount('12', exponent)).toThrow(RangeError);
  });
});

describe('formatAmount', () => {
  it('formats minor units with two decimals', () => {
    expect(formatAmount(1234, 'CAD', 2, 'en-CA')).toBe('$12.34');
    expect(formatAmount(0, 'CAD', 2, 'en-CA')).toBe('$0.00');
    expect(formatAmount(-1234, 'CAD', 2, 'en-CA')).toBe('-$12.34');
  });

  it('formats exponent 0 without decimals', () => {
    expect(formatAmount(1200, 'CAD', 0, 'en-CA')).toBe('$1,200');
  });

  it.each([-1, 7, 1.5])('throws RangeError for exponent %s', (exponent) => {
    expect(() => formatAmount(100, 'CAD', exponent, 'en-CA')).toThrow(
      RangeError,
    );
  });

  it('throws RangeError for an unsafe amount', () => {
    expect(() =>
      formatAmount(Number.MAX_SAFE_INTEGER + 1, 'CAD', 2, 'en-CA'),
    ).toThrow(RangeError);
  });
});

describe('formatAmountInput', () => {
  it.each([
    [4500, 2, '45.00'],
    [450, 2, '4.50'],
    [5, 2, '0.05'],
    [0, 2, '0.00'],
    [45, 0, '45'],
    [1, 6, '0.000001'],
    [-4500, 2, '-45.00'],
  ])('formats %s at exponent %s as %j', (amountMinor, exponent, expected) => {
    expect(formatAmountInput(amountMinor, exponent)).toBe(expected);
  });

  it('keeps trailing zeros instead of trimming the fraction', () => {
    expect(formatAmountInput(4500, 2)).toBe('45.00');
    expect(formatAmountInput(100, 6)).toBe('0.000100');
  });

  it.each([
    [0, 0],
    [0, 2],
    [0, 6],
    [1, 0],
    [1, 2],
    [1, 6],
    [5, 2],
    [50, 2],
    [450, 2],
    [4500, 2],
    [999999, 2],
    [123456789, 2],
  ])('round-trips %s at exponent %s through parseAmount', (amount, exponent) => {
    expect(parseAmount(formatAmountInput(amount, exponent), exponent)).toBe(
      amount,
    );
  });

  it('renders a leading minus for negative values', () => {
    expect(formatAmountInput(-1, 2)).toBe('-0.01');
  });

  it.each([-1, 7, 1.5])('throws RangeError for exponent %s', (exponent) => {
    expect(() => formatAmountInput(100, exponent)).toThrow(RangeError);
  });

  it('throws RangeError for an unsafe amount', () => {
    expect(() =>
      formatAmountInput(Number.MAX_SAFE_INTEGER + 1, 2),
    ).toThrow(RangeError);
  });
});
