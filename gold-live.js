/* Aliya Jewels - daily gold rates from rates.json (written by the GitHub Action).
   Load this AFTER the main inline <script> in index.html. */
(function () {
  const RATES_URL = "rates.json";          // same folder as index.html
  const REFRESH_MS = 60 * 60 * 1000;       // re-check the file hourly while the page stays open
  const STALE_AFTER_HOURS = 96;            // hide figures if the file is older than this

  const note = document.querySelector("#prices .disclaimer");
  const setNote = (t) => { if (note) note.textContent = t; };
  setNote("Loading today's gold rates…");

  // Aliya AI quotes the same figures shown on the page.
  window.currentRatesSummary = function () {
    return `24K: AED ${rateState["24"].price.toFixed(2)}/g, 22K: AED ${rateState["22"].price.toFixed(2)}/g, ` +
           `21K: AED ${rateState["21"].price.toFixed(2)}/g, 18K: AED ${rateState["18"].price.toFixed(2)}/g, ` +
           `Spot: $${rateState["spot"].price.toFixed(2)}/oz (indicative, updated daily).`;
  };

  function apply(d) {
    const prev = d.previous || null;
    ["24", "22", "21", "18"].forEach((k) => {
      const p = d.rates[k], s = rateState[k];
      const open = prev && prev.rates && prev.rates[k] ? prev.rates[k] : p;
      s.price = p; s.open = open;
      s.high = Math.max(p, open); s.low = Math.min(p, open);
      s.hist = prev ? Array(19).fill(open).concat(p) : Array(20).fill(p);
    });
    const s = rateState["spot"];
    const sOpen = prev && prev.spotUsdPerOz ? prev.spotUsdPerOz : d.spotUsdPerOz;
    spotUsdOz = d.spotUsdPerOz;
    s.price = d.spotUsdPerOz; s.open = sOpen;
    s.high = Math.max(s.price, sOpen); s.low = Math.min(s.price, sOpen);
    s.hist = prev ? Array(19).fill(sOpen).concat(s.price) : Array(20).fill(s.price);

    renderRates(); renderTicker(); updateCalc();

    const when = new Date(d.generatedAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai", dateStyle: "medium", timeStyle: "short" });
    setNote(`Indicative rates based on international spot gold, updated daily (last update ${when}, Dubai time). ` +
            `Change % compares with the previous update. Final prices are confirmed at our counter. WhatsApp +971 50 282 5414 for today's rate.`);
  }

  async function load() {
    try {
      const res = await fetch(RATES_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const d = await res.json();
      const ageH = (Date.now() - new Date(d.generatedAt).getTime()) / 36e5;
      if (!(d.rates && d.rates["24"] > 0) || !(d.spotUsdPerOz > 0)) throw new Error("bad file");
      if (ageH > STALE_AFTER_HOURS) throw new Error("stale");
      apply(d);
    } catch (e) {
      setNote("Today's rates are temporarily unavailable. Please WhatsApp us on +971 50 282 5414 or call +971 4 352 5303 for the current rate.");
    }
  }

  load();
  setInterval(load, REFRESH_MS);
})();
