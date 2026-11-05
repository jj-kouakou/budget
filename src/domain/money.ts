const MAX_EXPONENT = 6;

function requireExponent(exponent: number): void {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > MAX_EXPONENT) {
    throw new RangeError('Currency exponent must be an integer in 0..6');
  }
}

export function parseAmount(input: string, exponent: number): number | null {
  requireExponent(exponent);

  const trimmed = input.trim();
  if (exponent === 0) {
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const whole = Number(trimmed);
    return Number.isSafeInteger(whole) ? whole : null;
  }

  const match = /^(\d+)(?:[.,](\d+))?$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const wholeText = match[1] ?? '';
  const fractionText = match[2] ?? '';
  if (fractionText.length > exponent) {
    return null;
  }

  const amount =
    Number(wholeText) * 10 ** exponent +
    Number(fractionText.padEnd(exponent, '0'));

  return Number.isSafeInteger(amount) ? amount : null;
}

export function formatAmountInput(
  amountMinor: number,
  exponent: number,
): string {
  requireExponent(exponent);
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Amount must be a safe integer');
  }

  const digits = String(Math.abs(amountMinor)).padStart(exponent + 1, '0');
  const sign = amountMinor < 0 ? '-' : '';
  if (exponent === 0) {
    return `${sign}${digits}`;
  }

  const split = digits.length - exponent;
  return `${sign}${digits.slice(0, split)}.${digits.slice(split)}`;
}

export function formatAmount(
  amountMinor: number,
  currency: string,
  exponent: number,
  locale?: string,
): string {
  requireExponent(exponent);
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Amount must be a safe integer');
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(amountMinor / 10 ** exponent);
}
