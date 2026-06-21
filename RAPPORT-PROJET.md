# RAPPORT DE PROJET — La juste mesure
### Document de passation · démarré le 2026-06-21

> À lire avant toute intervention. Décrit l'identité, l'intention, l'architecture,
> le workflow d'aperçu, l'état d'avancement et les décisions en attente.

---

## 1. IDENTITÉ

- **Nom** : *La juste mesure* (sous-titre : « manger en conscience, s'alléger sans se juger »).
- **Nature** : compagnon web pour retrouver l'équilibre du corps — **pas un régime sec**. Trois fils tressés :
  1. **Le carnet de bord** (Firestore) : suivre poids, objectif, sucre, repas, à son rythme, sans jugement.
  2. **Comprendre** : la science de l'alimentation (sucre, insuline, microbiote, inflammation…).
  3. **Le sens** : spiritualité et philosophie du manger (corps confié, présence, neuf faims, maîtrise du désir).
- **Auteur** : Brahms (profil intégratif — soufisme, sciences humaines, mystique comparée).
- **Public** : d'abord Brahms ; conçu **public et partageable** (anonyme, aucune donnée personnelle publiée).
- **Compte GitHub** : ConscienceEtPresence (nouveau dépôt, autonome).
- **Modèle de structure** : *La voie du dedans* (`../lavoiedusoufisme`) — on en reprend l'architecture et le soin, **pas** le nom ni l'univers.

## 2. SOURCES DU FOND (impératif)

Tout le contenu s'appuie sur la bibliothèque `/Users/brahms/Documents/régime` (14 ouvrages) :
Lustig, Yeo, Pollan, Willett, Campbell (science/métabolisme) ; Spector, Mayer, Launay, Pouyat-Leclère, Duhigg, Nutrient-Gene (microbiote/inflammation/habitudes) ; Thich Nhat Hanh, Jan Chozen Bays, Frawley (spiritualité/conscience).

> **Règle droit d'auteur (comme LVDD §8)** : les livres sont des **sources de recherche**. Prose **originale** ; citations directes **courtes** et attribuées seulement. On ne recopie pas.

## 3. ARCHITECTURE TECHNIQUE

- **Stack** : HTML/CSS/JS **purs (vanilla)**, aucun framework, aucun build. GitHub Pages.
- **Contenu piloté par JSON** : `data/<module>.json` + `assets/js/<module>.js` + page-gabarit `?id=`. Enrichir = éditer un JSON.
- **Chemins relatifs** (le site doit marcher en sous-dossier comme à la racine d'un domaine). `main.js` déduit la racine de sa propre URL.
- **Carnet** : Firestore, identité **anonyme locale** (`localStorage`), **aucun compte**. (À câbler — voir §6.)
- **PWA** : `manifest.webmanifest` (+ `sw.js` à venir). Analytics anonymes type `pulse.js` (à venir).
- **Cache** : versionner les assets (`?v=`) à chaque modif JS/CSS.

## 4. IDENTITÉ VISUELLE

- **Palette** (dans `assets/css/base.css`) : lin `#FAF6EE`, encre brun chaud `#2A2823`, terre cuite `#BE6A49`, olive/sauge `#6E7A4B`, miel `#C99A3F`. Mode nuit chaud (`dark-mode.css`).
- **Polices** : Cormorant Garamond (titres), Source Serif 4 (corps), Inter (UI), Amiri (arabe).
- **Conventions** (héritées de LVDD) : **pas d'émojis**, fleurons ✦ seulement ; ton sobre, lent, contemplatif ; le mot juste.
- **Marque** : une balance stylisée (la « mesure ») en terre cuite.

## 5. WORKFLOW D'APERÇU (IMPORTANT)

Le dossier `Documents/GitHub` est protégé (TCC macOS) → WEBrick ne peut pas le servir directement (erreur « Operation not permitted »). **Comme les autres sites du dossier, on sert depuis `/tmp`** :

```bash
rm -rf /tmp/juste_mesure_preview
cp -R /Users/brahms/Documents/GitHub/ConscienceEtPresence/la-juste-mesure /tmp/juste_mesure_preview
```
Config dans `.claude/launch.json` : serveur **`juste-mesure`** (ruby httpd, **port 8200**, racine `/tmp/juste_mesure_preview`).
→ Après chaque modif de source, **recopier vers `/tmp`** avant de prévisualiser.

## 6. DÉCISIONS EN ATTENTE

- **Firebase** : recommandé = **nouveau projet dédié** (garder les mondes étanches). Action de Brahms requise : créer le projet + fournir la config (`firebase-config.js`). En attendant, le carnet sera bâti avec une config **placeholder**. Collections préfixées `carnets_corps` / `analytics`.
- **Domaine** : non décidé. GitHub Pages par défaut pour l'instant (pas de `CNAME`).
- **Langue** : français d'abord ; miroir `/en/` plus tard.

## 7. ÉTAT D'AVANCEMENT

**Phase 0 — Fondations : FAIT et vérifié (aperçu OK).**
- Arborescence du dépôt.
- Design system : `base.css`, `layout.css`, `components.css`, `dark-mode.css`.
- `assets/js/main.js` : nav mobile, mode nuit (clé `ljm-theme`), graine du jour.
- `data/sagesses.json` : 14 graines (alternance savoir/sagesse).
- `index.html` : accueil (hero, 3 portes, graine du jour, intention).
- `manifest.webmanifest`.

**Reste à faire** (cf. plan `~/.claude/plans/abstract-whistling-summit.md`) :
- Phase 1 — Le carnet (entrer/poser/recueillir/relire/miroir + poids/objectifs ; déclencheurs = 9 faims / mouvements du nafs). **Bloqué par Firebase.**
- Phase 2 — Comprendre + dictionnaire des aliments (JSON semés des livres).
- Phase 3 — Le sens (corps confié, neuf faims, agni/terrains, maîtrise du désir, sagesses comparées).
- Phase 4 — Liant & finitions (recherche, sw.js/PWA offline, pulse.js, rappels push, SEO, EN, domaine).
- Pages d'index provisoires des sections (carnet/comprendre/aliments/sens) à créer pour que la nav ne renvoie pas de 404.

## 8. CONVENTIONS RÉCAP

- ✅ Vanilla, sans build ; chemins relatifs ; versionner `?v=`.
- ✅ Prose originale ; citations courtes attribuées (jamais de copie d'œuvre sous droits).
- ✅ Aucune donnée personnelle publiée ; carnet anonyme.
- ✅ Pas d'émojis ; fleurons ✦ ; ton sobre et contemplatif.
- ✅ Recopier vers `/tmp/juste_mesure_preview` avant tout aperçu.
