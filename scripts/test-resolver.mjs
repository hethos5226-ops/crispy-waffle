/**
 * Guards the product-identity rules, which were learned from real failures
 * rather than reasoned out in advance.
 *
 * The case that matters most is the LG one: a TV stand carrying the
 * television's own part number, where brand and MPN both agreed and the match
 * was still wrong. If that test ever passes a match, BuyWise is back to
 * attaching a television's specifications and score to a $50 bracket.
 *
 * Run with: npm test
 */
import { evaluateMatch, looksLikeAccessory, ACCEPT_THRESHOLD } from "../lib/data/catalog/resolver.ts";
import { composeScore } from "../lib/score/factors.ts";

let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`}`);
}

const listing = (o) => ({
  id: "ebay:1", retailer: "ebay", productId: null, gtin: null, title: "", url: "u",
  price: 100, currency: "AUD", images: [], condition: "NEW", conditionLabel: null,
  brand: null, model: null, seller: null, rating: null, marketplace: null,
  buyingOptions: [], listedAt: null, topRatedSeller: null, ...o,
});

const product = (o) => ({
  id: "icecat:1", source: "icecat", name: "LG OLED65C3PUA", brand: "LG", mpn: "OLED65C3PUA",
  gtins: [], category: null, summary: null, images: [], specGroups: [],
  releaseDate: null, rating: null, ...o,
});

// ---- The measured failure: a stand carrying the TV's part number ----
check("LG stand does NOT match the LG television",
  evaluateMatch(
    listing({ title: 'LG OLED 65" TV Stand Base for OLED65C3PUA with mounting', brand: "LG", model: "OLED65C3PUA" }),
    product()
  ).accepted,
  false);
check("...and says why",
  evaluateMatch(
    listing({ title: 'LG OLED 65" TV Stand Base for OLED65C3PUA', brand: "LG", model: "OLED65C3PUA" }),
    product()
  ).rejectedBecause,
  "Looks like an accessory");

// ---- Accessory detection ----
check("'for <model>' detected", looksLikeAccessory("Base for OLED65C3PUA", "OLED65C3PUA"), true);
check("'case' detected", looksLikeAccessory("Hard Case for Headphones", null), true);
check("'replacement' detected", looksLikeAccessory("Replacement Ear Pads", null), true);
check("'compatible with' detected", looksLikeAccessory("Charger compatible with WH1000XM5", null), true);
check("plain product title not flagged", looksLikeAccessory("Sony WH-1000XM5 Wireless Headphones", "WH1000XM5"), false);

// ---- Gate 1: brand conflict is fatal ----
check("brand conflict rejects even with matching MPN",
  evaluateMatch(
    listing({ title: "OLED65C3PUA Television", brand: "Samsung", model: "OLED65C3PUA" }),
    product()
  ).rejectedBecause,
  "Brand conflict");

// ---- Gate 3: a barcode can never identify on its own ----
const gtinOnly = evaluateMatch(
  listing({ title: "65 inch OLED Television", brand: "LG", gtin: "8806091234567" }),
  product({ gtins: ["8806091234567"] })
);
check("gtin + brand + no mpn is rejected", gtinOnly.accepted, false);
check("...and scores below threshold by construction", gtinOnly.score < ACCEPT_THRESHOLD, true);

// ---- A genuine match ----
const good = evaluateMatch(
  listing({ title: "LG OLED65C3PUA 65 inch OLED evo C3 4K Smart TV", brand: "LG", model: "OLED65C3PUA" }),
  product()
);
check("genuine product listing matches", good.accepted, true);
check("...on mpn + brand + title", good.score, 90);

// ---- Title can never carry a match alone ----
check("brand + model-in-title without MPN is not enough",
  evaluateMatch(
    listing({ title: "LG OLED65C3PUA 65 inch TV", brand: "LG" }),
    product()
  ).accepted,
  false);

// ---- Weight redistribution ----
const f = (key, weight, score) => ({ key, label: key, weight, score, detail: "" });
check("unavailable factors redistribute weight",
  composeScore([f("price", 0.3, 80), f("reviews", 0.25, null), f("age", 0.1, 60)]).score,
  75);
check("nothing scoreable yields null, not zero",
  composeScore([f("price", 0.3, null), f("reviews", 0.25, null)]).score,
  null);
check("confidence reflects available weight",
  Math.round(composeScore([f("price", 0.3, 80), f("reviews", 0.3, null)]).confidence * 100),
  50);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
