/**
 * Simulates the latency of a real product/price API call. Mock data itself
 * resolves instantly, which would make loading states never appear — this
 * keeps the loading UI meaningful now and stays accurate once a real
 * provider (e.g. eBay) is wired in behind the same interface.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
