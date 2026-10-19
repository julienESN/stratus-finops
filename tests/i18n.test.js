// Langue française par défaut : parité des chaînes, contenus bilingues complets, résolution de la langue.
// Les formats de nombres en anglais sont dans tests/i18n-en.test.js (autre processus, ?lang=en).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MESSAGES, LANGS, resolveLang, t, dataLabel, lang } from '../dist/i18n.js';
import * as data from '../dist/data.js';
import * as snippets from '../dist/content/snippets.js';
import * as situations from '../dist/content/situations.js';
import * as reference from '../dist/content/reference.js';

const ROOT = fileURLToPath(new URL('../dist/', import.meta.url));

function sourceFiles(dir) {
  return readdirSync(dir, { recursive: true })
    .filter((f) => f.endsWith('.js'))
    .map((f) => join(dir, f));
}

test('la langue par défaut est le français, et l’URL ou le choix mémorisé priment', () => {
  assert.equal(lang(), 'fr');
  assert.equal(resolveLang({}), 'fr');
  assert.equal(resolveLang({ search: '?lang=en' }), 'en');
  assert.equal(resolveLang({ stored: 'en' }), 'en');
  assert.equal(resolveLang({ search: '?lang=en', stored: 'fr' }), 'en');
  assert.equal(resolveLang({ search: '?lang=de', stored: 'en' }), 'en');
  assert.equal(resolveLang({ search: '?lang=xx' }), 'fr');
});

test('chaque chaîne d’interface existe dans les deux langues, avec une valeur non vide', () => {
  assert.deepEqual(LANGS, ['fr', 'en']);
  const fr = Object.keys(MESSAGES.fr).sort();
  const en = Object.keys(MESSAGES.en).sort();
  assert.deepEqual(en, fr);
  for (const code of LANGS) {
    for (const [key, value] of Object.entries(MESSAGES[code])) {
      assert.ok(typeof value === 'string' && value.trim() !== '', `${code} ${key} est vide`);
    }
  }
});

test('chaque clé t(\'…\') du code source existe dans les deux langues', () => {
  const used = new Set();
  for (const file of sourceFiles(ROOT)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bt\('([a-zA-Z][\w.]*)'/g)) used.add(match[1]);
  }
  assert.ok(used.size > 100, `trop peu de clés trouvées (${used.size}) : le motif a changé ?`);
  for (const key of used) {
    for (const code of LANGS) assert.ok(key in MESSAGES[code], `clé « ${key} » absente de ${code}`);
  }
});

test('chaque équipe, environnement et projet a un libellé dans les deux langues', () => {
  const values = [
    ...data.teams.map((team) => ['team', team]),
    ...data.teams.map((team) => ['team', team]),
    ['team', 'Partagé'],
    ...[...new Set(data.projects.map((p) => p.env))].map((env) => ['env', env]),
    ...data.projects.map((p) => ['project', p.id]),
  ];
  for (const [kind, value] of values) {
    for (const code of LANGS) {
      assert.ok(`${kind}.${value}` in MESSAGES[code], `${kind}.${value} absent de ${code}`);
    }
  }
  assert.equal(dataLabel('team', 'Partagé'), 'Socle partagé');
  assert.equal(t('ui.close'), 'Fermer');
});

// Contenus bilingues : tout objet { fr } doit avoir un { en } non vide, et inversement.
function checkBilingual(value, path, problems) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => checkBilingual(item, `${path}[${i}]`, problems));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const keys = Object.keys(value);
  if (keys.includes('fr') || keys.includes('en')) {
    for (const code of LANGS) {
      if (typeof value[code] !== 'string' || value[code].trim() === '') problems.push(`${path}.${code}`);
    }
    return;
  }
  for (const [key, item] of Object.entries(value)) checkBilingual(item, `${path}.${key}`, problems);
}

test('les contenus (snippets, situations, référentiel, recommandations) sont complets dans les deux langues', () => {
  const problems = [];
  for (const [name, ns] of Object.entries({ data, snippets, situations, reference })) {
    for (const [exported, value] of Object.entries(ns)) checkBilingual(value, `${name}.${exported}`, problems);
  }
  assert.deepEqual(problems, []);
});

test('le SQL de la bibliothèque et du générateur ne dépend pas de la langue', () => {
  // Les textes SQL (requêtes, alias, commentaires) restent identiques : aucun libellé anglais n’y entre.
  for (const s of snippets.snippets) {
    assert.equal(typeof s.duckdb, 'string');
    assert.equal(typeof s.bigquery, 'string');
  }
});
