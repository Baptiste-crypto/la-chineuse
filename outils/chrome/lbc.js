// Collecte Leboncoin — à exécuter dans un onglet www.leboncoin.fr (rayon 30 km autour de Bordeaux)
window.__job = { site: 'lbc', phase: 'recherche', done: 0, total: 0, err: [], out: null };
(async () => {
  const J = window.__job;
  const TY = { buffet: /buffet|bahut/i, enfilade: /enfilade/i, commode: /commode|chiffonnier/i, console: /console/i };
  const ST = { '60': /ann[ée]es?\s*(19)?[56]0\s*[-\/]?\s*60|ann[ée]es?\s*(19)?60|\b60'?s\b|\b196\d\b|sixties/i, '70': /ann[ée]es?\s*(19)?70|[\/-]\s*70\b|\b70'?s\b|\b197\d\b|seventies/i, '80': /ann[ée]es?\s*(19)?80|[\/-]\s*80\b|\b80'?s\b|\b198\d\b/i, sc: /scandinav|danois|teck|teak|su[ée]dois/i, fo: /formica/i };
  const QS = { 'années 60': '60', 'années 70': '70', 'années 80': '80', scandinave: 'sc', formica: 'fo' };
  const R = Math.PI / 180, km = (la, lo) => { if (la == null || lo == null) return null; const dLa = (la - 44.837789) * R, dLo = (lo + 0.57918) * R; const x = Math.sin(dLa / 2) ** 2 + Math.cos(44.837789 * R) * Math.cos(la * R) * Math.sin(dLo / 2) ** 2; return Math.round(12742 * Math.asin(Math.sqrt(x))); };
  const nd = (html) => { const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/); return m ? JSON.parse(m[1]).props?.pageProps : null; };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const raw = {};
  for (const t of ['buffet', 'enfilade', 'commode', 'console']) for (const s of Object.keys(QS)) {
    const q = t + ' ' + s;
    try { const pp = nd(await (await fetch('/recherche?category=19&text=' + encodeURIComponent(q) + '&locations=Bordeaux__44.837789_-0.57918_10000_30000&sort=time&order=desc')).text()); if (!pp) J.err.push(q + ' : page illisible'); (pp?.searchData?.ads || []).forEach(a => { (raw[a.list_id] = raw[a.list_id] || { a, q: [] }).q.push(q); }); } catch (e) { J.err.push(q + ' ' + e.message); }
    await sleep(900);
  }
  const keep = Object.values(raw).filter(({ a }) => Object.keys(TY).some(k => TY[k].test(a.subject || '')));
  J.phase = 'détails'; J.total = keep.length;
  const ads = [];
  for (const { a: s, q } of keep) {
    let a = s;
    try { const pp = nd(await (await fetch(new URL(s.url).pathname)).text()); if (pp?.ad) a = pp.ad; } catch (e) { J.err.push(s.list_id + ' ' + e.message); }
    const title = (a.subject || '').trim(), desc = (a.body || '').trim();
    let st = Object.keys(ST).filter(k => ST[k].test(title + ' ' + desc)); if (!st.length) st = [...new Set(q.map(x => QS[x.split(' ').slice(1).join(' ')]))];
    const attrs = (a.attributes || []).filter(x => x.key_label && (x.value_label || x.value) && !/pièces détachées/i.test(x.key_label)).map(x => [x.key_label, String(x.value_label || x.value)]);
    const shippable = (a.attributes || []).some(x => x.key === 'shippable' && x.value === 'true');
    ads.push({ id: 'lbc-' + a.list_id, src: 'lbc', url: a.url, t: title, p: a.price ? a.price[0] : 0, c: a.location?.city || '', z: a.location?.zipcode || '', km: km(a.location?.lat, a.location?.lng), d: (a.first_publication_date || '').slice(0, 10), o: a.owner?.type === 'pro' ? 'pro' : 'part', seller: a.owner?.type === 'pro' ? (a.owner?.name || '') : '', ty: Object.keys(TY).filter(k => TY[k].test(title)), st, imgs: (a.images?.urls_large || a.images?.urls || []).slice(0, 12), desc: desc.slice(0, 4000), attrs, ship: shippable ? 'Livraison possible' : 'Remise en main propre' });
    J.done++; await sleep(700);
  }
  J.out = ads; J.phase = 'fini';
})();
'lancé'
