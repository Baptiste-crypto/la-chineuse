// Collecte Label Emmaüs — à exécuter dans un onglet www.label-emmaus.co
window.__job = { site: 'emm', phase: 'recherche', done: 0, total: 0, err: [], out: null };
(async () => {
  const J = window.__job;
  const TY = { buffet: /buffet|bahut/i, enfilade: /enfilade/i, commode: /commode|chiffonnier|semainier/i, console: /console/i };
  const ST = { '60': /ann[ée]es?\s*(19)?[56]0\s*[-\/]?\s*60|ann[ée]es?\s*(19)?60|\b60'?s\b|\b196\d\b|sixties/i, '70': /ann[ée]es?\s*(19)?70|[\/-]\s*70\b|\b70'?s\b|\b197\d\b|seventies/i, '80': /ann[ée]es?\s*(19)?80|[\/-]\s*80\b|\b80'?s\b|\b198\d\b/i, sc: /scandinav|danois|teck|teak|su[ée]dois/i, fo: /formica/i };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const links = new Set();
  for (const t of ['buffet', 'enfilade', 'commode', 'console']) for (const s of ['vintage', 'scandinave', 'formica', 'années 60', 'années 70', 'teck']) {
    try {
      const doc = new DOMParser().parseFromString(await (await fetch('/fr/catalogue/?q=' + encodeURIComponent(t + ' ' + s))).text(), 'text/html');
      [...doc.querySelectorAll('a[href]')].forEach(a => { const p = new URL(a.getAttribute('href'), location.origin).pathname; if (/^\/fr\/[a-z0-9-]+-\d{6,}\/$/.test(p) && TY[t].test(p)) links.add(p); });
    } catch (e) { J.err.push(t + s + e.message); }
    await sleep(700);
  }
  J.phase = 'détails'; J.total = links.size;
  const ads = [];
  for (const p of links) {
    try {
      const h = await (await fetch(p)).text();
      const prod = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => { try { return JSON.parse(m[1]); } catch { return null; } }).find(x => x && x['@type'] === 'Product');
      const txt = new DOMParser().parseFromString(h, 'text/html').body.innerText.replace(/\s+/g, ' ');
      if (prod) {
        const title = String(prod.name || '').trim(); const of = [].concat(prod.offers || [])[0] || {};
        const car = (txt.match(/Caractéristiques (.*?) Description /) || [])[1] || '';
        const L = 'État|Matière\\(s\\), matériaux|Longueur \\(en cm\\)|Largeur \\(en cm\\)|Hauteur \\(en cm\\)|Profondeur \\(en cm\\)|Couleur\\(s\\)|Marque|Époque|Style';
        const attrs = []; const re = new RegExp('(' + L + ') (.*?)(?= (?:' + L + ') |$)', 'g'); let m; while ((m = re.exec(car))) attrs.push([m[1].replace(/\(s\)|, matériaux/g, '').replace(' (en cm)', ' (cm)'), m[2].trim()]);
        const seller = (txt.match(/Vendu par (.*?) \d,\d/) || txt.match(/Vendu par (.{3,60}?) (?:Chargement|Retour)/) || [])[1] || '';
        const desc = String(prod.description || '').replace(/­/g, '').trim();
        const ty = Object.keys(TY).filter(k => TY[k].test(title));
        if (ty.length && !/OutOfStock|SoldOut/i.test(of.availability || '')) ads.push({ id: 'emm-' + p.match(/(\d+)\/$/)[1], src: 'emm', url: 'https://www.label-emmaus.co' + p, t: title, p: Math.round(Number(of.price) || 0), c: '', z: '', km: null, d: '', o: 'pro', seller: seller.trim(), ty, st: Object.keys(ST).filter(k => ST[k].test(title + ' ' + desc)), imgs: [].concat(prod.image || []).map(String).slice(0, 12), desc: desc.slice(0, 4000), attrs, ship: 'Livraison ou retrait en boutique' });
      }
    } catch (e) { J.err.push(p + ' ' + e.message); }
    J.done++; await sleep(600);
  }
  J.out = ads; J.phase = 'fini';
})();
'lancé'
