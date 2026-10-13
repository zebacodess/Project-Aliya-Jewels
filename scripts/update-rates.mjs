// Aliya Jewels - daily gold rate updater.
// Fetches XAU/USD spot from gold-api.com (free, no key), converts to AED per gram
// for each karat, applies the markup in config/markup.json, writes rates.json.
// On any problem it exits non-zero and leaves the previous rates.json untouched.
//
// Env (for testing): GOLD_API_FIXTURE=path/to/response.json  OUT=path/to/rates.json

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const OUT = process.env.OUT || path.join(root, "rates.json");
const CONFIG = path.join(root, "config", "markup.json");
const API = "https://api.gold-api.com/price/XAU";

const AED_PER_USD = 3.6725; // fixed peg
const GRAMS_PER_TROY_OZ = 31.1035;
const KARATS = [24, 22, 21, 18];
const round2 = (n) => Math.round(n * 100) / 100;

async function loadSpot() {
  if (process.env.GOLD_API_FIXTURE) {
    return JSON.parse(await readFile(process.env.GOLD_API_FIXTURE, "utf8"));
  }
  const res = await fetch(API, {
    headers: { "User-Agent": "AliyaJewels-daily-rates/1.0" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`gold-api.com returned HTTP ${res.status}`);
  return res.json();
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; }
}

const cfg = await readJson(CONFIG, {});
const markup = cfg.markupPercent || {};
const maxAgeHours = cfg.maxAgeHours ?? 72; // gold markets close at weekends

const data = await loadSpot();
const spot = Number(data.price);
if (data.symbol !== "XAU" || data.currency !== "USD") throw new Error("Unexpected symbol/currency in response");
if (!Number.isFinite(spot) || spot < 500 || spot > 20000) throw new Error(`Spot price out of sane range: ${data.price}`);

const priceUpdatedAt = new Date(data.updatedAt);
if (Number.isNaN(priceUpdatedAt.getTime())) throw new Error("Missing or invalid updatedAt");
const ageHours = (Date.now() - priceUpdatedAt.getTime()) / 36e5;
if (!process.env.SKIP_AGE_CHECK && ageHours > maxAgeHours) {
  throw new Error(`Price is ${ageHours.toFixed(1)}h old (limit ${maxAgeHours}h) - refusing to publish`);
}

const rates = {};
const baseRates = {};
for (const k of KARATS) {
  const pct = Number(markup[k] ?? 0);
  if (!Number.isFinite(pct) || pct < 0 || pct > 25) throw new Error(`Bad markup for ${k}K: ${markup[k]}`);
  const base = (spot / GRAMS_PER_TROY_OZ) * AED_PER_USD * (k / 24);
  baseRates[k] = round2(base);
  rates[k] = round2(base * (1 + pct / 100));
}
if (!(rates[24] > rates[22] && rates[22] > rates[21] && rates[21] > rates[18])) {
  throw new Error("Karat ordering check failed");
}

// Keep yesterday's figures so the site can show a real day-over-day change.
const prev = await readJson(OUT, null);
const today = new Date().toISOString().slice(0, 10);
let previous = prev?.previous ?? null;
if (prev?.generatedAt && prev.generatedAt.slice(0, 10) !== today) {
  previous = { date: prev.generatedAt.slice(0, 10), rates: prev.rates, spotUsdPerOz: prev.spotUsdPerOz };
}

const out = {
  currency: "AED",
  unit: "gram",
  rates,
  baseRates,
  markupPercent: Object.fromEntries(KARATS.map((k) => [k, Number(markup[k] ?? 0)])),
  spotUsdPerOz: round2(spot),
  priceUpdatedAt: priceUpdatedAt.toISOString(),
  generatedAt: new Date().toISOString(),
  source: "gold-api.com XAU/USD spot, converted at 3.6725 AED/USD",
  previous,
};

await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`OK  spot $${out.spotUsdPerOz}/oz  ->  24K AED ${rates[24]}  22K ${rates[22]}  21K ${rates[21]}  18K ${rates[18]}  (price age ${ageHours.toFixed(1)}h)`);
