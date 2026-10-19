// Bibliothèque de requêtes FOCUS.
// `duckdb` : FOCUS standard, exécutable dans Stratus et sur un export FOCUS local (AWS, Azure, démo).
// `bigquery` : export FOCUS Google Cloud (preview), qui n'a ni Tags, ni ServiceCategory, ni colonnes CommitmentDiscount*.
// Les labels y sont dans x_Labels / x_ProjectLabels et les remises CUD dans x_Credits.

export const BQ_TABLE = '`PROJET.gcp_billing_immutable_COMPTE_LOC.gcp_billing_export_focus_COMPTE`';

const BQ_HEADER = '-- Export FOCUS Google Cloud : remplacer PROJET, COMPTE (compte de facturation) et LOC (localisation du dataset).\n';

const bq = (sql) => BQ_HEADER + sql.trim();

// Dernier mois de facturation présent dans les données (portable d'un export à l'autre).
const LATEST = 'BillingPeriodStart = (SELECT MAX(BillingPeriodStart) FROM focus)';

// Label d'équipe côté Google Cloud : label de la ressource, sinon label du projet.
const bqLabel = (key, alias) => `COALESCE(
      (SELECT l.Value FROM UNNEST(x_Labels) AS l WHERE l.Key = '${key}'),
      (SELECT l.Value FROM UNNEST(x_ProjectLabels) AS l WHERE l.Key = '${key}')
    ) AS ${alias}`;

