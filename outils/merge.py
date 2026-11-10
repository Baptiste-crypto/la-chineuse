# Fusionne les fichiers collectés dans Chrome (chineuse-*.json) → donnees.json
# Usage : python3 outils/merge.py donnees.json chineuse-lbc.json chineuse-sel.json chineuse-emm.json
import json, sys, re, html, datetime
from zoneinfo import ZoneInfo
ST = {'60': r"ann[ée]es?\s*(19)?[56]0\s*[-/]?\s*60|ann[ée]es?\s*(19)?60|\b60'?s\b|\b196\d\b|sixties",
      '70': r"ann[ée]es?\s*(19)?70|[/-]\s*70\b|\b70'?s\b|\b197\d\b|seventies",
      '80': r"ann[ée]es?\s*(19)?80|[/-]\s*80\b|\b80'?s\b|\b198\d\b",
      'sc': r"scandinav|danois|danemark|teck|teak|su[ée]dois", 'fo': r"formica"}
LABELS = ['Couleur', 'Matière', 'État', 'Marque', 'Époque', 'Style']
out, seen, counts = [], set(), {}
for f in sys.argv[2:]:
    for a in json.load(open(f)):
        if a['src'] == 'emm':  # identifiant stable tiré de l'adresse de l'annonce
            m = re.search(r'-(\d{6,})/?$', a.get('url', ''))
            if m: a['id'] = 'emm-' + m.group(1)
        if a['id'] in seen: continue
        seen.add(a['id'])
        a['t'] = html.unescape(a.get('t', '')).strip()
        a['desc'] = html.unescape(a.get('desc', '')).strip()
        attrs = []
        for k, v in a.get('attrs', []):
            k, v = html.unescape(str(k)), re.sub(r'\s*\((Matériau|Couleur)\)', '', html.unescape(str(v))).strip()
            m = re.match(r'^(.*?) (%s) (.+)$' % '|'.join(LABELS), v)   # « 67.5 Couleur Orange » → deux lignes
            if m: attrs += [[k, m.group(1)], [m.group(2), m.group(3)]]
            else: attrs.append([k, v])
        a['attrs'] = [x for x in attrs if x[1]]
        if not a.get('st'):
            txt = a['t'] + ' ' + a['desc']
            a['st'] = [k for k, r in ST.items() if re.search(r, txt, re.I)]
        a['imgs'] = [u for u in a.get('imgs', []) if isinstance(u, str) and u.startswith('https://')][:12]
        if a['src'] == 'sel':  # photos Selency en 2000 px : on demande une taille adaptée au téléphone
            a['imgs'] = [u.split('?')[0] + '?width=900' for u in a['imgs']]
        out.append(a); counts[a['src']] = counts.get(a['src'], 0) + 1
today = datetime.datetime.now(ZoneInfo('Europe/Paris')).date().isoformat()
json.dump({'collected': today, 'ads': out}, open(sys.argv[1], 'w'), ensure_ascii=False)
print(len(out), 'annonces', counts)
