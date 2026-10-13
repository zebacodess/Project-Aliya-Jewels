# Aliya Jewels – daily gold rates (free setup)

Every day a free GitHub Actions job fetches the XAU/USD spot price from gold-api.com
(free, no API key, commercial use permitted by its terms), converts it to AED per gram for
24K / 22K / 21K / 18K, adds your markup, and saves `rates.json`. The website reads that file.
If anything looks wrong (bad number, price older than 72 hours, API down) the job fails and the
previous `rates.json` stays in place.

## 1. Add the files to your repo (same folder level as index.html)

```
.github/workflows/update-gold-rates.yml
scripts/update-rates.mjs
config/markup.json
rates.json            <- starter file built from a real API response; the job overwrites it daily
gold-live.js
```

Delete the old `worker.js` and `gold-live.js` from the earlier (scraper) approach, if you added them.

## 2. Allow the job to save its result

GitHub repo → Settings → Actions → General → Workflow permissions → **Read and write permissions** → Save.
(The workflow file already asks for `contents: write`; this setting must not block it.)

## 3. Edit index.html (two small changes)

1. Delete the line `setInterval(tickRates, 30000);` (this is the fake price movement).
2. Add this just before `</body>`, after the main `<script>` block:

```html
<script src="gold-live.js"></script>
```

The grey note under the rate cards is replaced automatically.

## 4. Set your markup

Edit `config/markup.json`. Values are percent added on top of spot, per karat. They start at 0,
which shows pure spot-based rates. For reference, the Gulf News retail 24K rate was about 2.4%
above spot on 13 Oct 2026.

```json
{ "markupPercent": { "24": 2.4, "22": 2.4, "21": 2.4, "18": 2.4 }, "maxAgeHours": 72 }
```

## 5. Run it once

GitHub → Actions tab → "Update gold rates" → Run workflow. A green tick means `rates.json`
was refreshed. After that it runs by itself at 09:00 Dubai time every day.

## 6. Make sure your host serves the new file

Your site must be published from the repo so the daily commit goes live. Netlify, Vercel and
Cloudflare Pages redeploy automatically on each commit. GitHub Pages on a private repo needs a
paid GitHub plan. If you host somewhere else (cPanel, etc.), tell me and I'll adapt the job to
upload the file.

## Notes
- Private repos get 2,000 free Actions minutes a month; this job uses about 1 minute a day.
- Rates are indicative and spot-based, not the Gulf News/DGJG retail rate. The page says so.
- Aliya AI in index.html calls api.anthropic.com from the browser with no API key, which will not
  work on a live site. It needs its own small backend.
