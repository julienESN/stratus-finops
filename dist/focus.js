// Colonnes FOCUS 1.2 de la démo, export CSV et création de la table DuckDB.
// Partagé entre le navigateur (Labo SQL) et les tests Node.

export const FOCUS_VERSION = '1.2';

// [colonne, type DuckDB, montant en centimes à convertir]
export const FOCUS_COLUMNS = [
  ['BillingAccountId', 'VARCHAR'],
  ['BillingAccountName', 'VARCHAR'],
  ['BillingCurrency', 'VARCHAR'],
  ['BillingPeriodStart', 'TIMESTAMP'],
  ['BillingPeriodEnd', 'TIMESTAMP'],
  ['ChargePeriodStart', 'TIMESTAMP'],
  ['ChargePeriodEnd', 'TIMESTAMP'],
  ['ChargeCategory', 'VARCHAR'],
  ['ChargeClass', 'VARCHAR'],
  ['ChargeDescription', 'VARCHAR'],
  ['ChargeFrequency', 'VARCHAR'],
  ['ProviderName', 'VARCHAR'],
  ['PublisherName', 'VARCHAR'],
  ['InvoiceIssuerName', 'VARCHAR'],
  ['ServiceName', 'VARCHAR'],
  ['ServiceCategory', 'VARCHAR'],
  ['ServiceSubcategory', 'VARCHAR'],
  ['SubAccountId', 'VARCHAR'],
  ['SubAccountName', 'VARCHAR'],
  ['RegionId', 'VARCHAR'],
  ['RegionName', 'VARCHAR'],
  ['ResourceId', 'VARCHAR'],
  ['ResourceName', 'VARCHAR'],
  ['ResourceType', 'VARCHAR'],
  ['PricingCategory', 'VARCHAR'],
  ['ConsumedQuantity', 'DECIMAL(18,3)'],
  ['ConsumedUnit', 'VARCHAR'],
  ['ListCost', 'DECIMAL(18,2)', true],
  ['ContractedCost', 'DECIMAL(18,2)', true],
  ['BilledCost', 'DECIMAL(18,2)', true],
  ['EffectiveCost', 'DECIMAL(18,2)', true],
  ['CommitmentDiscountId', 'VARCHAR'],
  ['CommitmentDiscountName', 'VARCHAR'],
  ['CommitmentDiscountType', 'VARCHAR'],
  ['CommitmentDiscountCategory', 'VARCHAR'],
  ['CommitmentDiscountStatus', 'VARCHAR'],
  ['Tags', 'VARCHAR'],
];

const csvValue = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const euros = (cents) => {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
};

// Sérialise des lignes FOCUS en CSV : montants en euros décimaux, valeurs nulles en champ vide.
export function toFocusCsv(input) {
  const header = FOCUS_COLUMNS.map(([name]) => name).join(',');
  const lines = input.map((row) => FOCUS_COLUMNS
    .map(([name, , cents]) => csvValue(cents ? euros(row[name]) : row[name]))
    .join(','));
  return [header, ...lines].join('\n');
}

// Crée la table `focus` à partir d'un CSV de la démo, avec des types explicites.
export function createDemoTableSql(fileName) {
  const columns = FOCUS_COLUMNS.map(([name, type]) => `'${name}': '${type}'`).join(', ');
  return `CREATE OR REPLACE TABLE focus AS SELECT * FROM read_csv('${fileName}', header = true, nullstr = '', columns = {${columns}})`;
}

// Colonnes indispensables aux requêtes de la bibliothèque.
export const CORE_COLUMNS = [
  'BillingPeriodStart', 'ChargePeriodStart', 'ChargeCategory', 'ServiceName', 'SubAccountId',
  'ListCost', 'ContractedCost', 'BilledCost', 'EffectiveCost',
];
