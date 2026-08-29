/**
 * Guards the one rule BuyWise cannot get wrong: a product is identified by
 * GTIN, or by brand *and* MPN, or not at all.
 *
 * eBay's brand and MPN fields are seller-typed free text, so most of these
 * cases are junk a real listing actually contains. A regression here wouldn't
 * crash anything — it would quietly attach a manufacturer's datasheet to the
 * wrong product, which is exactly the failure the rule exists to prevent.
 *
 * Run with: npm test
 */
import { productRefsFor, usableBrand, usableMpn } from "../lib/data/catalog/ref.ts";

const base = {
  id: "ebay:1", retailer: "ebay", productId: null, gtin: null, title: "t", url: "u",
  price: 1, currency: "AUD", images: [], condition: "NEW", conditionLabel: null,
  brand: null, model: null, seller: null, rating: null, marketplace: null,
  buyingOptions: [], listedAt: null, topRatedSeller: null,
};
const L = (o) => ({ ...base, ...o });

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
};

// --- junk sellers type into eBay's brand/MPN boxes ---
check("brand 'Unbranded' rejected", usableBrand("Unbranded"), null);
check("brand 'unbranded/generic' rejected", usableBrand("unbranded/generic"), null);
check("brand 'Does not apply' rejected", usableBrand("Does not apply"), null);
check("brand 'No Brand' rejected", usableBrand("No Brand"), null);
check("brand '123' rejected (no letters)", usableBrand("123"), null);
check("brand 'Sony' accepted", usableBrand("Sony"), "Sony");

check("mpn 'N/A' rejected", usableMpn("N/A", "Sony"), null);
check("mpn 'Does Not Apply' rejected", usableMpn("Does Not Apply", "Sony"), null);
check("mpn '-' rejected", usableMpn("-", "Sony"), null);
check("mpn equal to brand rejected", usableMpn("Sony", "Sony"), null);
check("mpn full title rejected (4+ words)",
  usableMpn("Sony WH-1000XM5 Wireless Noise Cancelling Headphones", "Sony"), null);
check("mpn overlong rejected", usableMpn("A".repeat(41), "Sony"), null);
check("mpn 'WH1000XM5B' accepted", usableMpn("WH1000XM5B", "Sony"), "WH1000XM5B");
check("mpn 'WH-1000XM5 B' accepted (2 words)", usableMpn("WH-1000XM5 B", "Sony"), "WH-1000XM5 B");

// --- refs: only ever gtin or brand+mpn, gtin first ---
check("no identifiers → no refs", productRefsFor(L({})), []);
check("brand only → no refs", productRefsFor(L({ brand: "Sony" })), []);
check("mpn only → no refs", productRefsFor(L({ model: "WH1000XM5B" })), []);
check("junk brand + good mpn → no refs",
  productRefsFor(L({ brand: "Unbranded", model: "WH1000XM5B" })), []);
check("good brand + junk mpn → no refs",
  productRefsFor(L({ brand: "Sony", model: "Does not apply" })), []);
check("brand + mpn → one ref",
  productRefsFor(L({ brand: "Sony", model: "WH1000XM5B" })),
  [{ kind: "brand-mpn", brand: "Sony", mpn: "WH1000XM5B" }]);
check("gtin ranked before brand+mpn",
  productRefsFor(L({ gtin: "4548736134362", brand: "Sony", model: "WH1000XM5B" })),
  [{ kind: "gtin", gtin: "4548736134362" },
   { kind: "brand-mpn", brand: "Sony", mpn: "WH1000XM5B" }]);

// --- the rule that matters most: a title can never produce a ref ---
check("title alone produces nothing",
  productRefsFor(L({ title: "Sony WH-1000XM5 Wireless Headphones Black" })), []);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
