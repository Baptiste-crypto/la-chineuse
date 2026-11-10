// Avancement de la collecte en cours dans l'onglet
(() => { const J = window.__job; return J ? J.site + ' : ' + J.phase + ' ' + J.done + '/' + J.total + ' (erreurs : ' + J.err.length + ')' + (J.out ? ', ' + J.out.length + ' annonces' : '') : 'aucune collecte dans cet onglet'; })()
