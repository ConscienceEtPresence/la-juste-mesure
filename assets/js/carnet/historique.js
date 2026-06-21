/* ============================================================
   La juste mesure — Historique : mes journées passées
   ============================================================ */
import { db } from './firebase-init.js';
import { collection, getDocs }
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const ROOT = new URL('../../../', import.meta.url).href;
const BASE = '../';
const anonId = localStorage.getItem('ljm_carnet_id');
if (!anonId) { window.location.href = BASE; }

const mount = document.getElementById('histo-mount');
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const dateLong = k => { const [y,m,d] = k.split('-'); return new Date(+y,+m-1,+d).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' }); };

(async () => {
  try {
    const [joursSnap, appuisData] = await Promise.all([
      getDocs(collection(db, 'carnets_corps', anonId, 'jours')).catch(() => ({ forEach(){} })),
      fetch(ROOT + 'data/appuis.json').then(r => r.json()).catch(() => ({ themes: [] }))
    ]);
    const appuiNom = {}; for (const th of (appuisData.themes||[])) for (const a of (th.appuis||[])) appuiNom[a.id] = a.libelle;

    const jours = [];
    joursSnap.forEach(s => { const d = s.data() || {}; if ((d.matin && d.matin.poseLe) || d.soir || (d.recueils && d.recueils.length)) jours.push({ key: s.id, ...d }); });
    jours.sort((a,b) => b.key.localeCompare(a.key));

    if (!jours.length) {
      mount.innerHTML = `
        <section class="histo">
          <h1 class="histo__titre">Mes journées</h1>
          <p class="carnet-loading">Aucune journée encore. Elle viendra dès votre première journée posée.</p>
          <div class="dash-actions" style="justify-content:center;"><a href="${BASE}poser/" class="btn btn--primary">Poser ma journée</a></div>
        </section>`;
      return;
    }

    const cards = jours.map(j => {
      const matin = j.matin || {}, soir = j.soir || {};
      const appuis = (matin.appuis||[]).map(a => a.libelle || appuiNom[a.id] || a.id);
      const tenus = soir.bilans ? Object.values(soir.bilans).filter(v => v==='tenu').length : null;
      const depose = !!soir.fermeLe;
      const recueils = (j.recueils||[]).length;
      const meta = [];
      if (matin.pesee != null) meta.push(`${esc(matin.pesee)} kg`);
      if (depose && tenus != null && appuis.length) meta.push(`${tenus}/${appuis.length} tenus`);
      else if (depose) meta.push('déposée');
      if (recueils) meta.push(`${recueils} instant${recueils>1?'s':''} recueilli${recueils>1?'s':''}`);
      return `
        <div class="histo-jour">
          <div class="histo-jour__date">${esc(dateLong(j.key))}</div>
          ${meta.length ? `<div class="histo-jour__meta">${meta.join(' · ')}</div>` : ''}
          ${appuis.length ? `<div class="histo-jour__appuis">${appuis.map(esc).join(' · ')}</div>` : ''}
          ${soir.gratitude ? `<div class="histo-jour__appuis"><em>Gratitude : ${esc(soir.gratitude)}</em></div>` : ''}
        </div>`;
    }).join('');

    mount.innerHTML = `
      <section class="histo">
        <h1 class="histo__titre">Mes journées</h1>
        <p class="bilan__intro">${jours.length} journée${jours.length>1?'s':''} déposée${jours.length>1?'s':''} dans votre carnet.</p>
        ${cards}
        <div class="dash-actions" style="justify-content:center;margin-top:1.4rem;">
          <a href="${BASE}miroir/" class="btn btn--ghost">Le miroir</a>
          <a href="${BASE}aujourdhui/" class="btn btn--primary">Revenir au carnet</a>
        </div>
      </section>`;
  } catch (e) {
    console.error(e);
    mount.innerHTML = `<p class="carnet-erreur">Désolé, l'historique n'a pas pu se charger.<br/><small>${esc(e.message || e)}</small></p>`;
  }
})();
