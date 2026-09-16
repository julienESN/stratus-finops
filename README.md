# Stratus, boîte à outils FinOps

Démonstrateur et boîte à outils de consultant de Julien Esnault, alignés sur FOCUS et sur le framework FinOps 2026. Toutes les données sont synthétiques. Aucune donnée d’entreprise, clé cloud ou connexion n’est embarquée.

Version en ligne : https://julienesn.github.io/stratus-finops/

## Quatre sections

1. **Démonstration** : un parcours de 5 minutes sur des coûts Google Cloud fictifs au format FOCUS 1.2.
   - *Vue d’ensemble* : projection de fin de mois au-dessus du budget et dérive BigQuery.
   - *Optimisations* : pistes chiffrées, décisions motivées et journal exportable.
   - *Allocation* : coût sans propriétaire, clé de partage et rapprochement au centime.
   - *Simulateur CUD* : gain d’un engagement et risque d’une baisse d’usage.
   - *Méthode* : règles de calcul et passage à un export réel.
2. **Situations** : 12 cas rencontrés en arrivant chez un client (facture qui grimpe, coûts sans propriétaire, engagement sous-utilisé, hors-prod allumée…). Chaque fiche donne les signaux, les requêtes, les actions, les KPI et le piège fréquent.
3. **Labo SQL** : 18 requêtes FOCUS, un générateur, des favoris et l’exécution dans le navigateur avec DuckDB-WASM.
   - **DuckDB, FOCUS standard** : s’exécute ici, et tel quel avec DuckDB sur un export FOCUS AWS, Azure ou la démo.
   - **BigQuery, export Google Cloud** : adapté aux écarts de l’export FOCUS de Google Cloud (labels dans `x_Labels`, remises CUD dans `x_Credits`, pas de `Tags` ni de colonnes `CommitmentDiscount*`).
   - **Charger un fichier FOCUS** (CSV ou Parquet) : le fichier est lu dans le navigateur, rien n’est envoyé.
4. **Référentiel** : framework FinOps (principes, personas, phases, domaines et capacités), FOCUS (les quatre coûts, anatomie d’une ligne sur des données réelles de la démo, règles, colonnes, exports par fournisseur, versions 1.0 à 1.4) et KPI avec leurs formules en colonnes FOCUS.

## Données de démonstration

`dist/data.js` génère 2 210 lignes FOCUS 1.2 quotidiennes pour août et le 1er au 15 septembre 2026 :

- usage à la demande (les quatre coûts sont égaux) et crédit promotionnel de 2 % en lignes `Credit` ;
- un CUD flexible de 1 900 € d’équivalent à la demande par jour, remise de 28 %, porté par le socle partagé : frais en `Purchase` (`EffectiveCost` = 0), usage couvert en `Used`, reliquat en `Unused` le week-end ;
- tags `team`, `env`, `app` ; la Sandbox R&D n’a pas de `team` ;
- dérive BigQuery à partir du 11 septembre, croissance du stockage de Nova Intelligence, egress réseau d’Orion Platform.

La démo agrège l’`EffectiveCost` par jour, projet et service. L’export « au format FOCUS » de la vue d’ensemble produit un CSV rechargeable dans le Labo SQL ou dans DuckDB.

## Exécuter localement

Servir le dossier `dist` avec un serveur HTTP statique :

```sh
python3 -m http.server 4173 --directory dist
```

Ouvrir http://localhost:4173. Le chargement direct de `index.html` via `file://` n’est pas pris en charge (modules JavaScript).

Le moteur SQL (DuckDB-WASM 1.32.0, environ 7 Mo) et les polices IBM Plex sont chargés depuis jsDelivr et Google Fonts. Le reste de l’application fonctionne sans le moteur SQL : les requêtes restent copiables.

## Vérifications

Le workflow `.github/workflows/pages.yml` lance les tests à chaque push sur `main` et ne publie le site que s’ils passent.

```sh
npm install
npm test
```

- `tests/finance.test.js` : valeurs autorisées FOCUS, règles de coût (crédits, achats, `Used`, `Unused`), égalité quotidienne `BilledCost` = `EffectiveCost`, allocation au centime, modèle du simulateur.
- `tests/sql.test.js` : chaque requête DuckDB de la bibliothèque et chaque option du générateur s’exécute sur la démo avec `@duckdb/node-api`. Les résultats clés sont contrôlés : dérive détectée le 11 septembre, Sandbox seule sans équipe, projection identique à la vue d’ensemble, décomposition des économies qui retombe sur le coût effectif.

## Structure

- `dist/app.js` : navigation (`#section/détail`), en-tête et délégation des clics.
- `dist/state.js`, `dist/ui.js`, `dist/charts.js` : état et session, primitives d’interface, graphiques SVG.
- `dist/data.js`, `dist/focus.js` : données FOCUS, agrégation, allocation, modèle CUD, export CSV et table DuckDB.
- `dist/sql.js` : générateur de requêtes, chargement de DuckDB-WASM, exécution et import de fichier.
- `dist/views/` : `demo.js`, `situations.js`, `lab.js`, `reference.js`.
- `dist/content/` : `snippets.js`, `situations.js`, `reference.js` (contenu seul).
- `dist/styles.css` : interface sobre, police IBM Plex Sans et Plex Mono, une seule couleur d’accent, totaux soulignés d’un double filet.
- `docs/superpowers/specs/` : spécification de la boîte à outils.

## Limites assumées

- Les requêtes BigQuery ne sont pas exécutées par les tests : elles suivent le schéma documenté par Google pour l’export FOCUS (preview) et doivent être validées sur un mois connu chez le client.
- S3NS et les clouds de confiance : vérifier sur place la disponibilité et le format de l’export de facturation.
- Pas de backend, de connecteur BigQuery direct, d’authentification ni d’intégration comptable. Les recommandations de la démo sont des scénarios documentés, pas des détections automatiques.
- Le simulateur CUD est un modèle pédagogique (sans granularité horaire, conditions SKU ni remises existantes), pas un calculateur contractuel.
- Décisions de la démo en `sessionStorage` (onglet courant) ; favoris du Labo en `localStorage` (navigateur courant).
