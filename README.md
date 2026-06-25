# Mew Master Set — Collection Tracker

A pretty, minimalist web app for tracking the complete **English Pokémon TCG Mew master set**.
Check off cards as you get them; progress + value totals update live and save in your browser.

Pure static site — **no build step, no dependencies.** Just HTML + CSS + JS.

## Files
| File | What it is |
|------|-----------|
| `index.html` | the page |
| `styles.css` | the Mew-pink theme |
| `app.js` | logic (checkmarks, filters, totals — saved via `localStorage`) |
| `cards.js` | **the card list — edit this to add cards** |

## Adding a card
Open `cards.js`, copy any line, and edit it. Give it a **unique `id`**. That's it — refresh and it appears, auto-sorted by price.

```js
{ id:'my-new-card', name:'Mew ex', variant:'Some Variant', set:'Some Set',
  number:'123/456', year:2026, rarity:'Ultra Rare', tier:2,
  price:42, priceText:'~$42', confidence:'High',
  img:'https://images.pokemontcg.io/<setId>/<number>_hires.png' },
```
`tier`: 1 = Bulk (<$50) · 2 = Mid ($50–300) · 3 = Grail ($300+)

**Finding the right image:** official card art comes from the [Pokémon TCG API](https://pokemontcg.io). The URL pattern is
`https://images.pokemontcg.io/<setId>/<number>_hires.png` — e.g. `sv3pt5/151_hires.png`.
Look up a card's `setId` + `number` at `https://api.pokemontcg.io/v2/cards?q=name:Mew`.
If a card isn't in the API (a few promos/jumbos aren't), leave `img:''` and it shows a Poké Ball placeholder.

## Run locally
Open `index.html` in a browser, or:
```bash
npx serve .
```

## Deploy to Vercel
```bash
npx vercel --prod
```
(or push to GitHub and import the repo at vercel.com — it auto-detects a static site, zero config.)

> Note: checkmarks live in the browser's `localStorage`, so they're per-device. Same URL on the same browser keeps your progress.
