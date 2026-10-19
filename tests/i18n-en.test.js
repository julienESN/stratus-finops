// Formats et textes en anglais. Le fichier est exécuté dans son propre processus : la langue est fixée par ?lang=en
// avant le chargement des modules, puisque dist/i18n.js la lit une seule fois.

import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = new URL('https://stratus.test/?lang=en');

const { lang, t, pick, dataLabel } = await import('../dist/i18n.js');
const { money, pct, kEuros, signedPct, plural } = await import('../dist/ui.js');
const { generateSql } = await import('../dist/sql.js');

// Les espaces fines insécables de l’Intl français ne comptent pas dans la comparaison.
const plain = (text) => text.replace(/[\s  ]/g, ' ');

test('la langue vient de ?lang=en', () => {
  assert.equal(lang(), 'en');
  assert.equal(t('ui.close'), 'Close');
  assert.equal(dataLabel('team', 'Partagé'), 'Shared platform');
  assert.equal(dataLabel('env', 'Préproduction'), 'Staging');
});

test('montants : €80,844 en anglais', () => {
  assert.equal(money(8084400), '€80,844');
  assert.equal(money(8084450, 2), '€80,844.50');
});

test('pourcentages : 17.8% en anglais, sans espace', () => {
  assert.equal(pct(17.8), '17.8%');
  assert.equal(signedPct(-3.4), '-3.4%');
  assert.equal(signedPct(12), '+12%');
});

test('abréviations de milliers : €80.8k', () => {
  assert.equal(kEuros(8084400), '€80.8k');
  assert.equal(kEuros(0), '0');
});

test('accords au singulier et au pluriel', () => {
  assert.equal(plural(1, 'day', 'days'), '1 day');
  assert.equal(plural(0, 'day', 'days'), '0 days');
  assert.equal(plural(3, 'day', 'days'), '3 days');
});

test('pick() choisit la version anglaise, et laisse passer les chaînes simples', () => {
  assert.equal(pick({ fr: 'Démonstration', en: 'Demo' }), 'Demo');
  assert.equal(pick('texte brut'), 'texte brut');
});

test('le SQL généré reste identique à la version française (commentaires et alias)', () => {
  const sql = generateSql({ dimension: 'ServiceName', measure: 'EffectiveCost' }, 'duckdb');
  assert.ok(plain(sql).includes('-- Généré par Stratus'));
  assert.ok(sql.includes('AS service'));
});
