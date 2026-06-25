# The Vault — Pokémon TCG Collection

A personal, multi-collection Pokémon TCG tracker. Dark "vault" UI, a live 3D background
(Three.js), and interactive **holographic cards** that tilt and shine under the cursor.
Check off cards as you get them — progress + value totals update live and save in your browser.

Pure static site — **no build step.** HTML + CSS + vanilla JS.

## Files
| File | What it is |
|------|-----------|
| `index.html` | shell (loads everything) |
| `styles.css` | the premium theme |
| `hero.js` | the 3D animated background (Three.js via CDN) |
| `app.js` | logic — routing, dashboard, collection view, holo, lightbox |
| `collections.js` | **the registry — defines each collection (tab)** |
| `cards.js` | the Mew card data (used by the Mew collection) |
| `img/` | locally-hosted card art for cards not in the public API |

## Adding a new collection (a new tab)
1. Make a data file, e.g. `collections/charizard.js`:
   ```js
   window.TCG_COLLECTIONS.push({
     id: 'charizard',
     name: 'Charizard',
     tagline: 'The big lizard, every printing',
     accent: '#ff7a45', accent2: '#ffd166',
     cards: [
       { id:'base-charizard-4', name:'Charizard', variant:'Holo', set:'Base Set',
         number:'4/102', year:1999, rarity:'Holo Rare', tier:3,
         price:300, priceText:'~$300', confidence:'High',
         img:'https://images.pokemontcg.io/base1/4_hires.png' },
       // …
     ],
   });
   ```
2. Add a `<script src="collections/charizard.js"></script>` in `index.html`
   (right after `collections.js`, before `app.js`).

A new tile appears on the home screen automatically.

`tier`: 1 = Bulk (<$50) · 2 = Mid ($50–300) · 3 = Grail ($300+)

**Card art:** official images come from the [Pokémon TCG API](https://pokemontcg.io):
`https://images.pokemontcg.io/<setId>/<number>_hires.png`. Look up setId + number at
`https://api.pokemontcg.io/v2/cards?q=name:<Pokemon>`. If a card isn't in the API, drop the
image in `img/` and point `img:'img/your-file.jpg'` (or leave `''` for a placeholder).

## Run locally
Open `index.html`, or `npx serve .`

## Deploy
```bash
git add -A && git commit -m "update" && git push   # auto-deploys once GitHub is linked in Vercel
# or, manual:
npx vercel deploy --prod --yes
```

> Checkmarks live in the browser's `localStorage` (per device). Old single-Mew progress is
> migrated automatically into the Mew collection.
