/* ============================================================
   La juste mesure — Poser ma journée
   Premier passage : point de départ + objectif. Chaque jour :
   pesée facultative + les appuis du jour. Petit, c'est suffisant.
   ============================================================ */
import { db } from './firebase-init.js';
import { doc, getDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const ROOT = new URL('../../../', import.meta.url).href;
const BASE = '../';

const anonId = localStorage.getItem('ljm_carnet_id');
const prenom = localStorage.getItem('ljm_carnet_prenom') || '';
if (!anonId) { window.location.href = BASE; }

const mount = document.getElementById('poser-mount');
const dateEl = document.getElementById('adab-date');
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
dateEl.textContent = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });

const date = todayKey();
const state = { appuis: new Set() };

(async () => {
  try {
    const [appuisData, profilSnap, jourSnap] = await Promise.all([
      fetch(ROOT + 'data/appuis.json').then(r => r.json()),
      getDoc(doc(db, 'carnets_corps', anonId)).catch(() => null),
      getDoc(doc(db, 'carnets_corps', anonId, 'jours', date)).catch(() => null)
    ]);
    const themes = appuisData.themes || [];
    const profil = profilSnap && profilSnap.exists() ? profilSnap.data() : {};
    const jour = jourSnap && jourSnap.exists() ? jourSnap.data() : {};
    const matin = jour.matin || {};
    const premierPas = !profil.objectif_poids;

    // Pré-cocher les appuis déjà posés aujourd'hui
    for (const a of (matin.appuis || [])) state.appuis.add(a.id);

    const onboarding = premierPas ? `
      <section style="background:var(--paper-2);border:1px solid var(--line);border-radius:var(--radius-lg);padding:1.4rem;margin-bottom:1.6rem;">
        <p class="poser-section-titre" style="margin-top:0;">Mon point de départ</p>
        <p class="poser-section-hint">Ces repères ne servent pas à se juger, mais à voir le chemin. La pesée hebdomadaire suffit — inutile de se peser tous les jours.</p>
        <div class="champ-inline">
          <label class="champ"><span>Mon poids aujourd'hui</span><input type="number" id="poids-depart" inputmode="decimal" step="0.1" min="20" max="400" placeholder="ex. 88" /></label>
          <span class="unite">kg</span>
        </div>
        <div class="champ-inline">
          <label class="champ"><span>Mon objectif</span><input type="number" id="objectif-poids" inputmode="decimal" step="0.1" min="20" max="400" placeholder="ex. 78" /></label>
          <span class="unite">kg</span>
        </div>
        <label class="champ"><span>À quel rythme ? (facultatif)</span>
          <select id="rythme">
            <option value="">— sans contrainte —</option>
            <option value="doux">Tout doux (le temps qu'il faudra)</option>
            <option value="regulier">Régulier (environ 0,5 kg / semaine)</option>
            <option value="soutenu">Soutenu (environ 1 kg / semaine)</option>
          </select>
        </label>
      </section>` : `
      <section style="margin-bottom:1.4rem;">
        <p class="poser-section-titre" style="margin-top:0;">Ma pesée du jour <em style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--ink-mute);">(facultatif)</em></p>
        <p class="poser-section-hint">Une pesée par semaine suffit largement. Laissez vide si ce n'est pas le jour.</p>
        <div class="champ-inline">
          <label class="champ"><span>Poids</span><input type="number" id="pesee" inputmode="decimal" step="0.1" min="20" max="400" placeholder="${profil.poids_actuel != null ? esc(profil.poids_actuel) : ''}" /></label>
          <span class="unite">kg</span>
        </div>
      </section>`;

    const themesHTML = themes.map(th => `
      <div class="appui-theme">
        <h3 class="appui-theme__nom">${esc(th.nom)}</h3>
        <div class="appui-grille">
          ${th.appuis.map(a => `
            <button type="button" class="appui-carte ${state.appuis.has(a.id) ? 'is-selected' : ''}" data-id="${esc(a.id)}" data-theme="${esc(th.id)}" data-themenom="${esc(th.nom)}" data-libelle="${esc(a.libelle)}">
              ${esc(a.libelle)}
              ${a.why ? `<span class="appui-carte__why">${esc(a.why)}</span>` : ''}
            </button>`).join('')}
        </div>
      </div>`).join('');

    mount.innerHTML = `
      <section class="poser">
        <h1 class="poser__titre">${premierPas ? 'Commençons' : 'Poser ma journée'}</h1>
        <p class="poser__intro">${premierPas
          ? 'Un point de départ, une direction, et un ou deux appuis pour aujourd\'hui.'
          : 'Que voulez-vous porter aujourd\'hui ? Choisissez ce qui vous parle — petit, c\'est suffisant.'}</p>
        ${onboarding}
        <p class="poser-section-titre">Mes appuis du jour</p>
        <p class="poser-section-hint">Touchez un ou plusieurs appuis. Chacun porte son « pourquoi ».</p>
        ${themesHTML}
        <div class="appui-theme">
          <h3 class="appui-theme__nom">Mon propre appui</h3>
          <p class="poser-section-hint" style="margin-top:-.3rem;">Écrivez le vôtre, en quelques mots — il sera suivi comme les autres, ce soir.</p>
          <div class="champ"><input type="text" id="appui-perso" maxlength="90" placeholder="ex. demain matin, juste un café" value="${esc((matin.appuis||[]).find(a=>a.theme==='perso')?.libelle || '')}" /></div>
        </div>
        <div class="poser-commit">
          <button type="button" class="btn btn--primary" id="commit">${premierPas ? 'Commencer mon carnet' : 'Poser ma journée'}</button>
          <span class="poser-ok" id="ok" hidden>✓ posé</span>
        </div>
      </section>`;

    // Sélection des appuis
    mount.querySelectorAll('.appui-carte').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (state.appuis.has(id)) state.appuis.delete(id); else state.appuis.add(id);
        btn.classList.toggle('is-selected', state.appuis.has(id));
      });
    });

    // Enregistrement
    document.getElementById('commit').addEventListener('click', async () => {
      const btn = document.getElementById('commit');
      const num = id => { const el = document.getElementById(id); if (!el) return null; const v = parseFloat((el.value || '').replace(',', '.')); return isNaN(v) ? null : v; };

      if (premierPas) {
        const dep = num('poids-depart'), obj = num('objectif-poids');
        if (dep == null || obj == null) { alert('Indiquez votre poids de départ et votre objectif pour commencer.'); return; }
      }
      btn.disabled = true; btn.textContent = 'Un instant…';
      try {
        const appuis = [...mount.querySelectorAll('.appui-carte.is-selected')].map(b => ({ id: b.dataset.id, theme: b.dataset.theme, libelle: b.dataset.libelle }));
        const persoTxt = ((document.getElementById('appui-perso') || {}).value || '').trim();
        if (persoTxt) appuis.push({ id: 'perso-' + Date.now(), theme: 'perso', themeNom: 'Mon appui', libelle: persoTxt });
        let pesee = null;

        if (premierPas) {
          const dep = num('poids-depart'), obj = num('objectif-poids');
          const rythme = (document.getElementById('rythme') || {}).value || null;
          pesee = dep;
          await setDoc(doc(db, 'carnets_corps', anonId), {
            poids_depart: dep, objectif_poids: obj, poids_actuel: dep, rythme,
            prenom: prenom || null, lastSeen: serverTimestamp()
          }, { merge: true });
          await setDoc(doc(db, 'carnets_corps', anonId, 'pesees', date), { poids: dep, le: Date.now() }, { merge: true });
        } else {
          pesee = num('pesee');
          if (pesee != null) {
            await setDoc(doc(db, 'carnets_corps', anonId), { poids_actuel: pesee, lastSeen: serverTimestamp() }, { merge: true });
            await setDoc(doc(db, 'carnets_corps', anonId, 'pesees', date), { poids: pesee, le: Date.now() }, { merge: true });
          }
        }

        await setDoc(doc(db, 'carnets_corps', anonId, 'jours', date), {
          schemaVersion: 1,
          matin: { appuis, pesee, poseLe: serverTimestamp() }
        }, { merge: true });

        const ok = document.getElementById('ok'); if (ok) ok.hidden = false;
        mount.innerHTML = `
          <div class="cloture">
            <div class="fleuron">✦</div>
            <p>${premierPas ? 'Votre carnet est ouvert.' : 'La journée est posée.'}</p>
            <p><em>« Un jour à la fois, à la juste mesure. »</em></p>
            <div class="dash-actions" style="justify-content:center;margin-top:1.3rem;">
              <a href="${BASE}aujourdhui/" class="btn btn--primary">Revenir à mon carnet</a>
            </div>
          </div>`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        console.error(e);
        alert("Désolé, l'enregistrement a échoué. " + (e.message || ''));
        btn.disabled = false; btn.textContent = premierPas ? 'Commencer mon carnet' : 'Poser ma journée';
      }
    });
  } catch (e) {
    console.error(e);
    mount.innerHTML = `<p class="carnet-erreur">Désolé, l'écran n'a pas pu se charger.<br/><small>${esc(e.message || e)}</small></p>`;
  }
})();
