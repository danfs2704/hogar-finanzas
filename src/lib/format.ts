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
 * "1234567.89" → 1234567.89 (also handles US format as fallback)
 * "2,000,000" → 2000000 (handles US comma-as-thousands)
 */
export function parseLatam(value: string): number {
  if (!value) return 0;
  const cleaned = value.trim();
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  // Detect Latin American format: points as thousands, last comma as decimal
  // e.g. "1.234.567,89" or "2.000.000"
  const hasThousandDots = /\d{1,3}\.\d{3}/.test(cleaned);

  if (hasComma && hasDot && lastComma > lastDot) {
    // Latin American: 1.234.567,89
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }

  if (hasThousandDots && !hasComma) {
    // Latin American sin decimales: 2.000.000
    return parseFloat(cleaned.replace(/\./g, '')) || 0;
  }

  // Multiple commas and no dots → US format with comma thousands: "2,000,000"
  if (hasComma && !hasDot) {
    const commaCount = (cleaned.match(/,/g) || []).length;
    if (commaCount >= 2) {
      // Multiple commas = US thousands separator, strip all commas
      return parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
    // Single comma: could be decimal (latino input "123,45") or thousand ("200,000")
    // Heuristic: if 3 digits after comma and no more digits, treat as thousand
    const afterComma = cleaned.slice(lastComma + 1);
    if (afterComma.length === 3 && !afterComma.includes(',')) {
      // Likely thousand separator: "200,000"
      return parseFloat(cleaned.replace(/,/g, '')) || 0;
    }
    // Otherwise treat as decimal: "123,45" → 123.45
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }

  // Standard/US format: 1234567.89 or 1234567
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
}

/**
 * Format input value as user types (for onChange handler)
 * Keeps cursor position stable
 * Handles both Latin American input and pasted US-format numbers
 */
export function formatInputValue(value: string): string {
  // Detect pasted US-format number with commas as thousands: "2,000,000" or "1,234,567.89"
  const usFormatRegex = /^\d{1,3}(,\d{3})+(\.\d+)?$/;
  if (usFormatRegex.test(value)) {
    // Strip commas and dots, then format as latam
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
