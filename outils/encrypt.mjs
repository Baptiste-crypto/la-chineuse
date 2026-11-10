// usage: node encrypt.mjs keys.json donnees.json out.json  — chiffre les annonces avec la clé publique (aucun secret requis)
import { readFileSync, writeFileSync } from 'fs';
import { webcrypto as c } from 'crypto';
const [keysF, dataF, outF] = process.argv.slice(2);
const keys = JSON.parse(readFileSync(keysF, 'utf8'));
const d = JSON.parse(readFileSync(dataF, 'utf8'));
const IMG = /^https:\/\/(img\.leboncoin\.fr|images\.selency\.com|www\.label-emmaus\.co|[a-z0-9.-]*fbcdn\.net)\/[^"'<>\s]+$/;
const ads = d.ads.filter(a => Number.isInteger(a.id) || /^(lbc|sel|emm|fb)-[\w-]+$/.test(String(a.id))).map(a => ({ ...a, img: undefined, imgs: (a.imgs || (a.img ? [a.img] : [])).filter(u => IMG.test(u) || /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(u)) }));
const plain = new TextEncoder().encode(JSON.stringify({ collected: d.collected, ads }));
const pub = await c.subtle.importKey('spki', Buffer.from(keys.pub, 'base64'), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
const aes = await c.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
const iv = c.getRandomValues(new Uint8Array(12));
const ct = await c.subtle.encrypt({ name: 'AES-GCM', iv }, aes, plain);
const ek = await c.subtle.encrypt({ name: 'RSA-OAEP' }, pub, await c.subtle.exportKey('raw', aes));
const b = (x) => Buffer.from(x).toString('base64');
writeFileSync(outF, JSON.stringify({ v: 1, ek: b(ek), iv: b(iv), ct: b(ct) }));
console.log(ads.length, 'annonces chiffrées,', Math.round(ct.byteLength / 1024), 'ko');
