# Stratus, boîte à outils du consultant FinOps

Date : 17 septembre 2026. Statut : validé en conversation (option A, moteur SQL dans le navigateur).

## Objectif

Stratus reste un démonstrateur montrable en entretien et devient un outil utilisable dès l'arrivée en mission : fiches de référence, situations terrain, requêtes SQL prêtes à l'emploi. Tout est aligné sur FOCUS et sur le framework FinOps (certifications Practitioner et FOCUS Analyst).

## Décisions

- Police : IBM Plex Sans ; IBM Plex Mono pour le SQL et les noms de colonnes FOCUS.
- Version FOCUS de référence : 1.2, celle que produisent les exports actuels (AWS 1.2 GA, Google Cloud en preview). Les apports de 1.3 (ratifiée le 5 décembre 2025) et 1.4 (ratifiée le 4 juin 2026) sont documentés dans le référentiel.
- Framework FinOps : version 2026 (4 domaines, 22 capacités, 6 principes).
- Exécution SQL : DuckDB-WASM 1.32.0 chargé depuis jsDelivr à la première exécution. Aucune donnée ne quitte le poste.
- Deux dialectes par requête : DuckDB (FOCUS standard, exécutable dans Stratus et sur un fichier exporté) et BigQuery (export FOCUS Google Cloud, qui présente des écarts de conformité : pas de `Tags`, labels dans `x_Labels`, CUD dans `x_Credits`, pas de colonnes `CommitmentDiscount*`).
- Import d'un fichier FOCUS local (CSV ou Parquet) dans le Labo SQL.
- Hors périmètre : connecteur BigQuery direct, backend, Power BI, quiz d'examen.

## Navigation

1. Démonstration : Vue d'ensemble, Optimisations, Allocation, Simulateur CUD, Méthode. Chaque vue indique la capacité FinOps illustrée.
2. Situations : cas terrain filtrables par phase et domaine.
3. Labo SQL : bibliothèque, favoris, générateur, exécution, import de fichier.
4. Référentiel : Framework FinOps, FOCUS, KPI et formules, avec recherche.

## Données de démonstration au format FOCUS

`dist/data.js` produit des lignes FOCUS 1.2 (37 colonnes) puis agrège la vue utilisée par la démo (`rows`, coût = `EffectiveCost`).

- Un fournisseur (Google Cloud), un compte de facturation, 8 projets (`SubAccountId`), 7 services dont Networking.
- Usage à la demande : `ListCost = ContractedCost = BilledCost = EffectiveCost`.
- Crédit promotionnel de 2 % sur l'usage non couvert, en lignes `ChargeCategory = 'Credit'`.
- Engagement CUD flexible (Spend) de 1 900 € d'équivalent à la demande par jour, remise 28 %, porté par le socle partagé :
  - ligne `Purchase` quotidienne : `BilledCost` = frais, `EffectiveCost` = 0 ;
  - usage couvert (`Used`) : `BilledCost` = 0, `EffectiveCost` = part amortie ;
  - part inutilisée (`Unused`) : `EffectiveCost` = reliquat, autres coûts à 0.
- Invariants testés : par jour, somme `BilledCost` = somme `EffectiveCost` ; par engagement, `EffectiveCost` Usage = `BilledCost` Purchase = Used + Unused ; crédits avec les quatre coûts égaux.
- Tags JSON `team`, `env`, `app` ; Sandbox R&D sans `team`. Croissance du stockage de Nova Intelligence.

## Modules

- `dist/app.js` : routeur, en-tête, délégation des événements.
- `dist/state.js`, `dist/ui.js`, `dist/charts.js` : état, primitives d'interface, graphiques.
- `dist/focus.js` : colonnes, CSV, création de la table DuckDB (partagé avec les tests).
- `dist/sql.js` : chargement DuckDB-WASM, exécution, import de fichier, générateur.
- `dist/views/*.js` : demo, situations, lab, reference.
- `dist/content/*.js` : snippets, situations, référentiel (contenu seul).

## Tests

- `tests/finance.test.js` : invariants FOCUS et d'allocation, modèle CUD.
- `tests/sql.test.js` : chaque snippet DuckDB et chaque combinaison du générateur s'exécute sur la table de démo avec `@duckdb/node-api` (dépendance de développement) ; contrôles de résultats clés (dérive BigQuery détectée, Sandbox non taggée, projection identique à la démo).
- Vérification visuelle des vues en bureau et mobile via Chrome headless.
