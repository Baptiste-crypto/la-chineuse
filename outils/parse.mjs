// Lit les pages de recherche Leboncoin envoyées par le raccourci iPhone → donnees.json
// Usage : node outils/parse.mjs dossier_des_pages donnees.json
import { readdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

export const QUERIES = ['buffet', 'enfilade', 'commode', 'console'].flatMap((t) => ['années 60', 'années 70', 'années 80', 'scandinave', 'formica'].map((s) => t + ' ' + s));
const [dir, out] = process.argv.slice(2);
const MIN_ADS = 30;
const TY = { buffet: /buffet|bahut/i, enfilade: /enfilade/i, commode: /commode|chiffonnier/i, console: /console/i };
const ST = { '60': /ann[ée]es?\s*(19)?[56]0\s*[-\/]?\s*60|ann[ée]es?\s*(19)?60|\b60'?s\b|\b196\d\b|sixties/i, '70': /ann[ée]es?\s*(19)?70|[\/-]\s*70\b|\b70'?s\b|\b197\d\b|seventies/i, '80': /ann[ée]es?\s*(19)?80|[\/-]\s*80\b|\b80'?s\b|\b198\d\b/i, sc: /scandinav|danois|teck|teak|su[ée]dois/i, fo: /formica/i };
const QS = { 'années 60': '60', 'années 70': '70', 'années 80': '80', scandinave: 'sc', formica: 'fo' };
const R = Math.PI / 180;
const km = (la, lo) => { if (la == null || lo == null) return null; const dLa = (la - 44.837789) * R, dLo = (lo + 0.57918) * R; const x = Math.sin(dLa / 2) ** 2 + Math.cos(44.837789 * R) * Math.cos(la * R) * Math.sin(dLo / 2) ** 2; return Math.round(12742 * Math.asin(Math.sqrt(x))); };
const summary = (s) => { console.log(s); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + '\n'); };

// fichiers « <lot>-<n>.html » : on garde le lot le plus récent
const files = readdirSync(dir).map((f) => f.match(/^(\d+)-(\d+)\.html$/)).filter(Boolean);
const lot = files.map((m) => m[1]).sort().pop();
const log = [], raw = {};
for (const m of files.filter((m) => m[1] === lot).sort((a, b) => a[2] - b[2])) {
  const q = QUERIES[parseInt(m[2], 10) - 1];
  if (!q) continue;
  const html = readFileSync(join(dir, m[0]), 'utf8');
  const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  let sd = null; try { sd = nd ? JSON.parse(nd[1]).props?.pageProps?.searchData : null; } catch {}
  if (!sd) { log.push(`${q} : page illisible${/captcha|datadome/i.test(html) ? ' (anti-robot)' : ''}`); continue; }
  (sd.ads || []).forEach((a) => { const e = raw[a.list_id] || (raw[a.list_id] = { a, q: [] }); e.q.push(q); });
  log.push(`${q} : ${(sd.ads || []).length}`);
}
const ads = [];
for (const { a, q } of Object.values(raw)) {
  const title = (a.subject || '').trim();
  const ty = Object.keys(TY).filter((k) => TY[k].test(title));
  if (!ty.length || !Number.isInteger(a.list_id)) continue;
  let st = Object.keys(ST).filter((k) => ST[k].test(title + ' ' + (a.body || '').slice(0, 400)));
  if (!st.length) st = [...new Set(q.map((x) => QS[x.split(' ').slice(1).join(' ')]))];
  const img = a.images?.small_url || a.images?.thumb_url || '';
  ads.push({ id: a.list_id, t: title, p: a.price ? a.price[0] : 0, c: a.location?.city || '', km: km(a.location?.lat, a.location?.lng), d: (a.first_publication_date || '').slice(0, 10), o: a.owner?.type === 'pro' ? 'pro' : 'part', ty, st, img: /^https:\/\/img\.leboncoin\.fr\/[^"'<>\s]+$/.test(img) ? img : '' });
}
summary(`## Pages reçues de l'iPhone (lot ${lot || 'aucun'})\n\n` + log.map((l) => '- ' + l).join('\n') + `\n\n**${ads.length} annonces retenues.**`);
if (ads.length < MIN_ADS) { summary(`\nMoins de ${MIN_ADS} annonces : l'appli garde les annonces précédentes.`); process.exit(2); }
writeFileSync(out, JSON.stringify({ collected: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }), ads }));
