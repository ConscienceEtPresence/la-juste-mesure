/* ============================================================
   La juste mesure — Tableau de bord (le cockpit)
   Objectifs du jour validables en direct, anneau de progression,
   jauge de poids, compteurs (série, jours posés, objectifs tenus).
   Un coaching doux : il accompagne, il ne juge pas.
   ============================================================ */
import { db } from './firebase-init.js';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs }
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const ROOT = new URL('../../../', import.meta.url).href;
const BASE = '../';
const anonId = localStorage.getItem('ljm_carnet_id');
const prenom = localStorage.getItem('ljm_carnet_prenom') || '';
if (!anonId) { window.location.href = BASE; }

const mount = document.getElementById('dash-mount');
const dateEl = document.getElementById('adab-date');
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const keyOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayKey = () => keyOf(new Date());
const dateLisible = () => new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
const greet = () => { const h = new Date().getHours(); return (h < 5 || h >= 18) ? 'Bonsoir' : 'Bonjour'; };

dateEl.textContent = dateLisible();

const date = todayKey();
let appuiById = {};
let valides = new Set();
let appuis = [];

function ring(done, total) {
  const r = 30, c = 2 * Math.PI * r, pct = total ? done / total : 0;
  return `<svg viewBox="0 0 72 72" class="ring" aria-label="${done} sur ${total}">
    <circle cx="36" cy="36" r="${r}" class="ring__bg"/>
    <circle cx="36" cy="36" r="${r}" class="ring__fg" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c*(1-pct)).toFixed(1)}" transform="rotate(-90 36 36)"/>
    <text x="36" y="41" text-anchor="middle" class="ring__txt">${done}/${total}</text>
  </svg>`;
}

