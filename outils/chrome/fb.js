// Collecte Facebook Marketplace — à exécuter dans un onglet facebook.com connecté (rayon = réglage Marketplace du compte)
window.__job = { site: 'fb', phase: 'recherche', done: 0, total: 0, err: [], out: null };
(async () => {
  const J = window.__job;
  const TY = { buffet: /buffet|bahut/i, enfilade: /enfilade/i, commode: /commode|chiffonnier|semainier/i, console: /console/i };
  const ST = { '60': /ann[ée]es?\s*(19)?[56]0\s*[-\/]?\s*60|ann[ée]es?\s*(19)?60|\b60'?s\b|\b196\d\b|sixties/i, '70': /ann[ée]es?\s*(19)?70|[\/-]\s*70\b|\b70'?s\b|\b197\d\b|seventies/i, '80': /ann[ée]es?\s*(19)?80|[\/-]\s*80\b|\b80'?s\b|\b198\d\b/i, sc: /scandinav|danois|teck|teak|su[ée]dois/i, fo: /formica/i };
  const QS = { 'années 60': '60', 'années 70': '70', 'années 80': '80', scandinave: 'sc', formica: 'fo' };
  const R = Math.PI / 180, km = (la, lo) => { if (la == null || lo == null || isNaN(la)) return null; const dLa = (la - 44.837789) * R, dLo = (lo + 0.57918) * R; const x = Math.sin(dLa / 2) ** 2 + Math.cos(44.837789 * R) * Math.cos(la * R) * Math.sin(dLo / 2) ** 2; return Math.round(12742 * Math.asin(Math.sqrt(x))); };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const get = async (u) => (await fetch(u, { credentials: 'include', headers: { accept: 'text/html' } })).text();
  const js = (s) => { try { return JSON.parse('"' + s + '"'); } catch { return s; } };
  const S = '((?:[^"\\\\]|\\\\.)*)';
  const pick = (seg, re) => { const m = seg.match(re); return m ? js(m[1]) : ''; };
  const found = new Map();
  for (const t of Object.keys(TY)) for (const s of Object.keys(QS)) {
    const q = t + ' ' + s;
    try {
      const h = await get('/marketplace/bordeaux/search/?query=' + encodeURIComponent(q) + '&sortBy=creation_time_descend&exact=false');
      for (const m of h.matchAll(/"listing":\{"__typename":"GroupCommerceProductItem","id":"(\d+)"/g)) {
        const seg = h.slice(m.index, m.index + 5000);
        const title = pick(seg, new RegExp('"marketplace_listing_title":"' + S + '"'));
        if (!title || !Object.keys(TY).some(k => TY[k].test(title)) || /"is_sold":true/.test(seg)) continue;
        const e = found.get(m[1]) || { id: m[1], title, q: [], price: parseFloat(pick(seg, /"listing_price":\{[^}]*?"amount":"([\d.]+)"/)) || 0, city: pick(seg, new RegExp('"reverse_geocode":\\{"city":"' + S + '"')) };
        e.q.push(q); found.set(m[1], e);
      }
    } catch (e) { J.err.push(q + ' ' + e.message); }
    await sleep(1200);
  }
  J.phase = 'détails'; J.total = found.size;
  const ads = [];
  for (const e of found.values()) {
    try {
      const h = await get('/marketplace/item/' + e.id + '/');
      const ti = h.indexOf('"marketplace_listing_title"');
      const near = ti >= 0 ? h.slice(Math.max(0, ti - 8000), ti + 12000) : '';
      const desc = pick(near, new RegExp('"redacted_description":\\{"text":"' + S + '"'));
      const loc = pick(near, new RegExp('"location_text":\\{"text":"' + S + '"'));
      const lat = parseFloat((near.match(/"latitude":([\d.-]+)/) || [])[1]), lng = parseFloat((near.match(/"longitude":([\d.-]+)/) || [])[1]);
      const ct = parseInt((near.match(/"creation_time":(\d+)/) || [])[1], 10);
      const ship = /"is_shipping_offered":true/.test(near);
      const cond = pick(near, new RegExp('"attribute_name":"(?:\\\\u00c9|É)tat","value":"[^"]*","label":"' + S + '"'));
      const pi = h.indexOf('"listing_photos":[');
      const pseg = pi >= 0 ? h.slice(pi, pi + 30000) : '';
      const pend = pseg.indexOf(']}') > 0 ? pseg.indexOf(']}') : pseg.length;
      const imgs = []; const seen = new Set();
      for (const m of pseg.slice(0, pend).matchAll(/"image":\{[^}]*?"uri":"((?:[^"\\]|\\.)*)"/g)) { const u = js(m[1]); const k = u.split('?')[0].split('/').pop(); if (/^https:\/\/[a-z0-9.-]*(fbcdn\.net|scontent[a-z0-9.-]*)\//.test(u) && !seen.has(k)) { seen.add(k); imgs.push(u); } }
      const title = e.title, txt = title + ' ' + desc;
      let st = Object.keys(ST).filter(k => ST[k].test(txt)); if (!st.length) st = [...new Set(e.q.map(x => QS[x.split(' ').slice(1).join(' ')]))];
      const attrs = []; if (cond) attrs.push(['État', cond]);
      ads.push({ id: 'fb-' + e.id, src: 'fb', url: 'https://www.facebook.com/marketplace/item/' + e.id + '/', t: title, p: Math.round(e.price), c: (loc || e.city || '').replace(/, NAQ$/, ''), z: '', km: km(lat, lng), d: ct ? new Date(ct * 1000).toISOString().slice(0, 10) : '', o: 'part', seller: '', ty: Object.keys(TY).filter(k => TY[k].test(title)), st, imgs: imgs.slice(0, 12), desc: desc.slice(0, 4000), attrs, ship: ship ? 'Livraison possible' : 'Remise en main propre' });
    } catch (err) { J.err.push(e.id + ' ' + err.message); }
    J.done++; await sleep(1500);
  }
  J.out = ads; J.phase = 'fini';
})();
'lancé'
