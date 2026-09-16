import test from 'node:test';
import assert from 'node:assert/strict';
import { rows, focusRows, projects, allocation, commitment, sum, buildFocusRows, aggregateRows, COMMITMENT } from '../dist/data.js';

const ALLOWED = {
  ChargeCategory: ['Usage', 'Purchase', 'Tax', 'Credit', 'Adjustment'],
  ChargeFrequency: ['One-Time', 'Recurring', 'Usage-Based'],
  PricingCategory: ['Standard', 'Dynamic', 'Committed', 'Other', null],
  CommitmentDiscountStatus: ['Used', 'Unused', null],
};

test('données FOCUS reproductibles, typées et conformes aux valeurs autorisées', () => {
  assert.deepEqual(buildFocusRows(), focusRows);
  for (const r of focusRows) {
    for (const column of ['ListCost', 'ContractedCost', 'BilledCost', 'EffectiveCost']) assert.ok(Number.isSafeInteger(r[column]), column);
    for (const [column, values] of Object.entries(ALLOWED)) assert.ok(values.includes(r[column]), `${column} = ${r[column]}`);
    assert.ok(r.ChargePeriodStart < r.ChargePeriodEnd);
    assert.equal(r.BillingPeriodStart.slice(0, 7), r.ChargePeriodStart.slice(0, 7));
    if (r.ChargeCategory === 'Usage') assert.notEqual(r.PricingCategory, null);
    if (r.CommitmentDiscountId && r.ChargeCategory === 'Usage') assert.notEqual(r.CommitmentDiscountStatus, null);
    if (!r.CommitmentDiscountId) assert.equal(r.CommitmentDiscountStatus, null);
  }
});

test('règles de coût FOCUS : crédits, achats, usage couvert et part inutilisée', () => {
  for (const r of focusRows) {
    if (r.ChargeCategory === 'Credit') {
      assert.ok(r.BilledCost < 0);
      assert.ok(r.ListCost === r.BilledCost && r.ContractedCost === r.BilledCost && r.EffectiveCost === r.BilledCost);
    }
    if (r.ChargeCategory === 'Purchase') assert.equal(r.EffectiveCost, 0);
    if (r.CommitmentDiscountStatus === 'Used') {
      assert.equal(r.BilledCost, 0);
      assert.ok(r.EffectiveCost < r.ContractedCost);
    }
    if (r.CommitmentDiscountStatus === 'Unused') {
      assert.equal(r.BilledCost + r.ListCost + r.ContractedCost, 0);
      assert.ok(r.EffectiveCost > 0);
    }
    if (r.PricingCategory === 'Standard' && r.ChargeCategory === 'Usage') {
      assert.ok(r.BilledCost === r.EffectiveCost && r.EffectiveCost === r.ListCost);
    }
  }
});

test('engagement : EffectiveCost Usage = BilledCost Purchase = Used + Unused, chaque jour', () => {
  const dates = [...new Set(focusRows.map((r) => r.date))];
  assert.equal(dates.length, 46);
  for (const date of dates) {
    const day = focusRows.filter((r) => r.date === date);
    assert.equal(sum(day, (r) => r.BilledCost), sum(day, (r) => r.EffectiveCost), date);
    const mine = day.filter((r) => r.CommitmentDiscountId === COMMITMENT.id);
    const purchase = sum(mine.filter((r) => r.ChargeCategory === 'Purchase'), (r) => r.BilledCost);
    const used = sum(mine.filter((r) => r.CommitmentDiscountStatus === 'Used'), (r) => r.EffectiveCost);
    const unused = sum(mine.filter((r) => r.CommitmentDiscountStatus === 'Unused'), (r) => r.EffectiveCost);
    assert.equal(purchase, Math.round(COMMITMENT.coverage * 100 * (1 - COMMITMENT.discount)));
    assert.equal(used + unused, purchase, date);
  }
  const unusedDays = focusRows.filter((r) => r.CommitmentDiscountStatus === 'Unused').map((r) => new Date(r.ChargePeriodStart).getUTCDay());
  assert.ok(unusedDays.length > 0);
  assert.ok(unusedDays.every((d) => d === 0 || d === 6), 'la part inutilisée tombe le week-end');
});

test('vue agrégée de la démo : coût effectif par jour, projet et service', () => {
  assert.deepEqual(aggregateRows(focusRows), rows);
  assert.equal(new Set(rows.map((r) => `${r.date}/${r.project}/${r.service}`)).size, rows.length);
  assert.equal(sum(rows, (r) => r.cost), sum(focusRows, (r) => r.EffectiveCost));
  assert.equal(sum(rows.filter((r) => r.month === 9), (r) => r.cost), 8084449);
  const untagged = [...new Set(focusRows.filter((r) => !JSON.parse(r.Tags).team).map((r) => r.SubAccountId))];
  assert.deepEqual(untagged, ['sandbox-experiments']);
  assert.ok(projects.every((p) => rows.some((r) => r.project === p.id)));
});

test('allocation réconciliée au centime, pour chaque mois et les deux clés', () => {
  for (const month of [8, 9]) for (const method of ['usage', 'equal']) for (const owners of [{}, { 'sandbox-experiments': 'Innovation' }]) {
    const input = rows.filter((r) => r.month === month);
    const a = allocation(input, owners, method);
    assert.equal(sum(a.items, (r) => r.total) + a.unallocated, a.total);
    assert.equal(sum(a.items, (r) => r.shared), a.shared);
    for (const r of a.items) {
      assert.ok(Number.isSafeInteger(r.total));
      assert.equal(r.direct + r.shared, r.total);
    }
    assert.equal(a.unallocated, owners['sandbox-experiments'] ? 0 : sum(input.filter((r) => r.project === 'sandbox-experiments'), (r) => r.cost));
  }
});

test('les coûts mutualisés sans base de répartition restent visibles', () => {
  const a = allocation(rows.filter((r) => r.project === 'core-network-shared'), {}, 'usage');
  assert.equal(a.unallocated, a.total);
  assert.equal(sum(a.items, (r) => r.total), 0);
  const empty = allocation([], {}, 'usage');
  assert.equal(empty.total, 0);
});

test('simulateur : pas de remise magique sur la capacité inutilisée', () => {
  const none = commitment(18000, 85, 0, 28);
  assert.equal(none.cost, 15300);
  assert.equal(none.saving, 0);
  const stable = commitment(18000, 85, 65, 28);
  assert.equal(stable.saving, 3276);
  assert.equal(stable.unused, 0);
  const drop = commitment(18000, 40, 85, 28);
  assert.equal(drop.cost, 11016);
  assert.equal(drop.saving, -3816);
  assert.equal(drop.unused, 5832);
  const zero = commitment(18000, 0, 85, 28);
  assert.equal(zero.cost, 11016);
  for (let use = 20; use <= 120; use++) for (let c = 0; c <= 100; c += 5) {
    const r = commitment(18000, use, c, 28);
    assert.ok(r.cost >= 0);
    assert.ok(Math.abs(r.cost + r.saving - r.actual) < 1e-6);
    assert.ok(r.utilization <= 100);
  }
});
