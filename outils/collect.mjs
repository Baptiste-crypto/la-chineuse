// Collecte Leboncoin → donnees.json (annonces + vignettes). Usage : node outils/collect.mjs donnees.json
import { writeFileSync, appendFileSync } from 'fs';
import sharp from 'sharp';

const OUT = process.argv[2] || 'donnees.json';
const TYPES = ['buffet', 'enfilade', 'commode', 'console'];
const STYLES = ['années 60', 'années 70', 'années 80', 'scandinave', 'formica'];
const LOC = 'Bordeaux__44.837789_-0.57918_10000_30000';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const MIN_ADS = 30; // en dessous, on considère la collecte comme bloquée et on ne remplace pas les annonces

const TY = { buffet: /buffet|bahut/i, enfilade: /enfilade/i, commode: /commode|chiffonnier/i, console: /console/i };
const ST = { '60': /ann[ée]es?\s*(19)?[56]0\s*[-\/]?\s*60|ann[ée]es?\s*(19)?60|\b60'?s\b|\b196\d\b|sixties/i, '70': /ann[ée]es?\s*(19)?70|[\/-]\s*70\b|\b70'?s\b|\b197\d\b|seventies/i, '80': /ann[ée]es?\s*(19)?80|[\/-]\s*80\b|\b80'?s\b|\b198\d\b/i, sc: /scandinav|danois|teck|teak|su[ée]dois/i, fo: /formica/i };
const QS = { 'années 60': '60', 'années 70': '70', 'années 80': '80', scandinave: 'sc', formica: 'fo' };
const R = Math.PI / 180;
const km = (la, lo) => { if (la == null || lo == null) return null; const dLa = (la - 44.837789) * R, dLo = (lo + 0.57918) * R; const x = Math.sin(dLa / 2) ** 2 + Math.cos(44.837789 * R) * Math.cos(la * R) * Math.sin(dLo / 2) ** 2; return Math.round(12742 * Math.asin(Math.sqrt(x))); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const summary = (s) => { console.log(s); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + '\n'); };

const raw = {};
for (const t of TYPES) for (const s of STYLES) {
  const q = t + ' ' + s;
  const url = 'https://www.leboncoin.fr/recherche?category=19&text=' + encodeURIComponent(q) + '&locations=' + LOC + '&sort=time&order=desc';
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'fr-FR,fr;q=0.9', accept: 'text/html' } });
    const html = await r.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    const sd = m ? JSON.parse(m[1]).props?.pageProps?.searchData : null;
    if (!sd) { log.push(`${q} : bloqué (HTTP ${r.status}${/captcha|datadome/i.test(html) ? ', anti-robot' : ''})`); }
    else {
      (sd.ads || []).forEach((a) => { const e = raw[a.list_id] || (raw[a.list_id] = { a, q: [] }); e.q.push(q); });
      log.push(`${q} : ${(sd.ads || []).length}`);
    }
  } catch (e) { log.push(`${q} : erreur ${e.message}`); }
  await sleep(1500);
}

const ads = [];
for (const { a, q } of Object.values(raw)) {
  const title = (a.subject || '').trim();
  const ty = Object.keys(TY).filter((k) => TY[k].test(title));
  if (!ty.length || !Number.isInteger(a.list_id)) continue;
  let st = Object.keys(ST).filter((k) => ST[k].test(title + ' ' + (a.body || '').slice(0, 400)));
  if (!st.length) st = [...new Set(q.map((x) => QS[x.split(' ').slice(1).join(' ')]))];
  ads.push({ id: a.list_id, t: title, p: a.price ? a.price[0] : 0, c: a.location?.city || '', km: km(a.location?.lat, a.location?.lng), d: (a.first_publication_date || '').slice(0, 10), o: a.owner?.type === 'pro' ? 'pro' : 'part', ty, st, img: a.images?.small_url || a.images?.thumb_url || '' });
}

let ok = 0;
for (let i = 0; i < ads.length; i += 6) {
  await Promise.all(ads.slice(i, i + 6).map(async (ad) => {
    if (!/^https:\/\/img\.leboncoin\.fr\//.test(ad.img)) { ad.img = ''; return; }
    try {
      const r = await fetch(ad.img, { headers: { 'user-agent': UA } });
      if (!r.ok) throw new Error(r.status);
      const buf = await sharp(Buffer.from(await r.arrayBuffer())).resize(200, 200, { fit: 'cover' }).webp({ quality: 60 }).toBuffer();
      ad.img = 'data:image/webp;base64,' + buf.toString('base64'); ok++;
    } catch { ad.img = ''; }
  }));
}

summary('## Collecte Leboncoin\n\n' + log.map((l) => '- ' + l).join('\n') + `\n\n**${ads.length} annonces retenues, ${ok} photos.**`);
if (ads.length < MIN_ADS) { summary(`\nMoins de ${MIN_ADS} annonces : collecte considérée comme bloquée, l'appli garde les annonces précédentes.`); process.exit(2); }
const paris = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
writeFileSync(OUT, JSON.stringify({ collected: paris, ads }));
