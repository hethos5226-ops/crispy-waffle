/**
 * Money formatting for BuyWise.
 *
 * The app targets the Australian eBay marketplace, so prices are AUD and are
 * formatted with the en-AU locale ("$1,234" rather than "A$1,234", which is
 * how en-AU renders its own currency). A non-AUD listing still formats with
 * its own currency code so the value is never mislabelled.
 */
const AU_LOCALE = "en-AU";

export function formatMoney(value: number, currency: string, opts: { cents?: boolean } = {}): string {
  const fractionDigits = opts.cents ? 2 : 0;
  try {
    return new Intl.NumberFormat(AU_LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    // An unexpected currency code shouldn't crash a price.
    return `${currency} ${value.toFixed(fractionDigits)}`;
  }
}

/**
 * Price as shown to the user.
 *
 * en-AU already renders a bare "$" only for AUD and prefixes the code for
 * anything else ("USD 220"), so an overseas listing is distinguishable
 * without appending the code a second time.
 */
export function formatPriceWithCurrency(value: number, currency: string): string {
  return formatMoney(value, currency);
}
