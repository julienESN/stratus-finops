// Veille : dates valides, ordre chronologique, fournisseurs connus et sources en https.

import test from 'node:test';
import assert from 'node:assert/strict';
import { news, offers, PROVIDERS, barometer, VEILLE_AS_OF } from '../dist/content/veille.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const providerIds = new Set(PROVIDERS.map(([id]) => id));
const isDate = (value) => ISO.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

test('chaque actualité a une date valide, antérieure à la date de la veille, et le fil va du plus récent au plus ancien', () => {
  assert.ok(isDate(VEILLE_AS_OF));
  for (const n of news) {
    assert.ok(isDate(n.date), `${n.id} : date ${n.date}`);
    assert.ok(n.date <= VEILLE_AS_OF, `${n.id} est datée après la veille`);
  }
  const dates = news.map((n) => n.date);
  assert.deepEqual(dates, [...dates].sort().reverse());
  assert.equal(new Set(news.map((n) => n.id)).size, news.length, 'identifiants en double');
});

test('chaque actualité et chaque offre cite un fournisseur connu et une source en https', () => {
  for (const n of news) {
    assert.ok(n.providers.length > 0, `${n.id} sans fournisseur`);
    for (const id of n.providers) assert.ok(providerIds.has(id), `${n.id} : fournisseur ${id}`);
    assert.match(n.source.url, /^https:\/\//);
    assert.ok(n.source.label.trim());
  }
  for (const o of offers) {
    assert.ok(providerIds.has(o.provider), `${o.id} : fournisseur ${o.provider}`);
    assert.ok(['good', 'pending'].includes(o.tone), `${o.id} : statut ${o.tone}`);
    assert.match(o.source, /^https:\/\//);
  }
  assert.match(barometer.source.url, /^https:\/\//);
  assert.ok(isDate(barometer.focusDate));
});

test('chaque fournisseur du filtre a au moins une actualité', () => {
  for (const id of providerIds) assert.ok(news.some((n) => n.providers.includes(id)), `aucune actualité pour ${id}`);
});
