import type { Currency, PriceFormat } from '@/types/catalog';

// Currency formatting utilities
export function formatCLP(cents: number): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(cents: number): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatEUR(cents: number): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function centsToCLP(cents: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

// Format CLP integers (for pricing API which returns CLP integers, not cents)
export function formatCLPInteger(clp: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(clp || 0);
}

// Main price formatting function
export function formatPrice({ cents, currency = 'CLP' }: PriceFormat): string {
  switch (currency) {
    case 'CLP':
      return formatCLP(cents);
    case 'USD':
      return formatUSD(cents);
    case 'EUR':
      return formatEUR(cents);
    default:
      // Fallback to USD format for unknown currencies
      return formatUSD(cents);
  }
}

// Utility to parse cents from currency string (for form inputs, etc.)
export function parseCurrency(value: string, currency: Currency = 'CLP'): number {
  // Remove currency symbols and formatting
  const cleaned = value.replace(/[^\d.,]/g, '');
  const number = parseFloat(cleaned.replace(',', '.'));

  if (isNaN(number)) {
    return 0;
  }

  // Convert to cents
  return Math.round(number * 100);
}

// Validate if price is reasonable (basic sanity check)
export function isValidPrice(cents: number, currency: Currency = 'CLP'): boolean {
  if (cents < 0) return false;

  switch (currency) {
    case 'CLP':
      // CLP prices should be reasonable (not too small or too large)
      return cents >= 100 && cents <= 100000000; // $1 to $1,000,000 CLP
    case 'USD':
    case 'EUR':
      return cents >= 1 && cents <= 1000000; // $0.01 to $10,000
    default:
      return cents >= 1;
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