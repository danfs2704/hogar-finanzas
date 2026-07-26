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
  const parts = Math.abs(num).toFixed(decimals).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1] || '';
  return `${num < 0 ? '-' : ''}${intPart},${decPart}`;
}

/**
 * Parse a Latin American formatted string back to number
 * "1.234.567,89" → 1234567.89
 * "1234567.89" → 1234567.89 (also handles US format as fallback)
 */
export function parseLatam(value: string): number {
  if (!value) return 0;
  const cleaned = value.trim();
  // If has comma as decimal separator (e.g., "1.234,56")
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma > lastDot) {
    // Latin American format: 1.234.567,89
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Standard/US format: 1234567.89 or 1234567
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
}

/**
 * Format input value as user types (for onChange handler)
 * Keeps cursor position stable
 */
export function formatInputValue(value: string): string {
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
