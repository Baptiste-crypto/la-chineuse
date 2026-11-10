# La Chineuse

Appli web privée : annonces de meubles vintage autour de Bordeaux. Les annonces (`data.enc.json`) sont chiffrées ; elles ne s'ouvrent qu'avec le mot de passe.

Mise à jour des annonces (aucun mot de passe requis) :

    node outils/encrypt.mjs outils/keys.json donnees.json data.enc.json

`donnees.json` (annonces en clair) ne doit jamais être ajouté au dépôt.
