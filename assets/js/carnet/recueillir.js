/* ============================================================
   La juste mesure — Recueillir un instant
   Un grignotage, une tentation, un repas habité. On le note et,
   surtout, on nomme la faim qui parlait (9 faims) ou le mouvement
   intérieur (fatigue, ennui, stress…). Comprendre, sans se juger.
   ============================================================ */
import { db } from './firebase-init.js';
import { doc, setDoc, serverTimestamp, arrayUnion }
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const ROOT = new URL('../../../', import.meta.url).href;
const BASE = '../';
const anonId = localStorage.getItem('ljm_carnet_id');
if (!anonId) { window.location.href = BASE; }

const mount = document.getElementById('recueil-mount');
const dateEl = document.getElementById('adab-date');
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
dateEl.textContent = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });

const date = todayKey();
const STATUTS = [
  { id:'habite', nom:"Je l'ai habité", hint:"présent, à la hauteur de l'instant" },
  { id:'traverse', nom:"Cela m'a traversé", hint:"reçu, sans l'avoir choisi" },
  { id:'manque', nom:"Je l'ai manqué", hint:"laissé passer — sans reproche" }
];
const state = { texte:'', faims:new Set(), mouvements:new Set(), statut:'', apprentissage:'' };

(async () => {
  try {
    const data = await fetch(ROOT + 'data/faims.json').then(r => r.json());
    const faims = data.faims || [], mouvements = data.mouvements || [];

    const carte = (kind, x, sel) => `
      <button type="button" class="faim-carte ${sel?'is-selected':''}" data-kind="${kind}" data-id="${esc(x.id)}">
        <span class="faim-carte__nom">${esc(x.nom)}</span>
        <span class="faim-carte__desc">${esc(x.desc)}</span>
      </button>`;

    mount.innerHTML = `
      <section class="recueil">
        <h1 class="recueil__titre">Quelque chose s'est présenté</h1>
        <p class="recueil__intro">Un grignotage, une tentation traversée, un repas vraiment habité. Recueillez-le, et nommez surtout ce qui parlait — la nourriture n'est pas toujours la réponse à la faim.</p>

        <div class="champ"><span>Qu'est-ce qui vient de se passer ? <em style="color:var(--ink-mute);">(facultatif)</em></span>
          <textarea id="texte" rows="3" maxlength="600" placeholder="une scène, une envie, ce que vous avez mangé ou ressenti…"></textarea>
        </div>

        <p class="bilan-bloc__titre" style="margin-top:1.4rem;">Quelle faim parlait ?</p>
        <div class="faim-grille">${faims.map(f => carte('faim', f, false)).join('')}</div>

        <p class="bilan-bloc__titre" style="margin-top:1.4rem;">Ou quel mouvement intérieur ?</p>
        <div class="faim-grille">${mouvements.map(m => carte('mouvement', m, false)).join('')}</div>

        <p class="bilan-bloc__titre" style="margin-top:1.4rem;">Comment l'avez-vous traversé ? <span style="text-transform:none;letter-spacing:0;color:var(--ink-mute);font-weight:400;">(facultatif)</span></p>
        <div class="statuts">${STATUTS.map(s => `<button type="button" class="statut-btn" data-statut="${s.id}" title="${esc(s.hint)}">${esc(s.nom)}</button>`).join('')}</div>

        <div class="champ" style="margin-top:1.4rem;"><span>Ce que cela m'apprend <em style="color:var(--ink-mute);">(facultatif)</em></span>
          <textarea id="appr" rows="2" maxlength="400" placeholder="une phrase, si elle vient — ou rien"></textarea>
        </div>

        <div class="poser-commit">
          <button type="button" class="btn btn--primary" id="commit-recueil" disabled>Recueillir cet instant</button>
          <a href="${BASE}aujourdhui/" class="btn btn--ghost">Revenir au carnet</a>
        </div>
      </section>`;

    const commit = document.getElementById('commit-recueil');
    const maj = () => { commit.disabled = !(state.texte.trim() || state.faims.size || state.mouvements.size || state.statut); };

    document.getElementById('texte').addEventListener('input', e => { state.texte = e.target.value; maj(); });
    document.getElementById('appr').addEventListener('input', e => { state.apprentissage = e.target.value; });

    mount.querySelectorAll('.faim-carte').forEach(btn => btn.addEventListener('click', () => {
      const set = btn.dataset.kind === 'faim' ? state.faims : state.mouvements;
      const id = btn.dataset.id;
      if (set.has(id)) set.delete(id); else set.add(id);
      btn.classList.toggle('is-selected', set.has(id));
      maj();
    }));
    mount.querySelectorAll('.statut-btn').forEach(btn => btn.addEventListener('click', () => {
      state.statut = (state.statut === btn.dataset.statut) ? '' : btn.dataset.statut;
      mount.querySelectorAll('.statut-btn').forEach(b => b.classList.toggle('is-active', b.dataset.statut === state.statut));
      maj();
    }));

    commit.addEventListener('click', async () => {
      commit.disabled = true; commit.textContent = 'Un instant…';
      try {
        const recueil = {
          texte: state.texte.trim() || null,
          faims: [...state.faims],
          mouvements: [...state.mouvements],
          statut: state.statut || null,
          apprentissage: state.apprentissage.trim() || null,
          le: Date.now()
        };
        await setDoc(doc(db, 'carnets_corps', anonId, 'jours', date), { recueils: arrayUnion(recueil) }, { merge: true });
        try { await setDoc(doc(db, 'carnets_corps', anonId), { lastSeen: serverTimestamp() }, { merge: true }); } catch (e) {}
        mount.innerHTML = `
          <section class="recueil-merci">
            <div class="fleuron">✦</div>
            <h1>C'est recueilli.</h1>
            <p style="color:var(--ink-soft);">Cet instant ne se perdra pas. Il rejoindra votre miroir, et vous aidera à voir ce qui vous fait manger.</p>
            <blockquote class="recueil-merci__sagesse">« Nommer la faim qui parle, c'est cesser d'y répondre à l'aveugle. »</blockquote>
            <div class="dash-actions" style="justify-content:center;">
              <button type="button" class="btn btn--ghost" id="encore">Recueillir un autre instant</button>
              <a href="${BASE}aujourdhui/" class="btn btn--primary">Revenir au carnet</a>
            </div>
          </section>`;
        document.getElementById('encore').addEventListener('click', () => location.reload());
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        console.error(e);
        alert("Désolé, l'enregistrement a échoué. " + (e.message || ''));
        commit.disabled = false; commit.textContent = 'Recueillir cet instant';
      }
    });
  } catch (e) {
    console.error(e);
    mount.innerHTML = `<p class="carnet-erreur">Désolé, l'écran n'a pas pu se charger.<br/><small>${esc(e.message || e)}</small></p>`;
  }
})();
