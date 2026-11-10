# Collecte quotidienne de La Chineuse

1. Si `derniere-collecte.txt` contient la date du jour (heure de Paris), ne rien faire.
2. Dans Chrome (Claude in Chrome), un onglet par site, chacun sur la page indiquée :
   - `lbc.js` → https://www.leboncoin.fr/recherche?category=19&text=buffet&locations=Bordeaux__44.837789_-0.57918_10000_30000
   - `fb.js`  → https://www.facebook.com/marketplace/bordeaux/search?query=buffet
   - `sel.js` → https://www.selency.fr/c/meubles/meuble-de-rangement/buffet
   - `emm.js` → https://www.label-emmaus.co/fr/catalogue/?q=buffet
   Exécuter le contenu du script (javascript_tool), suivre avec `etat.js` jusqu'à « fini », puis `export.js`
   (télécharge `chineuse-<site>.json` dans ~/Downloads).
3. Récupérer les fichiers de ~/Downloads, lancer `outils/publier.sh <dossier>`.
4. Leboncoin est obligatoire (≥ 30 annonces). Les autres sites sont facultatifs : s'ils échouent, on publie sans eux.
