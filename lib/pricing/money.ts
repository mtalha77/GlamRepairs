/**
 * Money formatting. HANDOVER-62 Part 4.
 *
 * Amounts are integers in minor units, and the number of decimal places
 * comes from the row: 2 for most currencies, 3 for KWD, BHD and OMR, 0 for
 * JPY. Never a hardcoded / 100, and never a symbol glued onto a number:
 * Intl knows where the symbol goes and what it looks like locally.
 *
 * Whole amounts show no decimals ("Rs 3,000", "₦15,000", not "₦15,000.00").
 *
 * Every price shown is a number a person chose for that market. Nothing
 * here, or anywhere on the storefront, converts with fx_rates.
 */
export function formatMoney(amountMinor: number, currency: string, minorUnits: number, country?: string | null): string {
  const amount = amountMinor / 10 ** minorUnits;
  const whole = amountMinor % 10 ** minorUnits === 0;
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: whole ? 0 : minorUnits,
    maximumFractionDigits: minorUnits,
  };
  try {
    return new Intl.NumberFormat(country ? `en-${country}` : "en", options).format(amount);
  } catch {
    return new Intl.NumberFormat("en", options).format(amount);
  }
}