(async () => {
  try {
    const [sagesses, appuisData, profilSnap, jourSnap, joursSnap] = await Promise.all([
      fetch(ROOT + 'data/sagesses.json').then(r => r.json()).catch(() => ({ graines: [] })),
      fetch(ROOT + 'data/appuis.json').then(r => r.json()).catch(() => ({ themes: [] })),
      getDoc(doc(db, 'carnets_corps', anonId)).catch(() => null),
      getDoc(doc(db, 'carnets_corps', anonId, 'jours', date)).catch(() => null),
      getDocs(collection(db, 'carnets_corps', anonId, 'jours')).catch(() => ({ forEach(){} }))
    ]);
    const profil = profilSnap && profilSnap.exists() ? profilSnap.data() : {};
    const jour = jourSnap && jourSnap.exists() ? jourSnap.data() : {};
    const matin = jour.matin || {};
    const soir = jour.soir || {};
    const recueils = Array.isArray(jour.recueils) ? jour.recueils : [];
    const aPose = !!matin.poseLe;
    const aDepose = !!soir.fermeLe;
    const heure = new Date().getHours();
    appuis = matin.appuis || [];
    valides = new Set(jour.valides || []);
    for (const th of (appuisData.themes || [])) for (const a of (th.appuis || [])) appuiById[a.id] = { ...a, themeNom: th.nom };

    // ---- Compteurs (série, jours posés, objectifs tenus) ----
    const posedSet = new Set();
    let objTenus = 0;
    joursSnap.forEach(s => {
      const d = s.data() || {};
      if (d.matin && d.matin.poseLe) posedSet.add(s.id);
      const tenu = new Set(Array.isArray(d.valides) ? d.valides : []);
      if (d.soir && d.soir.bilans) for (const [k, v] of Object.entries(d.soir.bilans)) if (v === 'tenu') tenu.add(k);
      objTenus += tenu.size;
    });
    if (aPose) posedSet.add(date);
    let serie = 0; { let cur = new Date(); if (!posedSet.has(keyOf(cur))) cur.setDate(cur.getDate()-1); while (posedSet.has(keyOf(cur))) { serie++; cur.setDate(cur.getDate()-1); } }
    const joursPoses = posedSet.size;

    try { await setDoc(doc(db, 'carnets_corps', anonId), { lastSeen: serverTimestamp() }, { merge: true }); } catch (e) {}

    const greeting = prenom ? `${greet()} <em>${esc(prenom)}</em>,` : `${greet()},`;

    // ---- Seuil du jour ----
    function renderSeuil() {
      const items = sagesses.graines || [];
      if (!items.length) return '';
      const di = Math.floor(new Date(date + 'T00:00:00').getTime() / 86400000);
      const g = items[((di % items.length) + items.length) % items.length];
      const tc = g.type === 'savoir' ? 'dash-seuil__tag--savoir' : 'dash-seuil__tag--sagesse';
      const tl = g.type === 'savoir' ? 'Savoir' : 'Sagesse';
      return `<section class="dash-seuil"><span class="dash-seuil__label">Le seuil du jour</span><br/>
        <span class="dash-seuil__tag ${tc}">${tl}</span>
        <p class="dash-seuil__texte">« ${esc(g.texte)} »</p>
        ${g.source ? `<p class="dash-seuil__source">${esc(g.source)}</p>` : ''}</section>`;
    }

    // ---- Compteurs ----
    function renderCompteurs() {
      const chip = (val, lab) => `<div class="stat-chip"><span class="stat-chip__val">${val}</span><span class="stat-chip__lab">${lab}</span></div>`;
      return `<section class="stat-row">
        ${chip(serie, serie > 1 ? 'jours de suite' : 'jour de suite')}
        ${chip(joursPoses, joursPoses > 1 ? 'jours posés' : 'jour posé')}
        ${chip(objTenus, 'objectifs tenus')}
      </section>`;
    }

    // ---- Poids (jauge compacte) ----
    function renderPoids() {
      if (!profil.objectif_poids) return '';
      const dep = profil.poids_depart, obj = profil.objectif_poids;
      const act = (profil.poids_actuel != null) ? profil.poids_actuel : dep;
      const perdu = (dep != null && act != null) ? Math.round((dep-act)*10)/10 : null;
      const total = (dep != null && obj != null) ? (dep-obj) : null;
      const pct = (total && total > 0 && perdu != null) ? Math.max(0, Math.min(100, Math.round(perdu/total*100))) : 0;
      return `<section class="dash-bloc poids-bloc">
        <div class="poids-tete">
          <p class="dash-bloc__label" style="margin:0;">Mon poids</p>
          <a href="${BASE}miroir/" class="poids-lien">la courbe →</a>
        </div>
        <div class="poids-chiffres">
          <span><strong>${act != null ? esc(act) : '—'}</strong> kg <small>aujourd'hui</small></span>
          <span class="poids-obj">objectif ${obj != null ? esc(obj) : '—'} kg</span>
        </div>
        <div class="jauge"><div class="jauge__fill" style="width:${pct}%"></div></div>
        <p class="poids-note"><em>${perdu != null && perdu > 0 ? `${perdu} kg allégés — ${pct}% du chemin. Doucement, sûrement.` : 'Le chemin commence. Rien ne presse.'}</em></p>
      </section>`;
    }

    // ---- Cockpit du jour (objectifs validables) ----
    function cockpitHTML() {
      if (!profil.objectif_poids) {
        return `<section class="dash-bloc"><p class="dash-bloc__label">Commençons doucement</p>
          <p style="color:var(--ink-soft);">Posons d'abord un point de départ et une direction — sans hâte.</p>
          <div class="dash-actions"><a href="${BASE}poser/" class="btn btn--primary">Définir mon point de départ</a></div></section>`;
      }
      if (!aPose) {
        return `<section class="dash-bloc cockpit cockpit--vide">
          <p class="dash-bloc__label">Aujourd'hui</p>
          <p style="color:var(--ink-soft);"><em>Quels appuis veux-tu porter aujourd'hui ? Un ou deux suffisent.</em></p>
          <div class="dash-actions"><a href="${BASE}poser/" class="btn btn--primary">Poser ma journée</a></div></section>`;
      }
      const done = appuis.filter(a => valides.has(a.id)).length;
      const total = appuis.length;
      const plein = total > 0 && done === total;
      const items = appuis.map(a => {
        const meta = appuiById[a.id] || a;
        const on = valides.has(a.id);
        return `<button type="button" class="obj ${on ? 'is-done' : ''}" data-id="${esc(a.id)}">
          <span class="obj__check" aria-hidden="true">${on ? '✓' : ''}</span>
          <span class="obj__txt"><span class="obj__theme">${esc(meta.themeNom || a.themeNom || '')}</span>${esc(a.libelle || meta.libelle)}</span>
        </button>`;
      }).join('');
      return `<section class="dash-bloc cockpit">
        <div class="cockpit__tete">
          ${ring(done, total)}
          <div class="cockpit__titre">
            <p class="dash-bloc__label" style="margin:0;">Mes objectifs du jour</p>
            <p class="cockpit__sous">${plein ? '<strong>Journée pleine ✦</strong> — tout est validé.' : (done ? `${done} sur ${total} validé${done>1?'s':''} · touche pour cocher` : 'Touche un objectif quand tu l\'as tenu')}</p>
          </div>
        </div>
        <div class="obj-liste">${items}</div>
        ${matin.pesee != null ? `<p class="cockpit__pesee">Pesée du matin : <strong>${esc(matin.pesee)} kg</strong></p>` : ''}
        <div class="dash-actions">
          ${aDepose
            ? `<span class="cockpit__depose">Journée déposée ✦ — que la nuit soit douce.</span>`
            : (heure >= 17
                ? `<a href="${BASE}relire/" class="btn btn--primary">Faire mon bilan du soir</a>`
                : `<a href="${BASE}relire/" class="btn btn--ghost">Faire une halte</a>`)}
          <a href="${BASE}poser/" class="btn btn--ghost">Modifier</a>
        </div>
      </section>`;
    }

    function renderBas() {
      const nbR = recueils.length;
      return `<section class="dash-bloc">
          <p class="dash-bloc__label">En cours de journée</p>
          <p style="color:var(--ink-soft);"><em>Une envie, un grignotage, un repas habité ? Recueille l'instant${nbR ? ` (${nbR} aujourd'hui)` : ''} — et vois quelle faim parlait.</em></p>
          <div class="dash-actions"><a href="${BASE}recueillir/" class="btn btn--ghost">Recueillir un instant</a></div>
        </section>
        <p class="dash-liens"><a href="${BASE}miroir/">Le miroir — ma courbe & mes progrès →</a></p>
        <p class="dash-liens"><a href="${BASE}historique/">Mes journées passées →</a></p>
        <p class="dash-liens dash-liens--soft"><a href="../../../index.html">Sortir du carnet</a></p>`;
    }

    function paint() {
      mount.innerHTML = `
        <section class="dash">
          <h1 class="dash__hello">${greeting}</h1>
          ${renderCompteurs()}
          <div id="cockpit-wrap">${cockpitHTML()}</div>
          ${renderPoids()}
          ${renderSeuil()}
          ${profil.objectif_poids ? renderBas() : '<p class="dash-liens dash-liens--soft"><a href="../../../index.html">Sortir du carnet</a></p>'}
        </section>`;
      bindCockpit();
    }

    function bindCockpit() {
      mount.querySelectorAll('.obj').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (valides.has(id)) valides.delete(id); else valides.add(id);
        // mise à jour immédiate (anneau + état) sans recharger
        const wrap = document.getElementById('cockpit-wrap');
        if (wrap) { wrap.innerHTML = cockpitHTML(); bindCockpit(); }
        try { await setDoc(doc(db, 'carnets_corps', anonId, 'jours', date), { valides: [...valides] }, { merge: true }); } catch (e) { console.warn(e); }
      }));
    }

    paint();
  } catch (e) {
    console.error(e);
    mount.innerHTML = `<p class="carnet-erreur">Désolé, le carnet n'a pas pu être ouvert.<br/><small>${esc(e.message || e)}</small></p>`;
  }
})();
