/* ============================================================
   La juste mesure — Tableau de bord du carnet
   Accueille, donne la sagesse du jour, montre l'objectif et
   l'état de la journée. Ne juge jamais.
   ============================================================ */
import { db } from './firebase-init.js';
import { doc, getDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const ROOT = new URL('../../../', import.meta.url).href;   // racine du site
const BASE = '../';                                        // pages/carnet/ depuis aujourdhui/

const anonId = localStorage.getItem('ljm_carnet_id');
const prenom = localStorage.getItem('ljm_carnet_prenom') || '';
if (!anonId) { window.location.href = BASE; }

const mount = document.getElementById('dash-mount');
const dateEl = document.getElementById('adab-date');

const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const dateLisible = () => new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
const greet = () => { const h = new Date().getHours(); return (h < 5 || h >= 18) ? 'Bonsoir' : 'Bonjour'; };

dateEl.textContent = dateLisible();

(async () => {
  try {
    const date = todayKey();
    const [sagesses, appuisData, profilSnap, jourSnap] = await Promise.all([
      fetch(ROOT + 'data/sagesses.json').then(r => r.json()).catch(() => ({ graines: [] })),
      fetch(ROOT + 'data/appuis.json').then(r => r.json()).catch(() => ({ themes: [] })),
      getDoc(doc(db, 'carnets_corps', anonId)).catch(() => null),
      getDoc(doc(db, 'carnets_corps', anonId, 'jours', date)).catch(() => null)
    ]);

    const profil = profilSnap && profilSnap.exists() ? profilSnap.data() : {};
    const jour = jourSnap && jourSnap.exists() ? jourSnap.data() : {};
    const matin = jour.matin || {};
    const aPose = !!matin.poseLe;

    // Index des appuis (id -> {libelle, theme})
    const appuiById = {};
    for (const th of (appuisData.themes || [])) for (const a of (th.appuis || [])) appuiById[a.id] = { ...a, themeNom: th.nom };

    // marque lastSeen
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
      return `
        <section class="dash-seuil">
          <span class="dash-seuil__label">Le seuil du jour</span><br/>
          <span class="dash-seuil__tag ${tc}">${tl}</span>
          <p class="dash-seuil__texte">« ${esc(g.texte)} »</p>
          ${g.source ? `<p class="dash-seuil__source">${esc(g.source)}</p>` : ''}
        </section>`;
    }

    // ---- Objectif ----
    function renderObjectif() {
      if (!profil.objectif_poids) {
        return `
          <section class="dash-bloc">
            <p class="dash-bloc__label">Commençons doucement</p>
            <p style="color:var(--ink-soft);">Avant tout, posons un point de départ et une direction — sans hâte. Ce ne sont pas des chiffres pour se juger, mais des repères pour voir le chemin.</p>
            <div class="dash-actions">
              <a href="${BASE}poser/" class="btn btn--primary">Définir mon point de départ</a>
            </div>
          </section>`;
      }
      const dep = profil.poids_depart, obj = profil.objectif_poids;
      const act = (profil.poids_actuel != null) ? profil.poids_actuel : dep;
      const perdu = (dep != null && act != null) ? Math.round((dep - act) * 10) / 10 : null;
      const reste = (act != null && obj != null) ? Math.round((act - obj) * 10) / 10 : null;
      return `
        <section class="dash-bloc">
          <p class="dash-bloc__label">Mon objectif</p>
          <div class="dash-objectif">
            <div class="dash-chiffre"><span class="dash-chiffre__val">${esc(dep)}<small style="font-size:.6em"> kg</small></span><span class="dash-chiffre__lab">départ</span></div>
            <div class="dash-chiffre"><span class="dash-chiffre__val dash-chiffre__val--clay">${esc(act)}<small style="font-size:.6em"> kg</small></span><span class="dash-chiffre__lab">aujourd'hui</span></div>
            <div class="dash-chiffre"><span class="dash-chiffre__val dash-chiffre__val--olive">${esc(obj)}<small style="font-size:.6em"> kg</small></span><span class="dash-chiffre__lab">objectif</span></div>
          </div>
          ${(perdu != null && perdu > 0) ? `<p style="margin:.9rem 0 0;color:var(--ink-soft);"><em>${perdu} kg allégés depuis le départ. Doucement, sûrement.</em></p>`
            : `<p style="margin:.9rem 0 0;color:var(--ink-mute);"><em>${reste != null ? `${Math.abs(reste)} kg vous séparent de votre repère. Rien ne presse.` : 'Le chemin commence.'}</em></p>`}
        </section>`;
    }

    // ---- Aujourd'hui ----
    function renderAujourdhui() {
      if (!profil.objectif_poids) return '';
      if (aPose) {
        const choisis = (matin.appuis || []).map(a => appuiById[a.id] || a).filter(Boolean);
        const items = choisis.map(a => `<li class="dash-appui"><span class="dash-appui__theme">${esc(a.themeNom || '')}</span><span>${esc(a.libelle)}</span></li>`).join('');
        return `
          <section class="dash-bloc">
            <p class="dash-bloc__label">Ce que j'ai posé ce matin</p>
            ${matin.pesee != null ? `<p style="color:var(--ink-soft);margin-bottom:.6rem;">Pesée du jour : <strong>${esc(matin.pesee)} kg</strong></p>` : ''}
            ${items ? `<ul class="dash-appuis">${items}</ul>` : '<p style="color:var(--ink-mute);"><em>Journée posée, sans appui particulier.</em></p>'}
            <div class="dash-actions">
              <a href="${BASE}poser/" class="btn btn--ghost">Modifier</a>
            </div>
            <p class="dash-liens dash-liens--soft" style="margin-top:1rem;"><em>Ce soir, vous pourrez relire votre journée. (bientôt)</em></p>
          </section>`;
      }
      return `
        <section class="dash-bloc">
          <p class="dash-bloc__label">Aujourd'hui</p>
          <p style="color:var(--ink-soft);"><em>Que voulez-vous porter aujourd'hui ? Un ou deux appuis simples suffisent.</em></p>
          <div class="dash-actions">
            <a href="${BASE}poser/" class="btn btn--primary">Poser ma journée</a>
          </div>
        </section>`;
    }

    mount.innerHTML = `
      <section class="dash">
        <h1 class="dash__hello">${greeting}</h1>
        ${renderSeuil()}
        ${renderObjectif()}
        ${renderAujourdhui()}
        <p class="dash-liens dash-liens--soft"><a href="../../../index.html">Sortir du carnet</a></p>
      </section>`;
  } catch (e) {
    console.error(e);
    mount.innerHTML = `<p class="carnet-erreur">Désolé, le carnet n'a pas pu être ouvert.<br/><small>${esc(e.message || e)}</small></p>`;
  }
})();
