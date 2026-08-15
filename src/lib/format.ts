/**
 * Latin American number formatting utilities
 * Thousands separator: . (period)
 * Decimal separator: , (comma)
 * Example: 1234567.89 → "1.234.567,89"
 */

/**
 * Format a number to Latin American display string
 * 1234567.89 → "1.234.567,89"
 */
export function formatLatam(n: number | string, decimals: number = 2): string {
  const num = typeof n === 'string' ? parseFloat(n.replace(/\./g, '').replace(',', '.')) : n;
  if (isNaN(num)) return '';
  const absNum = Math.abs(num);
  let intPart: string;
  let decPart: string;
  if (decimals === 0) {
    intPart = Math.trunc(absNum).toString();
    decPart = '';
  } else {
    const parts = absNum.toFixed(decimals).split('.');
    intPart = parts[0];
    decPart = parts[1] || '';
  }
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decimals === 0) {
    return `${num < 0 ? '-' : ''}${formattedInt}`;
  }
  return `${num < 0 ? '-' : ''}${formattedInt},${decPart}`;
}

/**
 * Parse a Latin American formatted string back to number
 * "1.234.567,89" → 1234567.89
 * "2.000.000" → 2000000
 * "2,000,000" → 2000000 (US comma-as-thousands)
 */
export function parseLatam(value: string): number {
  if (!value) return 0;
  const cleaned = value.trim();
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  // If comma is after the last dot → comma is the decimal separator (LatAm)
  if (hasComma && hasDot && lastComma > lastDot) {
    // Latin American: 1.234.567,89
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }

  // No comma, but has multiple dots → they are thousands separators (LatAm whole number)
  // e.g. "2.000.000" → must NOT go through parseFloat as-is (it would stop at 2nd dot)
  const dotCount = (cleaned.match(/\./g) || []).length;
  if (dotCount > 1) {
    return parseFloat(cleaned.replace(/\./g, '')) || 0;
  }

  // Single comma, no dots → could be decimal or thousands
  if (hasComma && !hasDot) {
    const commaCount = (cleaned.match(/,/g) || []).length;
    if (commaCount >= 2) {
      // Multiple commas = US thousands: "2,000,000"
      return parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
    // Single comma: check if 3 digits after → likely thousands, else decimal
    const afterComma = cleaned.slice(lastComma + 1);
    if (afterComma.length === 3 && !afterComma.includes(',')) {
      return parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
    // Otherwise treat as decimal: "123,45" → 123.45
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }

  // Single dot or no separators → standard/US format or plain number
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
}

/**
 * Format input value as user types (for onChange handler)
 * Keeps cursor position stable
 */
export function formatInputValue(value: string): string {
  // Detect pasted US-format number with commas as thousands: "2,000,000" or "1,234,567.89"
  const usFormatRegex = /^\d{1,3}(,\d{3})+(\.\d+)?$/;
  if (usFormatRegex.test(value)) {
    const numStr = value.replace(/,/g, '').replace('.', '');
    const dotPos = value.lastIndexOf('.');
    const hasDecimals = dotPos !== -1;
    const decimals = hasDecimals ? value.slice(dotPos + 1).slice(0, 2) : '';
    const intStr = hasDecimals ? numStr.slice(0, -decimals.length) : numStr;
    const formatted = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decimals ? `${formatted},${decimals}` : formatted;
  }

  // Remove all non-digit and non-comma
  let digits = value.replace(/[^0-9,]/g, '');
  // Only allow one comma
  const commaIndex = digits.indexOf(',');
  if (commaIndex !== -1) {
    digits = digits.slice(0, commaIndex + 1) + digits.slice(commaIndex + 1).replace(/,/g, '');
  }
  if (!digits) return '';

  const parts = digits.split(',');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? `,${parts[1].slice(0, 2)}` : '';

  // Add thousands separators to integer part
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return formatted + decPart;
}

/**
 * Format currency for display
 */
export function formatCurrencyARS(n: number): string {
  const formatted = formatLatam(n, 0);
  return `$ ${formatted}`;
}

export function formatCurrencyUSD(n: number): string {
  const formatted = formatLatam(n, 2);
  return `U$S ${formatted}`;
}
