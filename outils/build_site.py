# usage: python3 build_site.py keys.json outdir — assemble index.html (coquille + déverrouillage), sans les annonces
import re,sys,json
keys=json.load(open(sys.argv[1])); out=sys.argv[2]
pubkeys={k:keys[k] for k in ('v','iter','salt','iv','priv')}
t=open('app.tpl.html').read()
style=re.search(r'<style>(.*?)</style>',t,re.S).group(1)
body=re.search(r'(<div class="wrap">.*?</div>)\s*<script type="application/json"',t,re.S).group(1)
js=re.findall(r'<script>(.*?)</script>',t,re.S)[-1]
a='const RAW = JSON.parse(document.getElementById("data").textContent);\n'
assert a in js; js=js.replace(a,'')
lock_css='''
.lock { max-width: 420px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 18vh 40px; display: flex; flex-direction: column; gap: 14px; }
.lock h1 { font-family: var(--font-display); font-weight: 400; font-size: 2.3rem; margin: 0; }
.lock h1 span { color: var(--teak); }
.lock p { margin: 0; color: var(--muted); }
.lock form { display: flex; flex-direction: column; gap: 12px; }
.lock input { font: inherit; color: var(--fg); background: var(--surface); border: 1.5px solid var(--line); border-radius: 10px; min-height: 48px; padding: 0 12px; width: 100%; }
.lock button { font: inherit; font-weight: 700; min-height: 48px; border-radius: 10px; border: 0; background: var(--accent); color: var(--accent-fg); cursor: pointer; }
.lock .err { color: var(--teak); font-weight: 700; min-height: 1.4em; }
'''
html=f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="La Chineuse">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#EEF4F1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1E1B" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-180.png">
<title>La Chineuse</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Righteous&display=swap">
<style>
html {{ padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }}
body {{ margin: 0; }}
img {{ max-width: 100%; }}
[hidden] {{ display: none !important; }}
{style}{lock_css}</style>
</head>
<body>
<div class="lock" id="lock" hidden>
  <h1>La <span>Chineuse</span></h1>
  <p id="lockMsg">Entrez le mot de passe pour voir les annonces. Il ne sera demandé qu'une fois sur ce téléphone.</p>
  <form id="lockForm">
    <input type="password" id="pw" autocomplete="current-password" aria-label="Mot de passe" placeholder="Mot de passe" required>
    <button type="submit" id="unlock">Ouvrir</button>
  </form>
  <p class="err" id="lockErr" role="alert"></p>
</div>
<div id="app" hidden>
{body}
</div>
<script>
const KEYS = {json.dumps(pubkeys)};
function startApp(RAW) {{
{js}
}}
(function () {{
  const $ = (id) => document.getElementById(id);
  const ub = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const idb = (mode, fn) => new Promise((res, rej) => {{
    let rq; try {{ rq = indexedDB.open("chineuse", 1); }} catch (e) {{ return rej(e); }}
    rq.onupgradeneeded = () => rq.result.createObjectStore("k");
    rq.onerror = () => rej(rq.error);
    rq.onsuccess = () => {{ const tx = rq.result.transaction("k", mode); const r = fn(tx.objectStore("k")); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error); }};
  }});
  const loadKey = () => idb("readonly", (s) => s.get("priv")).catch(() => null);
  const saveKey = (k) => idb("readwrite", (s) => s.put(k, "priv")).catch(() => null);
  const dropKey = () => idb("readwrite", (s) => s.delete("priv")).catch(() => null);
  let enc = null;
  const getEnc = async () => enc || (enc = await (await fetch("data.enc.json", {{ cache: "no-cache" }})).json());
  async function open(priv) {{
    const e = await getEnc();
    const raw = await crypto.subtle.decrypt({{ name: "RSA-OAEP" }}, priv, ub(e.ek));
    const aes = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({{ name: "AES-GCM", iv: ub(e.iv) }}, aes, ub(e.ct));
    return JSON.parse(new TextDecoder().decode(plain));
  }}
  function show(data) {{ $("lock").hidden = true; $("app").hidden = false; startApp(data); }}
  async function unlockWith(pw) {{
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    const kek = await crypto.subtle.deriveKey({{ name: "PBKDF2", salt: ub(KEYS.salt), iterations: KEYS.iter, hash: "SHA-256" }}, base, {{ name: "AES-GCM", length: 256 }}, false, ["decrypt"]);
    const pkcs8 = await crypto.subtle.decrypt({{ name: "AES-GCM", iv: ub(KEYS.iv) }}, kek, ub(KEYS.priv));
    return crypto.subtle.importKey("pkcs8", pkcs8, {{ name: "RSA-OAEP", hash: "SHA-256" }}, false, ["decrypt"]);
  }}
  $("lockForm").addEventListener("submit", async (ev) => {{
    ev.preventDefault();
    const err = $("lockErr"); err.textContent = ""; $("unlock").disabled = true;
    let priv = null;
    try {{ priv = await unlockWith($("pw").value); }} catch (e) {{ err.textContent = "Mot de passe incorrect. Vérifiez les majuscules et réessayez."; }}
    if (priv) {{
      try {{ const data = await open(priv); await saveKey(priv); $("pw").value = ""; show(data); }}
      catch (e) {{ err.textContent = "Les annonces n'ont pas pu être chargées. Vérifiez la connexion et réessayez."; }}
    }}
    $("unlock").disabled = false;
  }});
  (async () => {{
    if (!window.crypto || !crypto.subtle) {{ $("lock").hidden = false; $("lockForm").hidden = true; $("lockMsg").textContent = "Ce navigateur est trop ancien pour ouvrir La Chineuse. Mettez à jour iOS ou utilisez Safari."; return; }}
    const saved = await loadKey();
    if (saved) {{ try {{ show(await open(saved)); return; }} catch (e) {{ if (e && e.name === "OperationError") await dropKey(); else {{ $("lock").hidden = false; $("lockForm").hidden = true; $("lockMsg").textContent = "Les annonces n'ont pas pu être chargées. Vérifiez la connexion, puis rouvrez l'appli."; return; }} }} }}
    $("lock").hidden = false;
  }})();
}})();
</script>
</body>
</html>
'''
open(out+'/index.html','w').write(html)
json.dump({"name":"La Chineuse","short_name":"La Chineuse","start_url":"./","scope":"./","display":"standalone","background_color":"#EEF4F1","theme_color":"#EEF4F1","lang":"fr","icons":[{"src":"icon-180.png","sizes":"180x180","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png"}]},open(out+'/manifest.webmanifest','w'),ensure_ascii=False)
print('index ok',len(html)//1024,'ko')
