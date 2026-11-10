#!/usr/bin/env bash
# Fusionne les fichiers chineuse-*.json, chiffre, régénère l'appli et publie.
# Usage : outils/publier.sh DOSSIER_DES_JSON
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="$1"
TMP="$(mktemp -d)"
FILES=()
for s in lbc fb sel emm; do [ -s "$SRC/chineuse-$s.json" ] && FILES+=("$SRC/chineuse-$s.json"); done
[ -s "$SRC/chineuse-lbc.json" ] || { echo "ÉCHEC : pas de fichier Leboncoin"; exit 1; }
N_LBC=$(python3 -I -c "import json,sys; print(len(json.load(open(sys.argv[1]))))" "$SRC/chineuse-lbc.json")
[ "$N_LBC" -ge 30 ] || { echo "ÉCHEC : seulement $N_LBC annonces Leboncoin (blocage probable)"; exit 1; }
python3 -I outils/merge.py "$TMP/donnees.json" "${FILES[@]}"
node outils/encrypt.mjs outils/keys.json "$TMP/donnees.json" data.enc.json
cp outils/app.tpl.html app.tpl.html && python3 -I outils/build_site.py outils/keys.json . && rm app.tpl.html
TZ=Europe/Paris date +%F > derniere-collecte.txt
rm -rf "$TMP"
git add data.enc.json index.html manifest.webmanifest derniere-collecte.txt
git diff --cached --quiet && { echo "Rien de nouveau"; exit 0; }
git -c user.name="La Chineuse" -c user.email="noreply@anthropic.com" commit -q -m "Annonces du $(cat derniere-collecte.txt)"
git push -q origin main
echo "PUBLIÉ : $(cat derniere-collecte.txt)"
