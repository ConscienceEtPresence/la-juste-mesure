/* ============================================================
   La juste mesure — Les aliments (dictionnaire piloté par JSON)
   Liste avec recherche instantanée + fiche détaillée (aliment/?id=).
   ============================================================ */
(() => {
  const ROOT = new URL('../../', import.meta.url).href;
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const fold = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

  const listeEl = document.getElementById('aliments-liste');
  const ficheEl = document.getElementById('aliment-mount');

  fetch(ROOT + 'data/aliments.json').then(r => r.json()).then(data => {
    const aliments = (data.aliments || []).slice().sort((a,b) => a.nom.localeCompare(b.nom, 'fr'));

    if (listeEl) {
      const carte = a => `
        <a href="aliment/?id=${esc(a.id)}" class="aliment-carte" data-search="${esc(fold(a.nom + ' ' + (a.tag||'') + ' ' + (a.vitamines||[]).join(' ')))}">
          <span class="aliment-carte__tag">${esc(a.tag||'')}</span>
          <h2 class="aliment-carte__nom">${esc(a.nom)}</h2>
          <p class="aliment-carte__resume">${esc(a.resume||'')}</p>
          ${(a.vitamines||[]).length ? `<div class="puces">${a.vitamines.slice(0,3).map(v=>`<span class="puce puce--vit">${esc(v)}</span>`).join('')}</div>` : ''}
        </a>`;
      listeEl.innerHTML = `<div class="aliment-liste">${aliments.map(carte).join('')}</div>`;

      const search = document.getElementById('aliments-search');
      if (search) {
        search.addEventListener('input', () => {
          const q = fold(search.value.trim());
          let n = 0;
          listeEl.querySelectorAll('.aliment-carte').forEach(c => {
            const ok = !q || c.dataset.search.includes(q);
            c.style.display = ok ? '' : 'none';
            if (ok) n++;
          });
          const vide = document.getElementById('aliments-vide');
          if (vide) vide.hidden = n > 0;
        });
      }
    }

    if (ficheEl) {
      const id = new URLSearchParams(location.search).get('id');
      const a = aliments.find(x => x.id === id);
      if (!a) { ficheEl.innerHTML = `<p class="carnet-loading">Cet aliment n'est pas (encore) au dictionnaire. <a href="../">Retour aux aliments</a></p>`; return; }
      document.title = a.nom + ' — La juste mesure';
      const tags = (arr, cls) => (arr&&arr.length) ? `<div class="puces">${arr.map(x=>`<span class="puce ${cls}">${esc(x)}</span>`).join('')}</div>` : '';
      const reperes = (a.reperes&&a.reperes.length) ? `
        <div class="reperes">${a.reperes.map(r=>`<div class="repere"><span class="repere__k">${esc(r.k)}</span><span class="repere__v">${esc(r.v)}</span></div>`).join('')}</div>` : '';
      ficheEl.innerHTML = `
        <article class="fiche aliment-fiche">
          <p class="fiche__tag">${esc(a.tag||'')}</p>
          <h1 class="fiche__titre">${esc(a.nom)}</h1>
          ${a.resume ? `<p class="fiche__sous">${esc(a.resume)}</p>` : ''}
          ${reperes}
          ${(a.vitamines&&a.vitamines.length) ? `<p class="reperes__label">Vitamines</p>${tags(a.vitamines,'puce--vit')}` : ''}
          ${(a.mineraux&&a.mineraux.length) ? `<p class="reperes__label">Minéraux</p>${tags(a.mineraux,'puce--min')}` : ''}
          ${(a.blocs||[]).map(b=>`<section class="fiche-bloc"><h2 class="fiche-bloc__titre">${esc(b.titre)}</h2><p>${esc(b.texte)}</p></section>`).join('')}
          ${a.note ? `<p class="aliment-note">« ${esc(a.note)} »</p>` : ''}
          <p class="fiche__retour"><a href="../">← Tous les aliments</a></p>
        </article>`;
    }
  }).catch(e => {
    const t = listeEl || ficheEl;
    if (t) t.innerHTML = `<p class="carnet-erreur">Désolé, le dictionnaire n'a pas pu se charger.</p>`;
    console.error(e);
  });
})();
