/**
 * Canonical currency symbols map shared across the entire app.
 * This is the single source of truth – do not duplicate this in components.
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$",
  CAD: "C$",
  CHF: "Fr.",
  CZK: "Kč",
  EUR: "€",
  GBP: "£",
  HUF: "Ft",
  ILS: "₪",
  JPY: "¥",
  KRW: "₩",
  MXN: "MX$",
  NZD: "NZ$",
  PLN: "zł",
  RUB: "₽",
  SEK: "kr",
  SGD: "S$",
  THB: "฿",
  TRY: "₺",
  USD: "$",
  ZAR: "R",
}

/**
 * Returns the display symbol for a currency code, falling back to the code itself.
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency
}

/**
 * Formats a numeric amount with the appropriate currency symbol.
 * @example formatCurrency(1234.5, "EUR") → "€1,234.50"
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  const symbol = getCurrencySymbol(currency)
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${symbol}${formatted}`
}
