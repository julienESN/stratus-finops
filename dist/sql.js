// Moteur SQL du Labo : générateur de requêtes FOCUS (pur, testable sous Node)
// et exécution dans le navigateur avec DuckDB-WASM (chargé à la demande depuis jsDelivr).

import { BQ_TABLE } from './content/snippets.js';

/* ---------- Générateur ---------- */

// Libellés bilingues pour l'affichage. Les clés (valeurs SQL) ne changent jamais.
export const GENERATOR = {
  measures: [
    ['EffectiveCost', { fr: 'EffectiveCost, coût amorti (allocation, suivi)', en: 'EffectiveCost, effective cost (allocation, tracking)' }],
    ['BilledCost', { fr: 'BilledCost, coût facturé (rapprochement facture)', en: 'BilledCost, billed cost (invoice reconciliation)' }],
    ['ListCost', { fr: 'ListCost, prix public (mesure des remises)', en: 'ListCost, list price (measures discounts)' }],
    ['ContractedCost', { fr: 'ContractedCost, après remises négociées', en: 'ContractedCost, after negotiated discounts' }],
  ],
  dimensions: [
    ['ServiceName', { fr: 'Service', en: 'Service' }],
    ['ServiceCategory', { fr: 'Catégorie de service', en: 'Service category' }],
    ['SubAccountName', { fr: 'Projet ou compte', en: 'Project or account' }],
    ['RegionName', { fr: 'Région', en: 'Region' }],
    ['ChargeCategory', { fr: 'Catégorie de charge', en: 'Charge category' }],
    ['PricingCategory', { fr: 'Catégorie de prix', en: 'Pricing category' }],
    ['tag:team', { fr: 'Tag team', en: 'Tag team' }],
    ['tag:env', { fr: 'Tag env', en: 'Tag env' }],
    ['day', { fr: 'Jour', en: 'Day' }],
    ['month', { fr: 'Mois', en: 'Month' }],
  ],
  periods: [
    ['latest-month', { fr: 'Dernier mois de facturation', en: 'Latest billing month' }],
    ['last-30-days', { fr: '30 derniers jours', en: 'Last 30 days' }],
    ['all', { fr: 'Toute la période', en: 'Entire period' }],
  ],
  charges: [
    ['all', { fr: 'Toutes les charges', en: 'All charges' }],
    ['Usage', { fr: 'Usage uniquement', en: 'Usage only' }],
  ],
  limits: [10, 25, 100],
};

export const GENERATOR_DEFAULTS = { measure: 'EffectiveCost', dimension: 'ServiceName', dimension2: 'none', period: 'latest-month', charge: 'all', limit: 25 };

const ALIASES = {
  ServiceName: 'service',
  ServiceCategory: 'categorie_service',
  SubAccountName: 'projet',
  RegionName: 'region',
  ChargeCategory: 'categorie_charge',
  PricingCategory: 'categorie_prix',
  'tag:team': 'equipe',
  'tag:env': 'environnement',
  day: 'jour',
  month: 'mois',
};

const TIME_DIMENSIONS = ['day', 'month'];

// Libellé français, et seulement lui : il sert dans les commentaires SQL, qui ne changent pas avec la langue.
const label = (list, value) => list.find(([v]) => String(v) === String(value))?.[1].fr ?? value;

function duckdbExpression(dimension) {
  if (dimension.startsWith('tag:')) return `json_extract_string(Tags, '$.${dimension.slice(4)}')`;
  if (dimension === 'day') return 'CAST(ChargePeriodStart AS DATE)';
  if (dimension === 'month') return "CAST(date_trunc('month', ChargePeriodStart) AS DATE)";
  return dimension;
}

function bigqueryExpression(dimension) {
  if (dimension.startsWith('tag:')) {
    const key = dimension.slice(4);
    return `COALESCE((SELECT l.Value FROM UNNEST(x_Labels) AS l WHERE l.Key = '${key}'), (SELECT l.Value FROM UNNEST(x_ProjectLabels) AS l WHERE l.Key = '${key}'))`;
  }
  if (dimension === 'day') return 'DATE(ChargePeriodStart)';
  if (dimension === 'month') return 'DATE_TRUNC(DATE(ChargePeriodStart), MONTH)';
  // ServiceCategory n'existe pas dans l'export Google Cloud.
  if (dimension === 'ServiceCategory') return 'ServiceName';
  return dimension;
}

const PERIOD_FILTERS = {
  duckdb: {
    'latest-month': 'BillingPeriodStart = (SELECT MAX(BillingPeriodStart) FROM focus)',
    'last-30-days': 'ChargePeriodStart >= (SELECT MAX(ChargePeriodStart) FROM focus) - INTERVAL 29 DAY',
    all: null,
  },
  bigquery: {
    'latest-month': 'DATE(BillingPeriodStart) = DATE_TRUNC(CURRENT_DATE(), MONTH)',
    'last-30-days': 'ChargePeriodStart >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)',
    all: null,
  },
};

