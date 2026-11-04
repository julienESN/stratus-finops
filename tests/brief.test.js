// Note de pilotage : la projection par projet retombe au centime sur la projection globale de la vue d'ensemble.

import test from 'node:test';
import assert from 'node:assert/strict';
import { state, totals, periodRows, projectForecasts, commitmentUse } from '../dist/state.js';
import { teams } from '../dist/data.js';

const scopes = ['all', ...teams, 'Partagé'];

test('la somme des projections par projet égale la projection globale, pour chaque période et chaque équipe', () => {
  for (const month of [8, 9]) {
    for (const team of scopes) {
      Object.assign(state, { month, team });
      const input = periodRows();
      const figures = totals(input);
      const list = projectForecasts(input);
      assert.equal(list.reduce((s, p) => s + p.forecast, 0), figures.forecast, `${month} ${team}`);
      assert.equal(list.reduce((s, p) => s + p.variance, 0), figures.forecast - figures.budget, `${month} ${team}`);
    }
  }
  Object.assign(state, { month: 9, team: 'all' });
});

test('en août, mois clôturé, la projection d’un projet est son réalisé', () => {
  Object.assign(state, { month: 8, team: 'all' });
  for (const p of projectForecasts(periodRows())) assert.equal(p.forecast, p.actual);
  Object.assign(state, { month: 9 });
});

test('Atlas Analytics porte le dépassement de septembre', () => {
  Object.assign(state, { month: 9, team: 'all' });
  const list = projectForecasts(periodRows()).sort((a, b) => b.variance - a.variance);
  assert.equal(list[0].id, 'atlas-analytics-prod');
  assert.ok(list[0].variance > 0);
  assert.ok(list.slice(1).every((p) => p.variance < 0));
});

test('l’utilisation de l’engagement reste entre 0 et 100 % et rapproche frais et part inutilisée', () => {
  for (const month of [8, 9]) {
    Object.assign(state, { month });
    const use = commitmentUse();
    assert.ok(use.fees > 0);
    assert.ok(use.unused >= 0 && use.unused < use.fees);
    assert.ok(use.rate > 0 && use.rate <= 100);
  }
  Object.assign(state, { month: 9 });
});
