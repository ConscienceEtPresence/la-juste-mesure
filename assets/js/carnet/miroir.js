/* ============================================================
   La juste mesure — Le miroir
   La courbe du poids dans le temps, la progression vers l'objectif,
   les appuis vers lesquels on revient, et ce qui nous fait manger.
   Un reflet, jamais un jugement.
   ============================================================ */
import { db } from './firebase-init.js';
import { doc, getDoc, collection, getDocs }
  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const ROOT = new URL('../../../', import.meta.url).href;
const BASE = '../';
const anonId = localStorage.getItem('ljm_carnet_id');
const prenom = localStorage.getItem('ljm_carnet_prenom') || '';
if (!anonId) { window.location.href = BASE; }

const mount = document.getElementById('miroir-mount');
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const dateCourte = k => { const [y,m,d] = k.split('-'); return new Date(+y, +m-1, +d).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }); };

(async () => {
  try {
    const [profilSnap, peseesSnap, joursSnap, appuisData, faimsData] = await Promise.all([
      getDoc(doc(db, 'carnets_corps', anonId)).catch(() => null),
      getDocs(collection(db, 'carnets_corps', anonId, 'pesees')).catch(() => ({ forEach(){} })),
      getDocs(collection(db, 'carnets_corps', anonId, 'jours')).catch(() => ({ forEach(){} })),
      fetch(ROOT + 'data/appuis.json').then(r => r.json()).catch(() => ({ themes: [] })),
      fetch(ROOT + 'data/faims.json').then(r => r.json()).catch(() => ({ faims: [], mouvements: [] }))
    ]);
    const profil = profilSnap && profilSnap.exists() ? profilSnap.data() : {};

    // Pesées triées
    const pesees = [];
    peseesSnap.forEach(s => { const d = s.data(); if (d && d.poids != null) pesees.push({ date: s.id, poids: d.poids }); });
    pesees.sort((a,b) => a.date.localeCompare(b.date));

    // Appuis & déclencheurs depuis les jours
    const appuiNom = {}; for (const th of (appuisData.themes||[])) for (const a of (th.appuis||[])) appuiNom[a.id] = a.libelle;
    const declNom = {}; for (const f of (faimsData.faims||[])) declNom[f.id] = f.nom; for (const m of (faimsData.mouvements||[])) declNom[m.id] = m.nom;

    const appuiCount = {}, declCount = {};
    let nbJours = 0;
    joursSnap.forEach(s => {
      const d = s.data() || {};
      if (d.matin && d.matin.poseLe) {
        nbJours++;
        for (const a of (d.matin.appuis||[])) {
          const key = a.theme === 'perso' ? ('perso:' + (a.libelle||'').toLowerCase()) : a.id;
          appuiCount[key] = (appuiCount[key]||0)+1;
          if (!appuiNom[key]) appuiNom[key] = a.libelle || appuiNom[a.id] || a.id;
        }
      }
      for (const r of (d.recueils||[])) {
        for (const f of (r.faims||[])) declCount[f] = (declCount[f]||0)+1;
        for (const m of (r.mouvements||[])) declCount[m] = (declCount[m]||0)+1;
      }
    });

    if (!pesees.length && !nbJours) {
      mount.innerHTML = `
        <section class="miroir">
          <div class="miroir__head">
            <h1 class="miroir__titre">Encore vierge</h1>
          </div>
          <p class="miroir__sceau"><em>Le miroir se remplira tout seul, une journée posée après l'autre. Rien à compter.</em></p>
          <div class="dash-actions" style="justify-content:center;">
            <a href="${BASE}poser/" class="btn btn--primary">Poser ma première journée</a>
          </div>
        </section>`;
      return;
    }

    // ---- Courbe de poids (SVG) ----
    function renderCourbe() {
      if (pesees.length < 1) return '';
      const dep = profil.poids_depart, obj = profil.objectif_poids;
      const W = 600, H = 200, PT = 18, PB = 30, PL = 38, PR = 14;
      const vals = pesees.map(p => p.poids).concat([obj, dep].filter(v => v != null));
      let lo = Math.min(...vals), hi = Math.max(...vals);
      if (lo === hi) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * 0.15 || 1; lo -= pad; hi += pad;
      const x = i => PL + (pesees.length === 1 ? (W-PL-PR)/2 : i * (W-PL-PR)/(pesees.length-1));
      const y = v => PT + (hi - v) * (H-PT-PB)/(hi-lo);
      const pts = pesees.map((p,i) => `${x(i).toFixed(1)},${y(p.poids).toFixed(1)}`).join(' ');
      const dots = pesees.map((p,i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.poids).toFixed(1)}" r="3.2" fill="var(--clay)"/>`).join('');
      const objLine = (obj != null) ? `<line x1="${PL}" y1="${y(obj).toFixed(1)}" x2="${W-PR}" y2="${y(obj).toFixed(1)}" stroke="var(--olive)" stroke-width="1.2" stroke-dasharray="5 4"/><text x="${W-PR}" y="${(y(obj)-5).toFixed(1)}" text-anchor="end" font-family="Inter,sans-serif" font-size="11" fill="var(--olive-deep)">objectif ${esc(obj)}</text>` : '';
      const yTicks = [hi, (hi+lo)/2, lo].map(v => `<text x="${PL-6}" y="${(y(v)+3).toFixed(1)}" text-anchor="end" font-family="Inter,sans-serif" font-size="10" fill="var(--ink-mute)">${v.toFixed(1)}</text>`).join('');
      return `
        <section class="miroir-bloc">
          <h2 class="miroir-bloc__titre">Ma courbe</h2>
          <p class="miroir-bloc__sous">Le poids dans le temps — une tendance, pas une note quotidienne.</p>
          <div class="courbe-wrap">
            <svg class="courbe" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Courbe de poids">
              ${objLine}
              <polyline points="${pts}" fill="none" stroke="var(--clay)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
              ${dots}
              ${yTicks}
            </svg>
          </div>
          <div class="courbe-legende"><span>${esc(dateCourte(pesees[0].date))}</span><span>${esc(dateCourte(pesees[pesees.length-1].date))}</span></div>
        </section>`;
    }

    // ---- Progression chiffrée ----
    function renderProgression() {
      const dep = profil.poids_depart, obj = profil.objectif_poids;
      const act = pesees.length ? pesees[pesees.length-1].poids : (profil.poids_actuel ?? dep);
      const perdu = (dep != null && act != null) ? Math.round((dep-act)*10)/10 : null;
      const reste = (act != null && obj != null) ? Math.round((act-obj)*10)/10 : null;
      const total = (dep != null && obj != null) ? (dep-obj) : null;
      const pct = (total && total > 0 && perdu != null) ? Math.max(0, Math.min(100, Math.round(perdu/total*100))) : null;
      return `
        <section class="miroir-bloc">
          <h2 class="miroir-bloc__titre">Le chemin parcouru</h2>
          <div class="miroir-stat">
            <div class="dash-chiffre"><span class="dash-chiffre__val">${dep!=null?esc(dep):'—'}<small style="font-size:.6em"> kg</small></span><span class="dash-chiffre__lab">départ</span></div>
            <div class="dash-chiffre"><span class="dash-chiffre__val dash-chiffre__val--clay">${act!=null?esc(act):'—'}<small style="font-size:.6em"> kg</small></span><span class="dash-chiffre__lab">aujourd'hui</span></div>
            <div class="dash-chiffre"><span class="dash-chiffre__val dash-chiffre__val--olive">${obj!=null?esc(obj):'—'}<small style="font-size:.6em"> kg</small></span><span class="dash-chiffre__lab">objectif</span></div>
          </div>
          ${pct != null ? `<div class="miroir-barre" style="margin-top:1rem;"><div class="miroir-barre__tete"><span>Vers l'objectif</span><span>${pct}%</span></div><div class="miroir-barre__piste"><div class="miroir-barre__remplie" style="width:${pct}%"></div></div></div>` : ''}
          <p style="margin:.9rem 0 0;color:var(--ink-soft);"><em>${perdu != null && perdu > 0 ? `${perdu} kg allégés depuis le départ. Doucement, sûrement.` : (reste != null ? `${Math.abs(reste)} kg vous séparent du repère. Rien ne presse.` : 'Le chemin commence.')}</em></p>
        </section>`;
    }

    // ---- Barres (appuis / déclencheurs) ----
    function barres(countObj, nameObj, max) {
      const entries = Object.entries(countObj).sort((a,b)=>b[1]-a[1]).slice(0,6);
      if (!entries.length) return '';
      const m = max || entries[0][1];
      return entries.map(([id,n]) => `
        <div class="miroir-barre">
          <div class="miroir-barre__tete"><span>${esc(nameObj[id]||id)}</span><span>${n} fois</span></div>
          <div class="miroir-barre__piste"><div class="miroir-barre__remplie" style="width:${Math.round(n/m*100)}%"></div></div>
        </div>`).join('');
    }
    const appuisBars = barres(appuiCount, appuiNom);
    const declBars = barres(declCount, declNom);

    mount.innerHTML = `
      <section class="miroir">
        <div class="miroir__head">
          <p class="miroir__rubrique">Le miroir</p>
          <h1 class="miroir__titre">${prenom ? esc(prenom)+', ' : ''}le chemin se dessine</h1>
          <p class="miroir__compte">${nbJours} journée${nbJours>1?'s':''} posée${nbJours>1?'s':''}${pesees.length?` · ${pesees.length} pesée${pesees.length>1?'s':''}`:''}</p>
        </div>
        ${renderCourbe()}
        ${renderProgression()}
        ${appuisBars ? `<section class="miroir-bloc"><h2 class="miroir-bloc__titre">Vers quoi je reviens</h2><p class="miroir-bloc__sous">Les appuis que vous portez le plus souvent.</p>${appuisBars}</section>` : ''}
        ${declBars ? `<section class="miroir-bloc"><h2 class="miroir-bloc__titre">Ce qui me fait manger</h2><p class="miroir-bloc__sous">Les faims et les mouvements que vous avez recueillis. Les voir, c'est déjà s'en libérer un peu.</p>${declBars}</section>` : ''}
        <p class="miroir__sceau"><em>Pas de score, pas de note. Ce qui revient vous travaille ; ce qui manque, manque simplement.</em></p>
        <div class="dash-actions" style="justify-content:center;">
          <a href="${BASE}historique/" class="btn btn--ghost">Mes journées une à une</a>
          <a href="${BASE}aujourdhui/" class="btn btn--primary">Revenir au carnet</a>
        </div>
      </section>`;
  } catch (e) {
    console.error(e);
    mount.innerHTML = `<p class="carnet-erreur">Désolé, le miroir n'a pas pu se charger.<br/><small>${esc(e.message || e)}</small></p>`;
  }
})();
