/* ============================================================
   COLLECTION REGISTRY
   ------------------------------------------------------------
   Each collection is one tab in the vault. The Mew set below
   reuses the data in cards.js (window.MEW_CARDS).

   To ADD a new collection later:
     1. make a file like  collections/charizard.js  with:
          window.TCG_COLLECTIONS.push({
            id:'charizard', name:'Charizard',
            tagline:'…', accent:'#ff7a45', accent2:'#ffd166',
            cards:[ {id, name, variant, set, number, year,
                     rarity, tier, price, priceText, confidence, img}, … ]
          });
     2. add  <script src="collections/charizard.js"></script>
        in index.html (right after this file, before app.js).
   That's it — a new tile appears on the home screen.
   ============================================================ */

window.TCG_COLLECTIONS = window.TCG_COLLECTIONS || [];

window.TCG_COLLECTIONS.push({
  id: 'mew',
  name: 'Mew',
  tagline: 'Every English Mew card — cheapest to priciest',
  accent: '#ff8fb8',
  accent2: '#b79be0',
  cards: window.MEW_CARDS || [],
});
