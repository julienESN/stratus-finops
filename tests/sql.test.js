import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDBInstance } from '@duckdb/node-api';
import { focusRows, rows, sum } from '../dist/data.js';
import { toFocusCsv, createDemoTableSql, FOCUS_COLUMNS } from '../dist/focus.js';
import { snippets } from '../dist/content/snippets.js';
import { generateSql, GENERATOR } from '../dist/sql.js';

const file = join(mkdtempSync(join(tmpdir(), 'stratus-')), 'focus.csv');
writeFileSync(file, toFocusCsv(focusRows));
const instance = await DuckDBInstance.create(':memory:');
const connection = await instance.connect();
await connection.run(createDemoTableSql(file));

const query = async (sql) => (await connection.runAndReadAll(sql)).getRowObjectsJson();
const run = (id) => query(snippets.find((s) => s.id === id).duckdb);

test('la table focus reprend toutes les lignes et colonnes de la démo', async () => {
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM focus');
  assert.equal(Number(n), focusRows.length);
  const described = await query('DESCRIBE focus');
  assert.deepEqual(described.map((c) => c.column_name), FOCUS_COLUMNS.map(([name]) => name));
  const [{ billed, effective }] = await query('SELECT SUM(BilledCost) AS billed, SUM(EffectiveCost) AS effective FROM focus');
  assert.equal(Number(billed), sum(focusRows, (r) => r.BilledCost) / 100);
  assert.equal(Number(effective), sum(focusRows, (r) => r.EffectiveCost) / 100);
});

test('chaque snippet DuckDB s’exécute et renvoie des lignes', async () => {
  const ids = new Set();
  for (const s of snippets) {
    assert.ok(!ids.has(s.id), `identifiant en double : ${s.id}`);
    ids.add(s.id);
    for (const key of ['title', 'question', 'capability', 'duckdb', 'bigquery', 'reading']) assert.ok(s[key], `${s.id}.${key}`);
    const result = await query(s.duckdb);
    assert.ok(result.length > 0, `${s.id} ne renvoie aucune ligne`);
  }
});

test('contrôle qualité : aucune anomalie de conformité dans la démo', async () => {
  const result = await run('data-quality');
  for (const r of result) {
    if (r.controle === 'Lignes') assert.equal(Number(r.valeur), focusRows.length);
    else if (r.controle === 'Jours couverts') assert.equal(Number(r.valeur), 46);
    else assert.equal(Number(r.valeur), 0, r.controle);
  }
});

test('anomalies : la dérive BigQuery du 11 septembre est détectée', async () => {
  const result = await run('daily-anomalies');
  assert.ok(result.some((r) => r.jour === '2026-09-11' && r.SubAccountId === 'atlas-analytics-prod' && r.ServiceName === 'BigQuery'));
  assert.ok(result.every((r) => r.ServiceName === 'BigQuery'), 'pas de fausse alerte due aux engagements');
});

test('allocation : seule la Sandbox R&D est sans équipe, et le taux le reflète', async () => {
  const untagged = await run('untagged-cost');
  assert.deepEqual([...new Set(untagged.map((r) => r.SubAccountId))], ['sandbox-experiments']);
  const [rate] = await run('allocation-rate');
  const sandbox = sum(rows.filter((r) => r.month === 9 && r.project === 'sandbox-experiments'), (r) => r.cost) / 100;
  assert.equal(Number(rate.cout_sans_equipe), Math.round(sandbox * 100) / 100);
  assert.ok(Number(rate.taux_alloue_pct) > 90 && Number(rate.taux_alloue_pct) < 100);
});

test('projection SQL identique à celle de la vue d’ensemble', async () => {
  const [forecast] = await run('forecast-month-end');
  const sept = rows.filter((r) => r.month === 9);
  const total = sum(sept, (r) => r.cost);
  const expected = total + sum(sept.filter((r) => r.day > 8), (r) => r.cost) / 7 * 15;
  assert.equal(Number(forecast.jours_restants), 15);
  assert.ok(Math.abs(Number(forecast.projection_fin_de_mois) - expected / 100) < 0.02);
});

test('décomposition des économies : prix public - économies = coût effectif', async () => {
  const [s] = await run('savings-breakdown');
  const rebuilt = Number(s.cout_au_prix_public) - Number(s.remises_negociees) - Number(s.economies_engagements_nettes) - Number(s.credits);
  assert.ok(Math.abs(rebuilt - Number(s.cout_effectif)) < 0.05);
});

test('engagements : utilisation incomplète le week-end, couverture et ESR plausibles', async () => {
  const utilization = await run('commitment-utilization');
  const weekend = utilization.filter((r) => [0, 6].includes(new Date(`${r.jour}T12:00:00Z`).getUTCDay()));
  assert.ok(weekend.some((r) => Number(r.utilisation_pct) < 100));
  assert.ok(utilization.every((r) => Number(r.utilisation_pct) <= 100));
  const coverage = await run('commitment-coverage');
  assert.ok(coverage.every((r) => Number(r.couverture_pct) > 0 && Number(r.couverture_pct) <= 100));
  const [esr] = await run('effective-savings-rate');
  assert.ok(Number(esr.esr_pct) > 0 && Number(esr.esr_pct) < 28);
});

test('patterns : hors-prod au week-end, croissance du stockage, egress', async () => {
  const weekend = await run('non-prod-weekend');
  const byEnv = Object.fromEntries(weekend.map((r) => [r.environnement, Number(r.week_end_vs_semaine_pct)]));
  assert.ok(byEnv.staging < byEnv.production && byEnv.development < byEnv.production);
  const storage = await run('storage-growth');
  assert.equal(storage[0].SubAccountId, 'nova-ml-prod');
  const egress = await run('network-egress');
  assert.deepEqual(egress.map((r) => r.SubAccountId), ['orion-platform-prod']);
});

test('le générateur produit du SQL exécutable pour chaque option', async () => {
  const combos = [];
  for (const [dimension] of GENERATOR.dimensions) for (const [period] of GENERATOR.periods) combos.push({ dimension, period });
  for (const [measure] of GENERATOR.measures) for (const [charge] of GENERATOR.charges) combos.push({ measure, charge });
  for (const [dimension2] of GENERATOR.dimensions) combos.push({ dimension: 'ServiceName', dimension2 });
  for (const options of combos) {
    const sql = generateSql(options, 'duckdb');
    const result = await query(sql);
    assert.ok(result.length > 0, JSON.stringify(options));
    const bigquery = generateSql(options, 'bigquery');
    assert.ok(bigquery.includes('gcp_billing_export_focus_') && !bigquery.includes('json_extract_string'));
  }
});
