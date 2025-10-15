import type { Currency, PriceFormat } from '@/types/catalog';

/**
 * IMPORTANT: Chilean Pesos (CLP) do not have cents/decimals.
 * All CLP amounts are stored as full pesos (e.g., 40000 = $40.000 CLP, not $400.00)
 *
 * USD and EUR have cents, so they divide by 100.
 * CLP does NOT divide by 100.
 */

// Currency formatting utilities
export function formatCLP(clp: number): string {
  // CLP is stored as full pesos - NO division needed
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(clp);
}

export function formatUSD(cents: number): string {
  // USD has cents - divide by 100
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatEUR(cents: number): string {
  // EUR has cents - divide by 100
  const amount = cents / 100;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * @deprecated Use formatCLP instead - name was misleading
 * This is kept for backward compatibility but should be phased out
 */
export function centsToCLP(clp: number): string {
  // CLP amounts are stored as full pesos, not cents
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(clp || 0);
}

/**
 * @deprecated Use formatCLP instead - this is now the standard behavior
 * CLP amounts are always integers (full pesos)
 */
export function formatCLPInteger(clp: number): string {
  return formatCLP(clp);
}

// Main price formatting function
export function formatPrice({ clp, currency = 'CLP' }: PriceFormat): string {
  switch (currency) {
    case 'CLP':
      return formatCLP(clp);
    case 'USD':
      return formatUSD(clp); // If storing USD as cents
    case 'EUR':
      return formatEUR(clp); // If storing EUR as cents
    default:
      // Fallback to CLP format for Chilean market
      return formatCLP(clp);
  }
}

/**
 * Utility to parse currency input from forms
 * For CLP: Returns full peso amount (no conversion)
 * For USD/EUR: Would convert to cents (multiply by 100)
 */
export function parseCurrency(value: string, currency: Currency = 'CLP'): number {
  // Remove currency symbols and formatting
  const cleaned = value.replace(/[^\d.,]/g, '');
  const number = parseFloat(cleaned.replace(',', '.'));

  if (isNaN(number)) {
    return 0;
  }

  switch (currency) {
    case 'CLP':
      // CLP has no cents - return as-is (full pesos)
      return Math.round(number);
    case 'USD':
    case 'EUR':
      // USD/EUR have cents - convert to cents
      return Math.round(number * 100);
    default:
      return Math.round(number);
  }
}

/**
 * Validate if price is reasonable (basic sanity check)
 */
export function isValidPrice(amount: number, currency: Currency = 'CLP'): boolean {
  if (amount < 0) return false;

  switch (currency) {
    case 'CLP':
      // CLP prices stored as full pesos (not cents)
      // Reasonable range: $1.000 CLP to $10.000.000 CLP
      return amount >= 1000 && amount <= 10000000;
    case 'USD':
    case 'EUR':
      // USD/EUR stored as cents
      // Reasonable range: $0.01 to $10,000
      return amount >= 1 && amount <= 1000000;
    default:
      return amount >= 1;
  }
}

// Get currency symbol
export function getCurrencySymbol(currency: Currency): string {
  switch (currency) {
    case 'CLP':
      return '$';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    default:
      return '$';
  }
}