// Construit une requête d'agrégation FOCUS pour un dialecte ('duckdb' ou 'bigquery').
export function generateSql(options, dialect = 'duckdb') {
  const o = { ...GENERATOR_DEFAULTS, ...options };
  const dimensions = [o.dimension, o.dimension2].filter((d, i, all) => d && d !== 'none' && all.indexOf(d) === i);
  const expression = dialect === 'bigquery' ? bigqueryExpression : duckdbExpression;
  const measureAlias = o.measure.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  const period = PERIOD_FILTERS[dialect][o.period];
  const filters = [period, o.charge === 'Usage' ? "ChargeCategory = 'Usage'" : null].filter(Boolean);
  const timeOrder = dimensions.filter((d) => TIME_DIMENSIONS.includes(d)).map((d) => ALIASES[d]);
  const order = [...timeOrder, `${measureAlias} DESC`].join(', ');

  const comments = [
    `-- Généré par Stratus : ${o.measure} par ${dimensions.map((d) => label(GENERATOR.dimensions, d).toLowerCase()).join(' et ')}, ${label(GENERATOR.periods, o.period).toLowerCase()}`,
  ];
  if (dialect === 'bigquery') {
    comments.push('-- Export FOCUS Google Cloud : remplacer PROJET, COMPTE (compte de facturation) et LOC (localisation du dataset).');
    if (dimensions.includes('ServiceCategory')) comments.push("-- ServiceCategory n'existe pas dans l'export Google Cloud : regroupement par ServiceName.");
    if (dimensions.some((d) => d.startsWith('tag:'))) comments.push('-- Les labels Google Cloud sont lus dans x_Labels, puis dans x_ProjectLabels.');
    if (o.period === 'all') comments.push('-- Attention : sans filtre de période, la requête lit toute la table.');
  }

  const select = dimensions.map((d) => `  ${expression(d)} AS ${ALIASES[d]}`);
  select.push(`  ROUND(SUM(${o.measure}), 2) AS ${measureAlias}`);

  return [
    ...comments,
    'SELECT',
    select.join(',\n'),
    `FROM ${dialect === 'bigquery' ? BQ_TABLE : 'focus'}`,
    filters.length ? `WHERE ${filters.join('\n  AND ')}` : null,
    'GROUP BY ALL',
    `ORDER BY ${order}`,
    `LIMIT ${Number(o.limit) || 25};`,
  ].filter(Boolean).join('\n');
}

/* ---------- Exécution dans le navigateur ---------- */

export const DUCKDB_VERSION = '1.32.0';
const DEMO_FILE = 'stratus-demo-focus.csv';

let enginePromise = null;

// Charge DuckDB-WASM une seule fois et crée la table `focus` à partir de la démo.
export function loadEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const [{ focusRows }, { toFocusCsv, createDemoTableSql }] = await Promise.all([import('./data.js'), import('./focus.js')]);
      const duckdb = await import(`https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@${DUCKDB_VERSION}/+esm`);
      const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
      const workerUrl = URL.createObjectURL(new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }));
      const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(workerUrl));
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      URL.revokeObjectURL(workerUrl);
      await db.open({ query: { castBigIntToDouble: true, castDecimalToDouble: true, castTimestampToDate: true } });
      const connection = await db.connect();
      await db.registerFileText(DEMO_FILE, toFocusCsv(focusRows));
      await connection.query(createDemoTableSql(DEMO_FILE));
      return { duckdb, db, connection, createDemoTableSql };
    })();
    enginePromise.catch(() => { enginePromise = null; });
  }
  return enginePromise;
}

const formatCell = (value, type) => {
  if (value === null || value === undefined) return null;
  if (/^(Date|Timestamp)/.test(type)) {
    const iso = new Date(value).toISOString();
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso.slice(0, 19).replace('T', ' ');
  }
  return value;
};

// Exécute une requête et renvoie colonnes, lignes (200 au plus) et durée.
export async function runQuery(sql) {
  const { connection } = await loadEngine();
  const started = performance.now();
  const table = await connection.query(sql);
  const columns = table.schema.fields.map((field) => ({ name: field.name, type: String(field.type), numeric: /^(Float|Int|Decimal|Uint)/.test(String(field.type)) }));
  const all = table.toArray();
  const rows = all.slice(0, 200).map((row) => {
    const record = row.toJSON();
    return columns.map((c) => formatCell(record[c.name], c.type));
  });
  return { columns, rows, total: all.length, ms: Math.round(performance.now() - started) };
}

const quote = (text) => `'${String(text).replaceAll("'", "''")}'`;

// Remplace la table `focus` par un fichier local (CSV ou Parquet). Le fichier est lu dans le navigateur.
export async function importFocusFile(file) {
  const { duckdb, db, connection } = await loadEngine();
  await db.registerFileHandle(file.name, file, duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);
  const reader = /\.parquet$/i.test(file.name) ? `read_parquet(${quote(file.name)})` : `read_csv(${quote(file.name)}, header = true, sample_size = -1)`;
  await connection.query(`CREATE OR REPLACE TABLE focus_import AS SELECT * FROM ${reader}`);
  const described = (await connection.query('DESCRIBE focus_import')).toArray().map((r) => r.toJSON());
  const tags = described.find((c) => c.column_name.toLowerCase() === 'tags');
  // Les exports Parquet (AWS notamment) stockent Tags en MAP : conversion en JSON texte pour les requêtes.
  const select = tags && !/VARCHAR|JSON/i.test(tags.column_type)
    ? 'SELECT * REPLACE (CAST(to_json(Tags) AS VARCHAR) AS Tags) FROM focus_import'
    : 'SELECT * FROM focus_import';
  await connection.query(`CREATE OR REPLACE TABLE focus AS ${select}`);
  await connection.query('DROP TABLE focus_import');
  const count = (await connection.query('SELECT COUNT(*) AS n FROM focus')).toArray()[0].toJSON().n;
  return { name: file.name, rows: Number(count), columns: described.map((c) => c.column_name) };
}

// Revient aux données de démonstration.
export async function restoreDemoTable() {
  const { connection, createDemoTableSql } = await loadEngine();
  await connection.query(createDemoTableSql(DEMO_FILE));
}