export const snippets = [
  {
    id: 'data-quality',
    title: { fr: 'Contrôler la qualité d’un export FOCUS', en: 'Check the quality of a FOCUS export' },
    question: { fr: 'L’export est-il complet et conforme avant d’en tirer des conclusions ?', en: 'Is the export complete and compliant before drawing any conclusions from it?' },
    capability: { fr: 'Data Ingestion', en: 'Data Ingestion' },
    duckdb: `-- Premier réflexe : volume, période couverte et écarts aux règles FOCUS
SELECT 'Lignes' AS controle, COUNT(*) AS valeur FROM focus
UNION ALL
SELECT 'Jours couverts', COUNT(DISTINCT CAST(ChargePeriodStart AS DATE)) FROM focus
UNION ALL
SELECT 'ChargeCategory hors valeurs FOCUS', COUNT(*) FROM focus
WHERE ChargeCategory NOT IN ('Usage', 'Purchase', 'Tax', 'Credit', 'Adjustment')
UNION ALL
SELECT 'Coûts à NULL', COUNT(*) FROM focus
WHERE BilledCost IS NULL OR EffectiveCost IS NULL OR ListCost IS NULL OR ContractedCost IS NULL
UNION ALL
SELECT 'Achats avec EffectiveCost non nul', COUNT(*) FROM focus
WHERE ChargeCategory = 'Purchase' AND EffectiveCost <> 0
UNION ALL
SELECT 'Usage sans SubAccountId', COUNT(*) FROM focus
WHERE ChargeCategory = 'Usage' AND SubAccountId IS NULL
UNION ALL
SELECT 'Lignes de correction', COUNT(*) FROM focus
WHERE ChargeClass = 'Correction';`,
    bigquery: bq(`
WITH recent AS (
  SELECT * FROM ${BQ_TABLE}
  WHERE ChargePeriodStart >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 35 DAY)
)
SELECT 'Lignes' AS controle, COUNT(*) AS valeur FROM recent
UNION ALL
SELECT 'Jours couverts', COUNT(DISTINCT DATE(ChargePeriodStart)) FROM recent
UNION ALL
SELECT 'ChargeCategory hors valeurs FOCUS', COUNT(*) FROM recent
WHERE ChargeCategory NOT IN ('Usage', 'Purchase', 'Tax', 'Credit', 'Adjustment')
UNION ALL
SELECT 'Coûts à NULL', COUNT(*) FROM recent
WHERE BilledCost IS NULL OR EffectiveCost IS NULL OR ListCost IS NULL OR ContractedCost IS NULL
UNION ALL
SELECT 'Usage sans SubAccountId', COUNT(*) FROM recent
WHERE ChargeCategory = 'Usage' AND SubAccountId IS NULL
UNION ALL
SELECT 'Lignes portant des crédits (x_Credits)', COUNT(*) FROM recent
WHERE ARRAY_LENGTH(x_Credits) > 0;`),
    bigqueryNote: { fr: 'Les colonnes de l’export Google Cloud sont toutes NULLABLE : le contrôle des NULL est encore plus utile.', en: 'All columns in the Google Cloud export are NULLABLE: the NULL check is even more useful here.' },
    reading: { fr: 'Tous les contrôles, sauf le volume et les jours, doivent valoir 0. Un nombre de jours inférieur à la période attendue signale un export incomplet ou un mois non clôturé.', en: 'All checks, except volume and days, must equal 0. A day count below the expected period points to an incomplete export or a month not yet closed.' },
  },
  {
    id: 'billed-by-period',
    title: { fr: 'Rapprocher le coût facturé de la facture', en: 'Reconcile billed cost with the invoice' },
    question: { fr: 'Le total BilledCost du mois correspond-il à la facture ?', en: 'Does the monthly BilledCost total match the invoice?' },
    capability: { fr: 'Invoicing & Chargeback', en: 'Invoicing & Chargeback' },
    duckdb: `-- À comparer au montant de la facture de chaque période
SELECT
  CAST(BillingPeriodStart AS DATE) AS periode,
  ChargeCategory,
  ROUND(SUM(BilledCost), 2) AS cout_facture,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif
FROM focus
GROUP BY ALL
ORDER BY periode, ChargeCategory;`,
    bigquery: bq(`
SELECT
  DATE(BillingPeriodStart) AS periode,
  ChargeCategory,
  ROUND(SUM(BilledCost), 2) AS cout_facture,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif
FROM ${BQ_TABLE}
WHERE BillingPeriodStart >= TIMESTAMP(DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 2 MONTH))
GROUP BY ALL
ORDER BY periode, ChargeCategory;`),
    bigqueryNote: { fr: 'L’export Google Cloud ne fournit pas InvoiceId : le rapprochement se fait par période de facturation.', en: 'The Google Cloud export does not provide InvoiceId: reconciliation is done by billing period.' },
    reading: { fr: 'BilledCost se compare à la facture, EffectiveCost au pilotage. Sur un mois complet, les deux totaux se rejoignent quand les engagements sont payés au fil de l’eau ; un achat initial les écarte.', en: 'BilledCost is compared with the invoice, EffectiveCost with the management view. On a full month, the two totals match when commitments are paid as you go; an upfront purchase pulls them apart.' },
  },
  {
    id: 'cost-by-service',
    title: { fr: 'Coûts du mois par service', en: 'Monthly cost by service' },
    question: { fr: 'Où part l’argent ce mois-ci, et quelles économies sont déjà acquises ?', en: 'Where is the money going this month, and which savings are already secured?' },
    capability: { fr: 'Reporting & Analytics', en: 'Reporting & Analytics' },
    duckdb: `SELECT
  ServiceCategory,
  ServiceName,
  ROUND(SUM(BilledCost), 2) AS cout_facture,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif,
  ROUND(SUM(CASE WHEN ChargeCategory = 'Usage' THEN ListCost - EffectiveCost ELSE 0 END), 2) AS economies_vs_prix_public
FROM focus
WHERE ${LATEST}
GROUP BY ALL
ORDER BY cout_effectif DESC;`,
    bigquery: bq(`
SELECT
  ServiceName,
  ROUND(SUM(BilledCost), 2) AS cout_facture,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif,
  ROUND(SUM(ListCost - EffectiveCost), 2) AS economies_vs_prix_public
FROM ${BQ_TABLE}
WHERE DATE(BillingPeriodStart) = DATE_TRUNC(CURRENT_DATE(), MONTH)
GROUP BY ALL
ORDER BY cout_effectif DESC;`),
    bigqueryNote: { fr: 'ServiceCategory n’existe pas dans l’export Google Cloud : regroupement par ServiceName uniquement.', en: 'ServiceCategory does not exist in the Google Cloud export: grouping by ServiceName only.' },
    reading: { fr: 'Lire EffectiveCost pour savoir ce que consomme chaque service. Un BilledCost très supérieur à EffectiveCost signale un achat d’engagement porté par ce service.', en: 'Read EffectiveCost to see what each service consumes. A BilledCost well above EffectiveCost signals a commitment purchase carried by that service.' },
  },
  {
    id: 'cost-by-project',
    title: { fr: 'Coûts du mois par projet et équipe', en: 'Monthly cost by project and team' },
    question: { fr: 'Quels projets et quelles équipes pèsent le plus ?', en: 'Which projects and teams weigh the most?' },
    capability: { fr: 'Allocation', en: 'Allocation' },
    duckdb: `SELECT
  SubAccountId,
  SubAccountName,
  json_extract_string(Tags, '$.team') AS equipe,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif,
  ROUND(100 * SUM(EffectiveCost) / SUM(SUM(EffectiveCost)) OVER (), 1) AS part_pct
FROM focus
WHERE ${LATEST}
GROUP BY ALL
ORDER BY cout_effectif DESC;`,
    bigquery: bq(`
WITH lignes AS (
  SELECT
    SubAccountId,
    SubAccountName,
    EffectiveCost,
    ${bqLabel('team', 'equipe')}
  FROM ${BQ_TABLE}
  WHERE DATE(BillingPeriodStart) = DATE_TRUNC(CURRENT_DATE(), MONTH)
)
SELECT
  SubAccountId,
  SubAccountName,
  equipe,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif,
  ROUND(100 * SUM(EffectiveCost) / SUM(SUM(EffectiveCost)) OVER (), 1) AS part_pct
FROM lignes
GROUP BY ALL
ORDER BY cout_effectif DESC;`),
    bigqueryNote: { fr: 'Chez Google Cloud, SubAccountId est l’identifiant du projet. Les labels sont lus dans x_Labels, puis dans x_ProjectLabels.', en: 'In Google Cloud, SubAccountId is the project ID. Labels are read from x_Labels, then from x_ProjectLabels.' },
    reading: { fr: 'Une équipe vide désigne un coût sans propriétaire. « shared » n’est pas un coût non alloué : il attend une clé de répartition.', en: 'An empty team means a cost with no owner. “shared” is not an unallocated cost: it is waiting for an allocation key.' },
  },
  {
    id: 'allocation-rate',
    title: { fr: 'Taux de coûts alloués', en: 'Allocated cost rate' },
    question: { fr: 'Quelle part du coût a une équipe responsable ?', en: 'What share of the cost has a responsible team?' },
    capability: { fr: 'Allocation', en: 'Allocation' },
    duckdb: `SELECT
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif_total,
  ROUND(SUM(CASE WHEN json_extract_string(Tags, '$.team') IS NULL THEN EffectiveCost ELSE 0 END), 2) AS cout_sans_equipe,
  ROUND(SUM(CASE WHEN json_extract_string(Tags, '$.team') = 'shared' THEN EffectiveCost ELSE 0 END), 2) AS cout_partage,
  ROUND(100 * SUM(CASE WHEN json_extract_string(Tags, '$.team') IS NOT NULL THEN EffectiveCost ELSE 0 END)
    / NULLIF(SUM(EffectiveCost), 0), 1) AS taux_alloue_pct
FROM focus
WHERE ${LATEST};`,
    bigquery: bq(`
WITH lignes AS (
  SELECT
    EffectiveCost,
    ${bqLabel('team', 'equipe')}
  FROM ${BQ_TABLE}
  WHERE DATE(BillingPeriodStart) = DATE_TRUNC(CURRENT_DATE(), MONTH)
)
SELECT
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif_total,
  ROUND(SUM(IF(equipe IS NULL, EffectiveCost, 0)), 2) AS cout_sans_equipe,
  ROUND(SUM(IF(equipe = 'shared', EffectiveCost, 0)), 2) AS cout_partage,
  ROUND(100 * SUM(IF(equipe IS NOT NULL, EffectiveCost, 0)) / NULLIF(SUM(EffectiveCost), 0), 1) AS taux_alloue_pct
FROM lignes;`),
    reading: { fr: 'C’est le KPI d’Allocation le plus suivi. Le framework ne fixe pas de seuil : on se fixe une cible avec le client et on suit la tendance mois après mois.', en: 'This is the most tracked Allocation KPI. The framework sets no threshold: agree a target with the client and track the trend month after month.' },
  },
  {
    id: 'untagged-cost',
    title: { fr: 'Coûts sans tag team', en: 'Costs without a team tag' },
    question: { fr: 'Où se trouvent les coûts sans propriétaire ?', en: 'Where are the costs with no owner?' },
    capability: { fr: 'Allocation', en: 'Allocation' },
    duckdb: `SELECT
  SubAccountId,
  ServiceName,
  COUNT(DISTINCT ResourceId) AS ressources,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif
FROM focus
WHERE json_extract_string(Tags, '$.team') IS NULL
  AND ${LATEST}
GROUP BY ALL
ORDER BY cout_effectif DESC;`,
    bigquery: bq(`
WITH lignes AS (
  SELECT
    SubAccountId,
    ServiceName,
    ResourceId,
    EffectiveCost,
    ${bqLabel('team', 'equipe')}
  FROM ${BQ_TABLE}
  WHERE DATE(BillingPeriodStart) = DATE_TRUNC(CURRENT_DATE(), MONTH)
)
SELECT
  SubAccountId,
  ServiceName,
  COUNT(DISTINCT ResourceId) AS ressources,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif
FROM lignes
WHERE equipe IS NULL
GROUP BY ALL
ORDER BY cout_effectif DESC;`),
    reading: { fr: 'Traiter d’abord les plus gros montants. Un projet entier sans tag se règle par une règle de rattachement au projet, plus vite qu’en taguant chaque ressource.', en: 'Start with the largest amounts. A whole project without tags is fixed with a project-level attribution rule, which is faster than tagging each resource.' },
  },
  {
    id: 'daily-anomalies',
    title: { fr: 'Détecter les hausses anormales jour par jour', en: 'Detect abnormal daily increases' },
    question: { fr: 'Quel service a dérapé, dans quel projet et depuis quand ?', en: 'Which service went off track, in which project, and since when?' },
    capability: { fr: 'Anomaly Management', en: 'Anomaly Management' },
    duckdb: `-- Consommation au prix contractuel : les effets d'engagement et de crédit ne créent pas de fausses alertes
WITH quotidien AS (
  SELECT
    CAST(ChargePeriodStart AS DATE) AS jour,
    SubAccountId,
    ServiceName,
    SUM(ContractedCost) AS cout
  FROM focus
  WHERE ChargeCategory = 'Usage'
  GROUP BY ALL
),
score AS (
  SELECT *,
    AVG(cout) OVER w AS moyenne_7j,
    STDDEV_SAMP(cout) OVER w AS ecart_type_7j,
    COUNT(cout) OVER w AS jours_historique
  FROM quotidien
  WINDOW w AS (PARTITION BY SubAccountId, ServiceName ORDER BY jour ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING)
)
SELECT
  jour,
  SubAccountId,
  ServiceName,
  ROUND(cout, 2) AS cout_du_jour,
  ROUND(moyenne_7j, 2) AS moyenne_7_jours,
  ROUND(cout - moyenne_7j, 2) AS hausse
FROM score
WHERE jours_historique = 7
  AND cout > moyenne_7j + 3 * ecart_type_7j
  AND cout - moyenne_7j > 100
ORDER BY jour DESC, hausse DESC;`,
    bigquery: bq(`
WITH quotidien AS (
  SELECT
    DATE(ChargePeriodStart) AS jour,
    SubAccountId,
    ServiceName,
    SUM(ContractedCost) AS cout
  FROM ${BQ_TABLE}
  WHERE ChargePeriodStart >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY)
  GROUP BY ALL
),
score AS (
  SELECT *,
    AVG(cout) OVER w AS moyenne_7j,
    STDDEV_SAMP(cout) OVER w AS ecart_type_7j,
    COUNT(cout) OVER w AS jours_historique
  FROM quotidien
  WINDOW w AS (PARTITION BY SubAccountId, ServiceName ORDER BY jour ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING)
)
SELECT
  jour,
  SubAccountId,
  ServiceName,
  ROUND(cout, 2) AS cout_du_jour,
  ROUND(moyenne_7j, 2) AS moyenne_7_jours,
  ROUND(cout - moyenne_7j, 2) AS hausse
FROM score
WHERE jours_historique = 7
  AND cout > moyenne_7j + 3 * ecart_type_7j
  AND cout - moyenne_7j > 100
ORDER BY jour DESC, hausse DESC;`),
    bigqueryNote: { fr: 'Le dernier jour de l’export Google Cloud peut être incomplet : l’ignorer avant de lever une alerte.', en: 'The last day of the Google Cloud export may be incomplete: ignore it before raising an alert.' },
    reading: { fr: 'Le premier jour listé pour un couple projet et service est la date de rupture. Il faut 7 jours d’historique avant de juger un jour. Ajuster les seuils (3 écarts-types, 100 €) à la taille du périmètre.', en: 'The first listed day for a project and service pair is the break date. Seven days of history are needed before judging a day. Adjust the thresholds (3 standard deviations, €100) to the size of the scope.' },
  },
  {
    id: 'bigquery-scans',
    title: { fr: 'BigQuery : volume analysé et coût par Tio', en: 'BigQuery: data scanned and cost per TiB' },
    question: { fr: 'La hausse BigQuery vient-elle du volume lu ou du prix ?', en: 'Does the BigQuery increase come from the volume read or from the price?' },
    capability: { fr: 'Usage Optimization', en: 'Usage Optimization' },
    duckdb: `-- Vérifier d'abord les unités : SELECT DISTINCT ConsumedUnit FROM focus WHERE ServiceName = 'BigQuery'
SELECT
  CAST(ChargePeriodStart AS DATE) AS jour,
  SubAccountId,
  ROUND(SUM(ConsumedQuantity), 1) AS tio_analyses,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif,
  ROUND(SUM(EffectiveCost) / NULLIF(SUM(ConsumedQuantity), 0), 2) AS cout_par_tio
FROM focus
WHERE ServiceName = 'BigQuery'
  AND ChargeCategory = 'Usage'
  AND ConsumedUnit = 'TiB'
  AND ChargePeriodStart >= (SELECT MAX(ChargePeriodStart) FROM focus) - INTERVAL 13 DAY
GROUP BY ALL
ORDER BY jour DESC, cout_effectif DESC;`,
    bigquery: bq(`
SELECT
  DATE(ChargePeriodStart) AS jour,
  SubAccountId,
  ConsumedUnit,
  ROUND(SUM(ConsumedQuantity), 1) AS quantite,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif,
  ROUND(SUM(EffectiveCost) / NULLIF(SUM(ConsumedQuantity), 0), 4) AS cout_unitaire
FROM ${BQ_TABLE}
WHERE ServiceName = 'BigQuery'
  AND ChargePeriodStart >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY)
GROUP BY ALL
ORDER BY jour DESC, cout_effectif DESC;`),
    bigqueryNote: { fr: 'Les SKU BigQuery mélangent analyse, stockage et slots : la requête garde ConsumedUnit pour ne pas additionner des unités différentes.', en: 'BigQuery SKUs mix analysis, storage and slots: the query keeps ConsumedUnit so that different units are not added together.' },
    reading: { fr: 'Un coût par Tio stable avec des Tio en hausse désigne une requête qui lit trop. Un coût par Tio en hausse désigne un changement de tarif ou d’édition.', en: 'A stable cost per TiB with rising TiB volume points to a query that reads too much. A rising cost per TiB points to a pricing or edition change.' },
  },
  {
    id: 'commitment-utilization',
    title: { fr: 'Utilisation quotidienne des engagements', en: 'Daily commitment utilization' },
    question: { fr: 'Paie-t-on une part d’engagement qui n’est pas consommée ?', en: 'Are we paying for a committed share that goes unused?' },
    capability: { fr: 'Rate Optimization', en: 'Rate Optimization' },
    duckdb: `SELECT
  CAST(ChargePeriodStart AS DATE) AS jour,
  CommitmentDiscountName,
  ROUND(SUM(CASE WHEN CommitmentDiscountStatus = 'Used' THEN EffectiveCost ELSE 0 END), 2) AS utilise,
  ROUND(SUM(CASE WHEN CommitmentDiscountStatus = 'Unused' THEN EffectiveCost ELSE 0 END), 2) AS inutilise,
  ROUND(100 * SUM(CASE WHEN CommitmentDiscountStatus = 'Used' THEN EffectiveCost ELSE 0 END)
    / NULLIF(SUM(EffectiveCost), 0), 1) AS utilisation_pct
FROM focus
WHERE ChargeCategory = 'Usage'
  AND CommitmentDiscountId IS NOT NULL
  AND ${LATEST}
GROUP BY ALL
ORDER BY jour;`,
    bigquery: bq(`
-- Pas de CommitmentDiscountStatus dans l'export Google Cloud : on suit les crédits CUD par jour.
SELECT
  DATE(ChargePeriodStart) AS jour,
  c.Type AS type_credit,
  ROUND(SUM(c.Amount), 2) AS montant_credit
FROM ${BQ_TABLE}, UNNEST(x_Credits) AS c
WHERE ChargePeriodStart >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND c.Type IN ('COMMITTED_USAGE_DISCOUNT', 'COMMITTED_USAGE_DISCOUNT_DOLLAR_BASE')
GROUP BY ALL
ORDER BY jour, type_credit;`),
    bigqueryNote: { fr: 'L’export Google Cloud (preview) ne fournit pas les colonnes CommitmentDiscount* : l’utilisation exacte se lit dans le rapport des CUD de la console Billing.', en: 'The Google Cloud export (preview) does not provide the CommitmentDiscount* columns: exact utilization is read in the CUD report of the Billing console.' },
    reading: { fr: 'L’utilisation se calcule engagement par engagement : Used ÷ (Used + Unused). Des creux réguliers le week-end indiquent un engagement dimensionné sur la semaine et non sur le socle.', en: 'Utilization is calculated commitment by commitment: Used ÷ (Used + Unused). Regular weekend dips indicate a commitment sized on the weekday load rather than on the base load.' },
  },
  {
    id: 'commitment-coverage',
    title: { fr: 'Couverture des engagements', en: 'Commitment coverage' },
    question: { fr: 'Quelle part de la consommation éligible est couverte ?', en: 'What share of the eligible consumption is covered?' },
    capability: { fr: 'Rate Optimization', en: 'Rate Optimization' },
    duckdb: `SELECT
  ServiceName,
  ROUND(SUM(ContractedCost), 2) AS eligible_a_la_demande,
  ROUND(SUM(CASE WHEN CommitmentDiscountStatus = 'Used' THEN ContractedCost ELSE 0 END), 2) AS couvert,
  ROUND(100 * SUM(CASE WHEN CommitmentDiscountStatus = 'Used' THEN ContractedCost ELSE 0 END)
    / NULLIF(SUM(ContractedCost), 0), 1) AS couverture_pct
FROM focus
WHERE ChargeCategory = 'Usage'
  AND ServiceCategory = 'Compute'
  AND (CommitmentDiscountStatus IS NULL OR CommitmentDiscountStatus = 'Used')
  AND ${LATEST}
GROUP BY ALL
ORDER BY eligible_a_la_demande DESC;`,
    bigquery: bq(`
WITH lignes AS (
  SELECT
    ServiceName,
    ContractedCost,
    EXISTS(SELECT 1 FROM UNNEST(x_Credits) AS c WHERE c.Type LIKE 'COMMITTED_USAGE_DISCOUNT%') AS couvert
  FROM ${BQ_TABLE}
  WHERE DATE(BillingPeriodStart) = DATE_TRUNC(CURRENT_DATE(), MONTH)
    AND ServiceName IN ('Compute Engine', 'Kubernetes Engine')
)
SELECT
  ServiceName,
  ROUND(SUM(ContractedCost), 2) AS eligible_a_la_demande,
  ROUND(100 * SUM(IF(couvert, ContractedCost, 0)) / NULLIF(SUM(ContractedCost), 0), 1) AS couverture_approx_pct
FROM lignes
GROUP BY ServiceName
ORDER BY eligible_a_la_demande DESC;`),
    bigqueryNote: { fr: 'Approximation : sans colonnes d’engagement, une ligne partiellement couverte compte entièrement. Adapter la liste des services éligibles au type de CUD.', en: 'Approximation: without commitment columns, a partially covered line counts in full. Adapt the list of eligible services to the type of CUD.' },
    reading: { fr: 'La couverture se lit avec l’utilisation : une couverture haute et une utilisation basse signalent un engagement trop gros. ServiceCategory = Compute est une approximation du périmètre éligible.', en: 'Coverage is read together with utilization: high coverage and low utilization signal a commitment that is too large. ServiceCategory = Compute is an approximation of the eligible scope.' },
  },
  {
    id: 'effective-savings-rate',
    title: { fr: 'Taux d’économie effectif (ESR)', en: 'Effective savings rate (ESR)' },
    question: { fr: 'Que rapportent réellement les engagements, part inutilisée comprise ?', en: 'What do the commitments really save, unused share included?' },
    capability: { fr: 'Rate Optimization', en: 'Rate Optimization' },
    duckdb: `-- ESR = 1 - EffectiveCost / équivalent à la demande, sur l'usage éligible
SELECT
  ROUND(SUM(ContractedCost), 2) AS equivalent_a_la_demande,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif,
  ROUND(SUM(ContractedCost) - SUM(EffectiveCost), 2) AS economies_nettes,
  ROUND(100 * (1 - SUM(EffectiveCost) / NULLIF(SUM(ContractedCost), 0)), 1) AS esr_pct
FROM focus
WHERE ChargeCategory = 'Usage'
  AND ServiceCategory = 'Compute'
  AND ${LATEST};`,
    bigquery: bq(`
SELECT
  ROUND(SUM(ContractedCost), 2) AS equivalent_a_la_demande,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif,
  ROUND(100 * (1 - SUM(EffectiveCost) / NULLIF(SUM(ContractedCost), 0)), 1) AS esr_pct
FROM ${BQ_TABLE}
WHERE ServiceName IN ('Compute Engine', 'Kubernetes Engine')
  AND DATE(BillingPeriodStart) = DATE_TRUNC(CURRENT_DATE(), MONTH);`),
    bigqueryNote: { fr: 'À valider sur un mois connu : vérifier que EffectiveCost intègre bien les remises CUD dans l’export Google Cloud avant de présenter ce chiffre.', en: 'To validate on a month you know: check that EffectiveCost does include the CUD discounts in the Google Cloud export before presenting this figure.' },
    reading: { fr: 'Les lignes Unused ont un EffectiveCost sans équivalent à la demande : elles font baisser l’ESR, ce qui est voulu. L’ESR résume utilisation, couverture et remise en un seul chiffre.', en: 'Unused lines carry an EffectiveCost with no on-demand equivalent: they lower the ESR, which is intended. The ESR sums up utilization, coverage and discount in a single figure.' },
  },
  {
    id: 'savings-breakdown',
    title: { fr: 'Décomposer les économies', en: 'Break down the savings' },
    question: { fr: 'D’où viennent les économies : négociation, engagements ou crédits ?', en: 'Where do the savings come from: negotiation, commitments or credits?' },
    capability: { fr: 'KPIs & Benchmarking', en: 'KPIs & Benchmarking' },
    duckdb: `-- Prix public - remises négociées - économies d'engagement - crédits = coût effectif
SELECT
  ROUND(SUM(CASE WHEN ChargeCategory = 'Usage' THEN ListCost ELSE 0 END), 2) AS cout_au_prix_public,
  ROUND(SUM(CASE WHEN ChargeCategory = 'Usage' THEN ListCost - ContractedCost ELSE 0 END), 2) AS remises_negociees,
  ROUND(SUM(CASE WHEN ChargeCategory = 'Usage' THEN ContractedCost - EffectiveCost ELSE 0 END), 2) AS economies_engagements_nettes,
  ROUND(-SUM(CASE WHEN ChargeCategory = 'Credit' THEN EffectiveCost ELSE 0 END), 2) AS credits,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif
FROM focus
WHERE ${LATEST};`,
    bigquery: bq(`
WITH lignes AS (
  SELECT * FROM ${BQ_TABLE}
  WHERE DATE(BillingPeriodStart) = DATE_TRUNC(CURRENT_DATE(), MONTH)
)
SELECT 'Remises négociées (ListCost - ContractedCost)' AS poste, ROUND(SUM(ListCost - ContractedCost), 2) AS montant
FROM lignes
UNION ALL
SELECT CONCAT('Crédit ', c.Type), ROUND(-SUM(c.Amount), 2)
FROM lignes, UNNEST(x_Credits) AS c
GROUP BY c.Type
ORDER BY montant DESC;`),
    bigqueryNote: { fr: 'Chez Google Cloud, crédits et remises CUD sont détaillés par type dans x_Credits (COMMITTED_USAGE_DISCOUNT, SUSTAINED_USAGE_DISCOUNT, PROMOTION…).', en: 'In Google Cloud, credits and CUD discounts are detailed by type in x_Credits (COMMITTED_USAGE_DISCOUNT, SUSTAINED_USAGE_DISCOUNT, PROMOTION…).' },
    reading: { fr: 'Les crédits promotionnels ne sont pas une optimisation durable : les présenter à part. Les économies d’engagement sont nettes de la part inutilisée.', en: 'Promotional credits are not a lasting optimization: show them separately. Commitment savings are net of the unused share.' },
  },
  {
    id: 'billed-vs-effective',
    title: { fr: 'Facturé ou amorti : qui paie l’engagement ?', en: 'Billed or amortized: who pays for the commitment?' },
    question: { fr: 'Pourquoi un projet paie-t-il plus que ce qu’il consomme ?', en: 'Why does a project pay more than it consumes?' },
    capability: { fr: 'Invoicing & Chargeback', en: 'Invoicing & Chargeback' },
    duckdb: `SELECT
  SubAccountId,
  ROUND(SUM(BilledCost), 2) AS cout_facture,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif,
  ROUND(SUM(BilledCost) - SUM(EffectiveCost), 2) AS ecart
FROM focus
WHERE ${LATEST}
GROUP BY ALL
ORDER BY ecart DESC;`,
    bigquery: bq(`
SELECT
  SubAccountId,
  ROUND(SUM(BilledCost), 2) AS cout_facture,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif,
  ROUND(SUM(BilledCost) - SUM(EffectiveCost), 2) AS ecart
FROM ${BQ_TABLE}
WHERE DATE(BillingPeriodStart) = DATE_TRUNC(CURRENT_DATE(), MONTH)
GROUP BY ALL
ORDER BY ecart DESC;`),
    reading: { fr: 'Le projet qui achète l’engagement a un écart positif, ceux qui en profitent un écart négatif. Refacturer en EffectiveCost répartit l’avantage là où la consommation a lieu.', en: 'The project that buys the commitment shows a positive gap; those that benefit from it show a negative gap. Re-billing at EffectiveCost spreads the benefit to where the consumption happens.' },
  },
  {
    id: 'non-prod-weekend',
    title: { fr: 'Hors-production : week-end contre semaine', en: 'Non-production: weekend vs weekday' },
    question: { fr: 'Les environnements hors production s’arrêtent-ils vraiment ?', en: 'Do the non-production environments really shut down?' },
    capability: { fr: 'Usage Optimization', en: 'Usage Optimization' },
    duckdb: `WITH quotidien AS (
  SELECT
    CAST(ChargePeriodStart AS DATE) AS jour,
    json_extract_string(Tags, '$.env') AS environnement,
    SUM(ListCost) AS consommation
  FROM focus
  WHERE ChargeCategory = 'Usage' AND ListCost > 0
  GROUP BY ALL
)
SELECT
  environnement,
  ROUND(AVG(CASE WHEN dayofweek(jour) NOT IN (0, 6) THEN consommation END), 2) AS moyenne_semaine,
  ROUND(AVG(CASE WHEN dayofweek(jour) IN (0, 6) THEN consommation END), 2) AS moyenne_week_end,
  ROUND(100 * AVG(CASE WHEN dayofweek(jour) IN (0, 6) THEN consommation END)
    / NULLIF(AVG(CASE WHEN dayofweek(jour) NOT IN (0, 6) THEN consommation END), 0)) AS week_end_vs_semaine_pct
FROM quotidien
GROUP BY environnement
ORDER BY week_end_vs_semaine_pct DESC;`,
    bigquery: bq(`
WITH lignes AS (
  SELECT
    DATE(ChargePeriodStart) AS jour,
    ListCost,
    ${bqLabel('env', 'environnement')}
  FROM ${BQ_TABLE}
  WHERE ChargePeriodStart >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 28 DAY)
    AND ListCost > 0
),
quotidien AS (
  SELECT jour, environnement, SUM(ListCost) AS consommation
  FROM lignes
  GROUP BY ALL
)
SELECT
  environnement,
  ROUND(AVG(IF(EXTRACT(DAYOFWEEK FROM jour) NOT IN (1, 7), consommation, NULL)), 2) AS moyenne_semaine,
  ROUND(AVG(IF(EXTRACT(DAYOFWEEK FROM jour) IN (1, 7), consommation, NULL)), 2) AS moyenne_week_end,
  ROUND(100 * AVG(IF(EXTRACT(DAYOFWEEK FROM jour) IN (1, 7), consommation, NULL))
    / NULLIF(AVG(IF(EXTRACT(DAYOFWEEK FROM jour) NOT IN (1, 7), consommation, NULL)), 0)) AS week_end_vs_semaine_pct
FROM quotidien
GROUP BY environnement
ORDER BY week_end_vs_semaine_pct DESC;`),
    bigqueryNote: { fr: 'BigQuery numérote les jours de 1 (dimanche) à 7 (samedi) ; DuckDB de 0 (dimanche) à 6 (samedi).', en: 'BigQuery numbers days from 1 (Sunday) to 7 (Saturday); DuckDB from 0 (Sunday) to 6 (Saturday).' },
    reading: { fr: 'Une hors-production arrêtée la nuit et le week-end tombe bien en dessous de 50 %. Au-dessus de 60 %, elle tourne presque en continu. Le calcul utilise ListCost pour ignorer les effets d’engagement.', en: 'A non-production environment switched off at night and on weekends falls well below 50%. Above 60%, it runs almost continuously. The calculation uses ListCost to ignore commitment effects.' },
  },
  {
    id: 'storage-growth',
    title: { fr: 'Stockage : croissance sur 30 jours', en: 'Storage: growth over 30 days' },
    question: { fr: 'Quel stockage grossit sans limite ?', en: 'Which storage keeps growing without limit?' },
    capability: { fr: 'Usage Optimization', en: 'Usage Optimization' },
    duckdb: `WITH quotidien AS (
  SELECT
    CAST(ChargePeriodStart AS DATE) AS jour,
    SubAccountId,
    SUM(ConsumedQuantity) / 24 AS gio_stockes
  FROM focus
  WHERE ServiceName = 'Cloud Storage'
    AND ChargeCategory = 'Usage'
    AND ConsumedUnit = 'GiB-Hours'
    AND ChargePeriodStart >= (SELECT MAX(ChargePeriodStart) FROM focus) - INTERVAL 29 DAY
  GROUP BY ALL
)
SELECT
  SubAccountId,
  ROUND(arg_min(gio_stockes, jour)) AS gio_debut,
  ROUND(arg_max(gio_stockes, jour)) AS gio_fin,
  ROUND(100 * (arg_max(gio_stockes, jour) / NULLIF(arg_min(gio_stockes, jour), 0) - 1), 1) AS croissance_pct
FROM quotidien
GROUP BY SubAccountId
ORDER BY croissance_pct DESC;`,
    bigquery: bq(`
WITH quotidien AS (
  SELECT
    DATE(ChargePeriodStart) AS jour,
    SubAccountId,
    ConsumedUnit,
    SUM(ConsumedQuantity) AS quantite
  FROM ${BQ_TABLE}
  WHERE ServiceName = 'Cloud Storage'
    AND ChargePeriodStart >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  GROUP BY ALL
)
SELECT
  SubAccountId,
  ConsumedUnit,
  ROUND(ANY_VALUE(quantite HAVING MIN jour)) AS debut,
  ROUND(ANY_VALUE(quantite HAVING MAX jour)) AS fin,
  ROUND(100 * (ANY_VALUE(quantite HAVING MAX jour) / NULLIF(ANY_VALUE(quantite HAVING MIN jour), 0) - 1), 1) AS croissance_pct
FROM quotidien
GROUP BY SubAccountId, ConsumedUnit
ORDER BY croissance_pct DESC;`),
    bigqueryNote: { fr: 'Les unités de stockage Google Cloud varient selon les SKU : la requête garde ConsumedUnit.', en: 'Google Cloud storage units vary by SKU: the query keeps ConsumedUnit.' },
    reading: { fr: 'Une croissance régulière sans palier indique l’absence de règle de cycle de vie. Vérifier la rétention légale avant toute suppression.', en: 'Steady growth with no plateau indicates there is no lifecycle rule. Check legal retention obligations before any deletion.' },
  },
  {
    id: 'network-egress',
    title: { fr: 'Réseau : egress par projet', en: 'Network: egress by project' },
    question: { fr: 'Quel projet envoie des données hors du cloud, et combien cela pèse ?', en: 'Which project sends data out of the cloud, and how much does it weigh?' },
    capability: { fr: 'Architecting & Workload Placement', en: 'Architecting & Workload Placement' },
    duckdb: `WITH projet AS (
  SELECT
    SubAccountId,
    SUM(EffectiveCost) AS cout_total,
    SUM(CASE WHEN ServiceCategory = 'Networking' THEN EffectiveCost ELSE 0 END) AS cout_reseau,
    SUM(CASE WHEN ServiceCategory = 'Networking' THEN ConsumedQuantity ELSE 0 END) AS gio_sortants
  FROM focus
  WHERE ${LATEST}
  GROUP BY SubAccountId
)
SELECT
  SubAccountId,
  ROUND(gio_sortants) AS gio_sortants,
  ROUND(cout_reseau, 2) AS cout_reseau,
  ROUND(100 * cout_reseau / NULLIF(cout_total, 0), 1) AS part_reseau_pct
FROM projet
WHERE cout_reseau <> 0
ORDER BY cout_reseau DESC;`,
    bigquery: bq(`
SELECT
  SubAccountId,
  ServiceName,
  ChargeDescription,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif
FROM ${BQ_TABLE}
WHERE DATE(BillingPeriodStart) = DATE_TRUNC(CURRENT_DATE(), MONTH)
  AND (LOWER(ChargeDescription) LIKE '%egress%' OR ServiceName = 'Networking')
GROUP BY ALL
ORDER BY cout_effectif DESC
LIMIT 50;`),
    bigqueryNote: { fr: 'Chez Google Cloud, l’egress est souvent facturé sous le service de la ressource (Compute Engine, Cloud Storage) : on cherche aussi « egress » dans la description.', en: 'In Google Cloud, egress is often billed under the service of the resource (Compute Engine, Cloud Storage): we also search for “egress” in the description.' },
    reading: { fr: 'Au-delà de quelques pourcents du coût d’un projet, cartographier les flux : inter-régions, Internet, vers un autre cloud.', en: 'Beyond a few percent of a project’s cost, map the flows: inter-region, Internet, to another cloud.' },
  },
  {
    id: 'forecast-month-end',
    title: { fr: 'Projection de fin de mois', en: 'Month-end forecast' },
    question: { fr: 'Où finira le mois si le rythme des 7 derniers jours se maintient ?', en: 'Where will the month end if the pace of the last 7 days holds?' },
    capability: { fr: 'Forecasting', en: 'Forecasting' },
    duckdb: `WITH bornes AS (
  SELECT
    CAST(MAX(ChargePeriodStart) AS DATE) AS dernier_jour,
    CAST(date_trunc('month', MAX(ChargePeriodStart)) AS DATE) AS debut_mois
  FROM focus
),
quotidien AS (
  SELECT CAST(ChargePeriodStart AS DATE) AS jour, SUM(EffectiveCost) AS cout
  FROM focus, bornes
  WHERE CAST(ChargePeriodStart AS DATE) >= debut_mois
  GROUP BY ALL
)
SELECT
  ROUND(SUM(cout), 2) AS realise,
  ROUND(AVG(CASE WHEN jour > dernier_jour - 7 THEN cout END), 2) AS moyenne_7_jours,
  datediff('day', dernier_jour, last_day(dernier_jour)) AS jours_restants,
  ROUND(SUM(cout) + AVG(CASE WHEN jour > dernier_jour - 7 THEN cout END)
    * datediff('day', dernier_jour, last_day(dernier_jour)), 2) AS projection_fin_de_mois
FROM quotidien, bornes
GROUP BY dernier_jour;`,
    bigquery: bq(`
WITH quotidien AS (
  SELECT DATE(ChargePeriodStart) AS jour, SUM(EffectiveCost) AS cout
  FROM ${BQ_TABLE}
  WHERE DATE(ChargePeriodStart) >= DATE_TRUNC(CURRENT_DATE(), MONTH)
  GROUP BY jour
),
bornes AS (
  SELECT MAX(jour) AS dernier_jour FROM quotidien
)
SELECT
  ROUND(SUM(cout), 2) AS realise,
  ROUND(AVG(IF(jour > DATE_SUB(dernier_jour, INTERVAL 7 DAY), cout, NULL)), 2) AS moyenne_7_jours,
  DATE_DIFF(LAST_DAY(dernier_jour), dernier_jour, DAY) AS jours_restants,
  ROUND(SUM(cout) + AVG(IF(jour > DATE_SUB(dernier_jour, INTERVAL 7 DAY), cout, NULL))
    * DATE_DIFF(LAST_DAY(dernier_jour), dernier_jour, DAY), 2) AS projection_fin_de_mois
FROM quotidien CROSS JOIN bornes
GROUP BY dernier_jour;`),
    bigqueryNote: { fr: 'Les données Google Cloud arrivent avec plusieurs heures de retard : exclure le jour en cours pour ne pas sous-estimer la moyenne.', en: 'Google Cloud data arrives several hours late: exclude the current day so as not to underestimate the average.' },
    reading: { fr: 'Extrapolation simple, identique à la vue d’ensemble de la démo. Elle ne connaît ni les événements prévus ni la saisonnalité : la compléter par une prévision construite avec les équipes.', en: 'A simple extrapolation, identical to the overview in the demo. It knows neither planned events nor seasonality: complete it with a forecast built with the teams.' },
  },
  {
    id: 'top-resources',
    title: { fr: 'Les 15 ressources les plus coûteuses', en: 'The 15 most expensive resources' },
    question: { fr: 'Par quelles ressources commencer l’analyse ?', en: 'Which resources should the analysis start with?' },
    capability: { fr: 'Reporting & Analytics', en: 'Reporting & Analytics' },
    duckdb: `SELECT
  ResourceId,
  ResourceType,
  ServiceName,
  SubAccountId,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif
FROM focus
WHERE ChargeCategory = 'Usage'
  AND ${LATEST}
GROUP BY ALL
ORDER BY cout_effectif DESC
LIMIT 15;`,
    bigquery: bq(`
SELECT
  ResourceId,
  ServiceName,
  SubAccountId,
  ROUND(SUM(EffectiveCost), 2) AS cout_effectif
FROM ${BQ_TABLE}
WHERE ChargeCategory = 'Usage'
  AND DATE(BillingPeriodStart) = DATE_TRUNC(CURRENT_DATE(), MONTH)
GROUP BY ALL
ORDER BY cout_effectif DESC
LIMIT 15;`),
    bigqueryNote: { fr: 'ResourceType n’est pas fourni par l’export Google Cloud, et ResourceId n’est renseigné que pour les services qui publient des données au niveau ressource.', en: 'ResourceType is not provided by the Google Cloud export, and ResourceId is only filled in for services that publish resource-level data.' },
    reading: { fr: 'Quelques ressources concentrent souvent l’essentiel du coût : les qualifier avec leurs propriétaires avant de chercher dans la longue traîne.', en: 'A few resources often account for most of the cost: identify them with their owners before digging into the long tail.' },
  },
];

export const snippetById = Object.fromEntries(snippets.map((s) => [s.id, s]));
