import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmount } from './money';

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
