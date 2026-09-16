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
    title: 'Contrôler la qualité d’un export FOCUS',
    question: 'L’export est-il complet et conforme avant d’en tirer des conclusions ?',
    capability: 'Data Ingestion',
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
    bigqueryNote: 'Les colonnes de l’export Google Cloud sont toutes NULLABLE : le contrôle des NULL est encore plus utile.',
    reading: 'Tous les contrôles, sauf le volume et les jours, doivent valoir 0. Un nombre de jours inférieur à la période attendue signale un export incomplet ou un mois non clôturé.',
  },
  {
    id: 'billed-by-period',
    title: 'Rapprocher le coût facturé de la facture',
    question: 'Le total BilledCost du mois correspond-il à la facture ?',
    capability: 'Invoicing & Chargeback',
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
    bigqueryNote: 'L’export Google Cloud ne fournit pas InvoiceId : le rapprochement se fait par période de facturation.',
    reading: 'BilledCost se compare à la facture, EffectiveCost au pilotage. Sur un mois complet, les deux totaux se rejoignent quand les engagements sont payés au fil de l’eau ; un achat initial les écarte.',
  },
  {
    id: 'cost-by-service',
    title: 'Coûts du mois par service',
    question: 'Où part l’argent ce mois-ci, et quelles économies sont déjà acquises ?',
    capability: 'Reporting & Analytics',
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
    bigqueryNote: 'ServiceCategory n’existe pas dans l’export Google Cloud : regroupement par ServiceName uniquement.',
    reading: 'Lire EffectiveCost pour savoir ce que consomme chaque service. Un BilledCost très supérieur à EffectiveCost signale un achat d’engagement porté par ce service.',
  },
  {
    id: 'cost-by-project',
    title: 'Coûts du mois par projet et équipe',
    question: 'Quels projets et quelles équipes pèsent le plus ?',
    capability: 'Allocation',
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
    bigqueryNote: 'Chez Google Cloud, SubAccountId est l’identifiant du projet. Les labels sont lus dans x_Labels, puis dans x_ProjectLabels.',
    reading: 'Une équipe vide désigne un coût sans propriétaire. « shared » n’est pas un coût non alloué : il attend une clé de répartition.',
  },
  {
    id: 'allocation-rate',
    title: 'Taux de coûts alloués',
    question: 'Quelle part du coût a une équipe responsable ?',
    capability: 'Allocation',
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
    reading: 'C’est le KPI d’Allocation le plus suivi. Le framework ne fixe pas de seuil : on se fixe une cible avec le client et on suit la tendance mois après mois.',
  },
  {
    id: 'untagged-cost',
    title: 'Coûts sans tag team',
    question: 'Où se trouvent les coûts sans propriétaire ?',
    capability: 'Allocation',
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
    reading: 'Traiter d’abord les plus gros montants. Un projet entier sans tag se règle par une règle de rattachement au projet, plus vite qu’en taguant chaque ressource.',
  },
  {
    id: 'daily-anomalies',
    title: 'Détecter les hausses anormales jour par jour',
    question: 'Quel service a dérapé, dans quel projet et depuis quand ?',
    capability: 'Anomaly Management',
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
    bigqueryNote: 'Le dernier jour de l’export Google Cloud peut être incomplet : l’ignorer avant de lever une alerte.',
    reading: 'Le premier jour listé pour un couple projet et service est la date de rupture. Il faut 7 jours d’historique avant de juger un jour. Ajuster les seuils (3 écarts-types, 100 €) à la taille du périmètre.',
  },
  {
    id: 'bigquery-scans',
    title: 'BigQuery : volume analysé et coût par Tio',
    question: 'La hausse BigQuery vient-elle du volume lu ou du prix ?',
    capability: 'Usage Optimization',
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
    bigqueryNote: 'Les SKU BigQuery mélangent analyse, stockage et slots : la requête garde ConsumedUnit pour ne pas additionner des unités différentes.',
    reading: 'Un coût par Tio stable avec des Tio en hausse désigne une requête qui lit trop. Un coût par Tio en hausse désigne un changement de tarif ou d’édition.',
  },
  {
    id: 'commitment-utilization',
    title: 'Utilisation quotidienne des engagements',
    question: 'Paie-t-on une part d’engagement qui n’est pas consommée ?',
    capability: 'Rate Optimization',
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
    bigqueryNote: 'L’export Google Cloud (preview) ne fournit pas les colonnes CommitmentDiscount* : l’utilisation exacte se lit dans le rapport des CUD de la console Billing.',
    reading: 'L’utilisation se calcule engagement par engagement : Used ÷ (Used + Unused). Des creux réguliers le week-end indiquent un engagement dimensionné sur la semaine et non sur le socle.',
  },
  {
    id: 'commitment-coverage',
    title: 'Couverture des engagements',
    question: 'Quelle part de la consommation éligible est couverte ?',
    capability: 'Rate Optimization',
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
    bigqueryNote: 'Approximation : sans colonnes d’engagement, une ligne partiellement couverte compte entièrement. Adapter la liste des services éligibles au type de CUD.',
    reading: 'La couverture se lit avec l’utilisation : une couverture haute et une utilisation basse signalent un engagement trop gros. ServiceCategory = Compute est une approximation du périmètre éligible.',
  },
  {
    id: 'effective-savings-rate',
    title: 'Taux d’économie effectif (ESR)',
    question: 'Que rapportent réellement les engagements, part inutilisée comprise ?',
    capability: 'Rate Optimization',
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
    bigqueryNote: 'À valider sur un mois connu : vérifier que EffectiveCost intègre bien les remises CUD dans l’export Google Cloud avant de présenter ce chiffre.',
    reading: 'Les lignes Unused ont un EffectiveCost sans équivalent à la demande : elles font baisser l’ESR, ce qui est voulu. L’ESR résume utilisation, couverture et remise en un seul chiffre.',
  },
  {
    id: 'savings-breakdown',
    title: 'Décomposer les économies',
    question: 'D’où viennent les économies : négociation, engagements ou crédits ?',
    capability: 'KPIs & Benchmarking',
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
    bigqueryNote: 'Chez Google Cloud, crédits et remises CUD sont détaillés par type dans x_Credits (COMMITTED_USAGE_DISCOUNT, SUSTAINED_USAGE_DISCOUNT, PROMOTION…).',
    reading: 'Les crédits promotionnels ne sont pas une optimisation durable : les présenter à part. Les économies d’engagement sont nettes de la part inutilisée.',
  },
  {
    id: 'billed-vs-effective',
    title: 'Facturé ou amorti : qui paie l’engagement ?',
    question: 'Pourquoi un projet paie-t-il plus que ce qu’il consomme ?',
    capability: 'Invoicing & Chargeback',
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
    reading: 'Le projet qui achète l’engagement a un écart positif, ceux qui en profitent un écart négatif. Refacturer en EffectiveCost répartit l’avantage là où la consommation a lieu.',
  },
  {
    id: 'non-prod-weekend',
    title: 'Hors-production : week-end contre semaine',
    question: 'Les environnements hors production s’arrêtent-ils vraiment ?',
    capability: 'Usage Optimization',
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
    bigqueryNote: 'BigQuery numérote les jours de 1 (dimanche) à 7 (samedi) ; DuckDB de 0 (dimanche) à 6 (samedi).',
    reading: 'Une hors-production arrêtée la nuit et le week-end tombe bien en dessous de 50 %. Au-dessus de 60 %, elle tourne presque en continu. Le calcul utilise ListCost pour ignorer les effets d’engagement.',
  },
  {
    id: 'storage-growth',
    title: 'Stockage : croissance sur 30 jours',
    question: 'Quel stockage grossit sans limite ?',
    capability: 'Usage Optimization',
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
    bigqueryNote: 'Les unités de stockage Google Cloud varient selon les SKU : la requête garde ConsumedUnit.',
    reading: 'Une croissance régulière sans palier indique l’absence de règle de cycle de vie. Vérifier la rétention légale avant toute suppression.',
  },
  {
    id: 'network-egress',
    title: 'Réseau : egress par projet',
    question: 'Quel projet envoie des données hors du cloud, et combien cela pèse ?',
    capability: 'Architecting & Workload Placement',
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
    bigqueryNote: 'Chez Google Cloud, l’egress est souvent facturé sous le service de la ressource (Compute Engine, Cloud Storage) : on cherche aussi « egress » dans la description.',
    reading: 'Au-delà de quelques pourcents du coût d’un projet, cartographier les flux : inter-régions, Internet, vers un autre cloud.',
  },
  {
    id: 'forecast-month-end',
    title: 'Projection de fin de mois',
    question: 'Où finira le mois si le rythme des 7 derniers jours se maintient ?',
    capability: 'Forecasting',
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
    bigqueryNote: 'Les données Google Cloud arrivent avec plusieurs heures de retard : exclure le jour en cours pour ne pas sous-estimer la moyenne.',
    reading: 'Extrapolation simple, identique à la vue d’ensemble de la démo. Elle ne connaît ni les événements prévus ni la saisonnalité : la compléter par une prévision construite avec les équipes.',
  },
  {
    id: 'top-resources',
    title: 'Les 15 ressources les plus coûteuses',
    question: 'Par quelles ressources commencer l’analyse ?',
    capability: 'Reporting & Analytics',
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
    bigqueryNote: 'ResourceType n’est pas fourni par l’export Google Cloud, et ResourceId n’est renseigné que pour les services qui publient des données au niveau ressource.',
    reading: 'Quelques ressources concentrent souvent l’essentiel du coût : les qualifier avec leurs propriétaires avant de chercher dans la longue traîne.',
  },
];

export const snippetById = Object.fromEntries(snippets.map((s) => [s.id, s]));
