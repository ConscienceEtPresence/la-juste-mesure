/* ============================================================
   La juste mesure — main.js
   Transversal : navigation mobile, mode nuit, graine du jour.
   Vanilla, sans dépendance. Chemins relatifs robustes.
   ============================================================ */
(() => {
  // Racine du site déduite de l'URL de ce script (assets/js/main.js)
  const SELF = document.currentScript ? document.currentScript.src : '';
  const ROOT = SELF.replace(/assets\/js\/main\.js.*$/, '');

  /* ---- Menu mobile ---- */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('header nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('is-open'));
  }

  /* ---- Mode nuit ---- */
  const KEY = 'ljm-theme';
  const root = document.documentElement;
  const saved = localStorage.getItem(KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) root.setAttribute('data-theme', 'dark');

  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.setAttribute('aria-label', 'Basculer le mode nuit');
  const paint = () => { btn.textContent = root.getAttribute('data-theme') === 'dark' ? '☀' : '☾'; };
  paint();
  btn.addEventListener('click', () => {
    const dark = root.getAttribute('data-theme') === 'dark';
    if (dark) { root.removeAttribute('data-theme'); localStorage.setItem(KEY, 'light'); }
    else { root.setAttribute('data-theme', 'dark'); localStorage.setItem(KEY, 'dark'); }
    paint();
  });
  document.body.appendChild(btn);

  /* ---- Graine du jour ---- */
  const mount = document.getElementById('graine-mount');
  if (mount) {
    const dayIndex = Math.floor(Date.now() / 86400000);
    fetch(ROOT + 'data/sagesses.json')
      .then(r => r.json())
      .then(d => {
        const items = (d && d.graines) || [];
        if (!items.length) { mount.remove(); return; }
        const g = items[((dayIndex % items.length) + items.length) % items.length];
        const tagClass = g.type === 'savoir' ? 'graine__tag--savoir' : 'graine__tag--sagesse';
        const tagLabel = g.type === 'savoir' ? 'Savoir' : 'Sagesse';
        mount.innerHTML = `
          <span class="graine__label">La graine du jour</span>
          <span class="graine__tag ${tagClass}">${tagLabel}</span>
          <p class="graine__texte">« ${esc(g.texte)} »</p>
          ${g.source ? `<p class="graine__source">${esc(g.source)}</p>` : ''}`;
      })
      .catch(() => mount.remove());
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
