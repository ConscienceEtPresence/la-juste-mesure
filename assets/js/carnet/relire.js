/* ============================================================
   La juste mesure — Relire ma journée (le bilan du soir)
   Ai-je tenu mes appuis ? Sans reproche : tenu / parfois /
   à reprendre. Une parole en réponse, une gratitude, le jour déposé.
   ============================================================ */
import { db } from './firebase-init.js';
import { doc, getDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const ROOT = new URL('../../../', import.meta.url).href;
const BASE = '../';
const anonId = localStorage.getItem('ljm_carnet_id');
const prenom = localStorage.getItem('ljm_carnet_prenom') || '';
if (!anonId) { window.location.href = BASE; }

const mount = document.getElementById('relire-mount');
const dateEl = document.getElementById('adab-date');
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
dateEl.textContent = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });

const PAROLES = {
  parfois: "Tenir parfois, c'est déjà tenir. La constance naît de l'intermittence honorée.",
  repris: "Reprendre plus petit demain n'est pas une défaite — c'est un acte de sagesse."
};
const date = todayKey();
const state = { bilans: {}, pesee: null };

(async () => {
  try {
    const [appuisData, jourSnap, profilSnap] = await Promise.all([
      fetch(ROOT + 'data/appuis.json').then(r => r.json()),
      getDoc(doc(db, 'carnets_corps', anonId, 'jours', date)).catch(() => null),
      getDoc(doc(db, 'carnets_corps', anonId)).catch(() => null)
    ]);
    const appuiById = {};
    for (const th of (appuisData.themes || [])) for (const a of (th.appuis || [])) appuiById[a.id] = { ...a, themeNom: th.nom };
    const jour = jourSnap && jourSnap.exists() ? jourSnap.data() : {};
    const profil = profilSnap && profilSnap.exists() ? profilSnap.data() : {};
    const matin = jour.matin || {};
    const soir = jour.soir || {};
    const appuis = matin.appuis || [];
    state.bilans = { ...(soir.bilans || {}) };
    // Pré-remplissage : ce qui a été validé en direct dans la journée = « tenu »
    for (const id of (jour.valides || [])) if (!(id in state.bilans)) state.bilans[id] = 'tenu';

    const greet = (new Date().getHours() < 18) ? 'Bonjour' : 'Bonsoir';
    const head = prenom ? `${greet} <em>${esc(prenom)}</em>,` : `${greet},`;

    if (!matin.poseLe) {
      mount.innerHTML = `
        <section class="bilan">
          <h1 class="bilan__titre">${head}</h1>
          <p class="bilan__intro">Vous n'avez pas posé votre journée ce matin. Vous pouvez la poser maintenant, ou simplement déposer ce soir une gratitude.</p>
          <div class="dash-actions" style="justify-content:center;">
            <a href="${BASE}poser/" class="btn btn--primary">Poser ma journée</a>
          </div>
          ${blocGratitude(soir.gratitude || '')}
          ${blocCommit()}
        </section>`;
      brancherCommit(matin, []);
      return;
    }

    const appuisHTML = appuis.map(a => {
      const meta = appuiById[a.id] || a;
      const cur = state.bilans[a.id] || '';
      const mkBtn = (id, label) => `<button type="button" class="statut-btn ${cur===id?'is-active':''}" data-appui="${esc(a.id)}" data-statut="${esc(id)}">${label}</button>`;
      return `
        <article class="bilan-appui" data-id="${esc(a.id)}">
          <span class="bilan-appui__theme">${esc(meta.themeNom || a.theme || '')}</span>
          <h3 class="bilan-appui__libelle">${esc(a.libelle || meta.libelle)}</h3>
          <div class="statuts">
            ${mkBtn('tenu','Tenu')}
            ${mkBtn('parfois','Parfois')}
            ${mkBtn('repris','À reprendre')}
          </div>
          <div class="parole" id="parole-${esc(a.id)}" hidden></div>
        </article>`;
    }).join('');

    mount.innerHTML = `
      <section class="bilan">
        <h1 class="bilan__titre">${head}</h1>
        <p class="bilan__intro">Regardons doucement la journée. Pas de note, pas de reproche — juste un regard honnête et tendre.</p>
        ${matin.pesee != null ? `<p class="bilan__rappel">Ce matin, pesée : <strong>${esc(matin.pesee)} kg</strong>${profil.objectif_poids ? ` · objectif ${esc(profil.objectif_poids)} kg` : ''}</p>` : ''}
        <p class="bilan-bloc__titre">Mes appuis du jour</p>
        ${appuisHTML || '<p style="color:var(--ink-mute);"><em>Aucun appui posé ce matin.</em></p>'}
        ${blocGratitude(soir.gratitude || '')}
        ${blocCommit()}
      </section>`;

    // Statuts
    mount.querySelectorAll('.statut-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.appui, st = btn.dataset.statut;
        state.bilans[id] = st;
        mount.querySelectorAll(`.statut-btn[data-appui="${CSS.escape(id)}"]`).forEach(b => b.classList.toggle('is-active', b.dataset.statut === st));
        const meta = appuiById[id] || {};
        const parole = st === 'tenu' ? (meta.parole || "Tenu en silence — gardé par ce qui voit le caché.") : PAROLES[st];
        const pEl = document.getElementById('parole-' + id);
        if (pEl) { pEl.textContent = '« ' + parole + ' »'; pEl.hidden = false; }
      });
    });

    brancherCommit(matin, appuis);

    function blocGratitude(val) {
      return `
        <div class="bilan-bloc">
          <p class="bilan-bloc__titre">Une gratitude <span style="text-transform:none;letter-spacing:0;color:var(--ink-mute);font-weight:400;">(facultatif)</span></p>
          <div class="champ"><textarea id="gratitude" rows="2" maxlength="400" placeholder="une chose, une personne, un instant — ou rien">${esc(val)}</textarea></div>
        </div>`;
    }
    function blocCommit() {
      return `
        <div class="poser-commit">
          <button type="button" class="btn btn--primary" id="commit-relire">Déposer ce jour</button>
          <span class="poser-ok" id="ok-relire" hidden>✓ déposé</span>
        </div>`;
    }

    function brancherCommit(matin, appuis) {
      const btn = document.getElementById('commit-relire');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = 'Un instant…';
        try {
          const gratitude = (document.getElementById('gratitude') || {}).value || '';
          await setDoc(doc(db, 'carnets_corps', anonId, 'jours', date), {
            soir: { bilans: state.bilans, gratitude: gratitude.trim() || null, fermeLe: serverTimestamp() }
          }, { merge: true });
          try { await setDoc(doc(db, 'carnets_corps', anonId), { lastSeen: serverTimestamp() }, { merge: true }); } catch (e) {}
          const tenus = Object.values(state.bilans).filter(v => v === 'tenu').length;
          const total = appuis.length;
          mount.innerHTML = `
            <div class="cloture">
              <div class="fleuron">✦</div>
              <p>Le jour est déposé.</p>
              ${total ? `<p style="color:var(--ink-soft);"><em>${tenus} appui${tenus>1?'s':''} tenu${tenus>1?'s':''} sur ${total}. Ce qui revient vous travaille ; ce qui manque, manque simplement.</em></p>` : ''}
              <p><em>« Que la nuit soit douce, et le souffle paisible. »</em></p>
              <div class="dash-actions" style="justify-content:center;margin-top:1.3rem;">
                <a href="${BASE}aujourdhui/" class="btn btn--primary">Revenir à mon carnet</a>
                <a href="${BASE}miroir/" class="btn btn--ghost">Voir le miroir</a>
              </div>
            </div>`;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
          console.error(e);
          alert("Désolé, l'enregistrement a échoué. " + (e.message || ''));
          btn.disabled = false; btn.textContent = 'Déposer ce jour';
        }
      });
    }
  } catch (e) {
    console.error(e);
    mount.innerHTML = `<p class="carnet-erreur">Désolé, l'écran n'a pas pu se charger.<br/><small>${esc(e.message || e)}</small></p>`;
  }
})();
