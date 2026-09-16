import test from 'node:test';
import assert from 'node:assert/strict';
import {rows,projects,allocation,commitment,sum,buildRows} from '../dist/data.js';
test('données reproductibles et rapprochement brut + crédits = net',()=>{
 assert.deepEqual(buildRows(),rows);
 assert.equal(new Set(rows.map(r=>`${r.date}/${r.project}/${r.service}`)).size,rows.length);
 for(const r of rows){assert.ok(Number.isSafeInteger(r.cost));assert.equal(r.listCost+r.credits,r.cost);assert.ok(r.cost>=0)}
 assert.equal(sum(rows.filter(r=>r.month===9),r=>r.cost),8765742);
});
test('allocation réconciliée au centime, pour chaque mois et les deux clés',()=>{
 for(const month of[8,9])for(const method of['usage','equal'])for(const owners of[{}, {'sandbox-experiments':'Innovation'}]){
  const input=rows.filter(r=>r.month===month),a=allocation(input,owners,method);
  assert.equal(sum(a.items,r=>r.total)+a.unallocated,a.total);
  assert.equal(sum(a.items,r=>r.shared),a.shared);
  for(const r of a.items){assert.ok(Number.isSafeInteger(r.total));assert.equal(r.direct+r.shared,r.total);}
  assert.equal(a.unallocated,owners['sandbox-experiments']?0:sum(input.filter(r=>r.project==='sandbox-experiments'),r=>r.cost));
 }
});
test('les coûts mutualisés sans base de répartition restent visibles',()=>{
 const a=allocation(rows.filter(r=>r.project==='core-network-shared'),{},'usage');
 assert.equal(a.unallocated,a.total);assert.equal(sum(a.items,r=>r.total),0);
 const empty=allocation([],{},'usage');assert.equal(empty.total,0);
});
test('engagement : pas de remise magique sur la capacité inutilisée',()=>{
 const none=commitment(18000,85,0,28);assert.equal(none.cost,15300);assert.equal(none.saving,0);
 const stable=commitment(18000,85,65,28);assert.equal(stable.saving,3276);assert.equal(stable.unused,0);
 const drop=commitment(18000,40,85,28);assert.equal(drop.cost,11016);assert.equal(drop.saving,-3816);assert.equal(drop.unused,5832);
 const zero=commitment(18000,0,85,28);assert.equal(zero.cost,11016);
 for(let use=20;use<=120;use++)for(let c=0;c<=100;c+=5){const r=commitment(18000,use,c,28);assert.ok(r.cost>=0);assert.ok(Math.abs(r.cost+r.saving-r.actual)<1e-6);assert.ok(r.utilization<=100)}
});
