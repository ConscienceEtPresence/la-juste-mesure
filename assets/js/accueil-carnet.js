/* ============================================================
   La juste mesure — Panneau « mon carnet » sur l'accueil
   Si un carnet existe sur cet appareil, l'accueil montre tout de
   suite : les objectifs du jour (validables), le poids, la série.
   ============================================================ */
import { db } from './carnet/firebase-init.js';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs }
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const ROOT = new URL('../../', import.meta.url).href;
const mount = document.getElementById('accueil-carnet-mount');
const anonId = localStorage.getItem('ljm_carnet_id');
const prenom = localStorage.getItem('ljm_carnet_prenom') || '';
if (!mount || !anonId) { if (mount) mount.hidden = true; }

const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const keyOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const greet = () => { const h = new Date().getHours(); return (h < 5 || h >= 18) ? 'Bonsoir' : 'Bonjour'; };
function ring(done, total) {
  const r = 26, c = 2 * Math.PI * r, pct = total ? done / total : 0;
  return `<svg viewBox="0 0 64 64" class="ring" style="width:60px;height:60px"><circle cx="32" cy="32" r="${r}" class="ring__bg"/><circle cx="32" cy="32" r="${r}" class="ring__fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c*(1-pct)).toFixed(1)}" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" class="ring__txt" style="font-size:15px">${done}/${total}</text></svg>`;
}

async function run() {
  const date = keyOf(new Date());
  let appuis = [], valides = new Set(), appuiById = {};
  try {
    const [appuisData, profilSnap, jourSnap, joursSnap] = await Promise.all([
      fetch(ROOT + 'data/appuis.json').then(r => r.json()).catch(() => ({ themes: [] })),
      getDoc(doc(db, 'carnets_corps', anonId)).catch(() => null),
      getDoc(doc(db, 'carnets_corps', anonId, 'jours', date)).catch(() => null),
      getDocs(collection(db, 'carnets_corps', anonId, 'jours')).catch(() => ({ forEach(){} }))
    ]);
    for (const th of (appuisData.themes || [])) for (const a of (th.appuis || [])) appuiById[a.id] = { ...a, themeNom: th.nom };
    const profil = profilSnap && profilSnap.exists() ? profilSnap.data() : {};
    const jour = jourSnap && jourSnap.exists() ? jourSnap.data() : {};
    const matin = jour.matin || {};
    appuis = matin.appuis || [];
    valides = new Set(jour.valides || []);
    const aPose = !!matin.poseLe;

    const posedSet = new Set();
    joursSnap.forEach(s => { const d = s.data() || {}; if (d.matin && d.matin.poseLe) posedSet.add(s.id); });
    if (aPose) posedSet.add(date);
    let serie = 0; { let cur = new Date(); if (!posedSet.has(keyOf(cur))) cur.setDate(cur.getDate()-1); while (posedSet.has(keyOf(cur))) { serie++; cur.setDate(cur.getDate()-1); } }

    // Poids
    const dep = profil.poids_depart, obj = profil.objectif_poids;
    const act = (profil.poids_actuel != null) ? profil.poids_actuel : dep;
    const perdu = (dep != null && act != null) ? Math.round((dep-act)*10)/10 : null;
    const total = (dep != null && obj != null) ? (dep-obj) : null;
    const pct = (total && total > 0 && perdu != null) ? Math.max(0, Math.min(100, Math.round(perdu/total*100))) : 0;

    function cockpit() {
      if (!aPose) {
        return `<p style="color:var(--ink-soft);margin:.4rem 0 1rem;"><em>Tu n'as pas encore posé ta journée.</em></p>
          <a href="pages/carnet/poser/" class="btn btn--primary">Poser ma journée</a>`;
      }
      const done = appuis.filter(a => valides.has(a.id)).length;
      const items = appuis.map(a => {
        const meta = appuiById[a.id] || a; const on = valides.has(a.id);
        return `<button type="button" class="obj ${on?'is-done':''}" data-id="${esc(a.id)}"><span class="obj__check">${on?'✓':''}</span><span class="obj__txt"><span class="obj__theme">${esc(meta.themeNom||a.themeNom||'')}</span>${esc(a.libelle||meta.libelle)}</span></button>`;
      }).join('');
      const plein = appuis.length && done === appuis.length;
      return `
        <div class="cockpit__tete">${ring(done, appuis.length)}<div class="cockpit__titre"><p class="dash-bloc__label" style="margin:0;">Mes objectifs du jour</p><p class="cockpit__sous">${plein?'<strong>Journée pleine ✦</strong>':'touche pour valider'}</p></div></div>
        <div class="obj-liste">${items}</div>
        <div class="dash-actions" style="margin-top:1rem;"><a href="pages/carnet/aujourdhui/" class="btn btn--primary">Mon carnet complet</a></div>`;
    }

    function paint() {
      mount.innerHTML = `
        <section class="accueil-carnet">
          <p class="accueil-carnet__date">${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</p>
          <h2 class="accueil-carnet__hello">${prenom?`${greet()} ${esc(prenom)},`:`${greet()},`}</h2>
          <div class="stat-row" style="margin-bottom:1rem;">
            <div class="stat-chip"><span class="stat-chip__val">${serie}</span><span class="stat-chip__lab">${serie>1?'jours de suite':'jour de suite'}</span></div>
            ${obj!=null?`<div class="stat-chip"><span class="stat-chip__val">${act!=null?act:'—'}</span><span class="stat-chip__lab">kg aujourd'hui</span></div><div class="stat-chip"><span class="stat-chip__val">${obj}</span><span class="stat-chip__lab">kg objectif</span></div>`:''}
          </div>
          ${obj!=null?`<div class="jauge" style="margin-bottom:.4rem;"><div class="jauge__fill" style="width:${pct}%"></div></div><p class="poids-note" style="margin:0 0 1rem;"><em>${perdu!=null&&perdu>0?`${perdu} kg allégés — ${pct}% du chemin.`:'Le chemin commence.'}</em></p>`:''}
          <div id="accueil-cockpit">${cockpit()}</div>
        </section>`;
      bind();
    }
    function bind() {
      mount.querySelectorAll('.obj').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (valides.has(id)) valides.delete(id); else valides.add(id);
        const w = document.getElementById('accueil-cockpit'); if (w) { w.innerHTML = cockpit(); bind(); }
        try { await setDoc(doc(db,'carnets_corps',anonId,'jours',date), { valides:[...valides] }, { merge:true }); } catch(e){ console.warn(e); }
      }));
    }

    mount.hidden = false;
    paint();
  } catch (e) {
    console.error(e);
    mount.hidden = true;
  }
}

// Lancement après l'initialisation de tous les utilitaires (évite la zone morte temporelle).
if (mount && anonId) run();
