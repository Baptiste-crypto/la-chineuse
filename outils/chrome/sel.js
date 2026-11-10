// Collecte Selency — à exécuter dans un onglet www.selency.fr
window.__job = { site: 'sel', phase: 'recherche', done: 0, total: 0, err: [], out: null };
(async () => {
  const J = window.__job;
  const TY = { buffet: /buffet|bahut|sideboard/i, enfilade: /enfilade/i, commode: /commode|chiffonnier|semainier/i, console: /console/i };
  const ST = { '60': /ann[ée]es?\s*(19)?[56]0\s*[-\/]?\s*60|ann[ée]es?\s*(19)?60|\b60'?s\b|\b196\d\b|sixties/i, '70': /ann[ée]es?\s*(19)?70|[\/-]\s*70\b|\b70'?s\b|\b197\d\b|seventies/i, '80': /ann[ée]es?\s*(19)?80|[\/-]\s*80\b|\b80'?s\b|\b198\d\b/i, sc: /scandinav|danois|danemark|teck|teak|su[ée]dois/i, fo: /formica/i };
  const CAT = { buffet: 'meuble-de-rangement/buffet', enfilade: 'meuble-de-rangement/enfilade', commode: 'meuble-de-rangement/commode', console: 'table/console' };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const lds = (h) => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);
  const links = new Set();
  for (const cat of Object.values(CAT)) for (const style of ['scandinave', 'vintage']) {
    try {
      const list = lds(await (await fetch('/c/meubles/' + cat + '?styleTitle=' + style)).text()).find(x => x['@type'] === 'ItemList');
      (list?.itemListElement || []).forEach(e => { const u = e.item?.url || e.url || e.item?.['@id']; if (u) { const p = new URL(u, location.origin).pathname; if (/^\/p\/[A-Z0-9]+\//.test(p)) links.add(p); } });
    } catch (e) { J.err.push(cat + ' ' + style + ' ' + e.message); }
    await sleep(800);
  }
  J.phase = 'détails'; J.total = links.size;
  const ads = [];
  const cm = (q) => q && q.value ? Math.round(q.value) : null;
  for (const p of links) {
    try {
      const prod = lds(await (await fetch(p)).text()).find(x => x['@type'] === 'Product');
      if (prod) {
        const title = String(prod.name || '').trim(), desc = String(prod.description || '').trim();
        const ty = Object.keys(TY).filter(k => TY[k].test(title + ' ' + (prod.category || '')));
        const of = [].concat(prod.offers || [])[0] || {};
        if (ty.length && /InStock/i.test(of.availability || 'InStock')) {
          const st = Object.keys(ST).filter(k => ST[k].test(title + ' ' + desc + ' ' + (prod.material || '')));
          const attrs = [];
          const L = cm(prod.width), H = cm(prod.height), P = cm(prod.depth);
          if (L || H || P) attrs.push(['Dimensions', [L && 'L ' + L, P && 'P ' + P, H && 'H ' + H].filter(Boolean).join(' × ') + ' cm']);
          if (prod.material) attrs.push(['Matière', String(prod.material)]);
          if (prod.color) attrs.push(['Couleur', String(prod.color)]);
          if (prod.brand && prod.brand.name && !/^selency$/i.test(prod.brand.name)) attrs.push(['Marque / designer', String(prod.brand.name)]);
          if (of.itemCondition) attrs.push(['État', /New/i.test(of.itemCondition) ? 'Neuf' : /Refurb/i.test(of.itemCondition) ? 'Restauré' : 'Occasion']);
          ads.push({ id: 'sel-' + (prod.sku || prod.productID || p.split('/')[2]), src: 'sel', url: 'https://www.selency.fr' + p, t: title, p: Math.round(Number(of.price) || 0), c: '', z: '', km: null, d: '', o: 'pro', seller: '', ty, st, imgs: [].concat(prod.image || []).map(String).slice(0, 12), desc: desc.slice(0, 4000), attrs, ship: 'Livraison en France' });
        }
      }
    } catch (e) { J.err.push(p + ' ' + e.message); }
    J.done++; await sleep(500);
  }
  J.out = ads; J.phase = 'fini';
})();
'lancé'
