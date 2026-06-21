/* ============================================================
   La juste mesure — Comprendre (module piloté par JSON)
   Un seul script pour la liste (index) et la fiche (notion/?id=).
   ============================================================ */
(() => {
  const ROOT = new URL('../../', import.meta.url).href;
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const liste = document.getElementById('comprendre-liste');
  const fiche = document.getElementById('notion-mount');

  fetch(ROOT + 'data/comprendre.json').then(r => r.json()).then(data => {
    const notions = data.notions || [];

    if (liste) {
      liste.innerHTML = `<div class="notion-liste">${notions.map(n => `
        <a href="notion/?id=${esc(n.id)}" class="notion-carte">
          <span class="notion-carte__tag">${esc(n.tag || '')}</span>
          <h2 class="notion-carte__titre">${esc(n.titre)}</h2>
          <p class="notion-carte__sous">${esc(n.sous_titre || '')}</p>
          <span class="notion-carte__fleche">Lire →</span>
        </a>`).join('')}</div>`;
    }

    if (fiche) {
      const id = new URLSearchParams(location.search).get('id');
      const n = notions.find(x => x.id === id);
      if (!n) {
        fiche.innerHTML = `<p class="carnet-loading">Cette fiche n'existe pas (encore). <a href="../">Retour à Comprendre</a></p>`;
        return;
      }
      document.title = n.titre + ' — La juste mesure';
      fiche.innerHTML = `
        <article class="fiche">
          <p class="fiche__tag">${esc(n.tag || '')}</p>
          <h1 class="fiche__titre">${esc(n.titre)}</h1>
          ${n.sous_titre ? `<p class="fiche__sous">${esc(n.sous_titre)}</p>` : ''}
          ${n.intro ? `<p class="fiche__intro">${esc(n.intro)}</p>` : ''}
          ${(n.blocs || []).map(b => `
            <section class="fiche-bloc">
              <h2 class="fiche-bloc__titre">${esc(b.titre)}</h2>
              <p>${esc(b.texte)}</p>
            </section>`).join('')}
          ${n.source ? `<p class="fiche__source">${esc(n.source)}</p>` : ''}
          <p class="fiche__retour"><a href="../">← Toutes les notions</a></p>
        </article>`;
    }
  }).catch(e => {
    const t = liste || fiche;
    if (t) t.innerHTML = `<p class="carnet-erreur">Désolé, le contenu n'a pas pu se charger.</p>`;
    console.error(e);
  });
})();
