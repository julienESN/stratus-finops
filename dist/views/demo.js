// Démonstration : vue d'ensemble, optimisations, allocation, simulateur CUD et méthode.

import { teams, projects, rows, focusRows, recommendations, sum, allocation, commitment } from '../data.js';
import { toFocusCsv } from '../focus.js';
import {
  state, DEFAULTS, MONTHS, STATUS, DECISION_DONE, persist, rerender,
  projectById, projectLabel, ownerOf, inTeam, teamLabel, envLabel, statusOf, periodRows, teamRecommendations, totals,
} from '../state.js';
import {
  $, money, pct, signedPct, kEuros, plural, esc, icon, pageHead, selectField, filterBar,
  term, operator, statusText, meter, toast, download, openSheet, sheetHead,
} from '../ui.js';
import { lineChart, bindCharts, serviceBars } from '../charts.js';
import { t, pick, locale } from '../i18n.js';

const periodField = () => selectField('period', t('demo.period'), [[9, pick(MONTHS[9].label)], [8, pick(MONTHS[8].label)]], state.month);

const teamField = () => selectField('team', t('demo.team'),
  [['all', t('demo.allTeams')], ...[...teams, 'Partagé'].map((team) => [team, teamLabel(team)])], state.team);

function dailyChart(input) {
  const month = MONTHS[state.month];
  const partial = state.month === 9;
  const xs = Array.from({ length: month.days }, (_, i) => i + 1);
  const daily = (list) => xs.map((day) => sum(list.filter((r) => r.day === day), (r) => r.cost));
  const series = [{ key: 'current', label: partial ? t('demo.septCurrent') : t('demo.augCurrent'), values: daily(input) }];
  if (partial) {
    series.push({ key: 'reference', label: t('demo.augSameDays'), values: daily(rows.filter((r) => r.month === 8 && r.day <= month.days && inTeam(r.project))) });
  }
  const step = month.days > 20 ? 6 : 3;

  const chart = lineChart({
    id: 'daily',
    label: t(partial ? 'demo.dailyLabelPartial' : 'demo.dailyLabelClosed'),
    xs,
    xDomain: [1, month.days],
    xTicks: xs.filter((d) => (d - 1) % step === 0 || d === month.days).map((d) => ({ value: d, label: `${d} ${pick(month.axis)}` })),
    series,
    axis: kEuros,
    title: (d) => t('demo.dayTitle', { day: d, month: pick(month.name) }),
    value: (cents) => money(cents),
    annotations: partial && inTeam('atlas-analytics-prod') ? [{ x: 11, label: t('demo.bigQueryDriftStart'), tone: 'critical', align: 'end' }] : [],
  });

  const table = `
    <details class="data-view">
      <summary>${t('demo.showValues')}</summary>
      <div class="table-wrap">
        <table>
          <thead><tr><th scope="col">${t('demo.day')}</th>${series.map((s) => `<th scope="col" class="num">${esc(s.label)}</th>`).join('')}</tr></thead>
          <tbody>${xs.map((d, i) => `<tr><th scope="row">${d} ${pick(month.name)}</th>${series.map((s) => `<td class="num">${money(s.values[i], 2)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    </details>`;

  return chart + table;
}

/* ---------- Vue d'ensemble ---------- */

function overview() {
  const input = periodRows();
  const figures = totals(input);
  const partial = state.month === 9;
  const open = teamRecommendations().filter((r) => statusOf(r.id) !== 'rejected');
  const unallocated = sum(input.filter((r) => !ownerOf(r.project)), (r) => r.cost);
  const allocatedShare = figures.total ? (1 - unallocated / figures.total) * 100 : 100;

  return pageHead(
    t('demo.overview'),
    t('demo.overviewLede'),
    `<button class="btn" data-action="export">${icon('download')}${t('demo.exportFocus')}</button>`,
    ['Reporting & Analytics', 'Forecasting', 'Anomaly Management'],
  )
    + filterBar([periodField(), teamField()], t('demo.dataCutoff', { date: pick(MONTHS[state.month].cutoff) }))
    + forecastStatement(figures)
    + `
    <div class="followups">
      <p>${t('demo.potentialLine', {
        amount: `<strong>${money(sum(open, (r) => r.saving))} ${t('demo.perMonth')}</strong>`,
        leads: plural(open.length, t('demo.leadOne'), t('demo.leadMany')),
      })}
        <a class="link" href="#demo/optimise" data-nav="demo/optimise">${t('demo.seeLeads')}</a></p>
      <p>${t('demo.allocatedShare', { share: `<strong>${pct(allocatedShare)}</strong>` })}${unallocated
        ? `${t('demo.unassignedNote', { amount: money(unallocated) })} <a class="link" href="#demo/allocation" data-nav="demo/allocation">${t('demo.assign')}</a>`
        : '.'}</p>
    </div>`
    + (partial && inTeam('atlas-analytics-prod') ? driftNotice() : '')
    + `
    <div class="split section">
      <section aria-labelledby="daily-title">
        <h2 id="daily-title">${t('demo.dailySpend')}</h2>
        <p class="section-note">${partial ? t('demo.sameDaysNote') : t('demo.closedMonth')}</p>
        ${dailyChart(input)}
      </section>
      <section aria-labelledby="services-title">
        <h2 id="services-title">${t('demo.byService')}</h2>
        <p class="section-note">${t('demo.effectiveCostPeriod')}</p>
        ${serviceBars(input)}
      </section>
    </div>`
    + projectTable(input);
}

function forecastStatement(figures) {
  const partial = state.month === 9;
  const gap = figures.forecast - figures.budget;
  const ratio = figures.budget ? figures.forecast / figures.budget * 100 : 0;
  const budgetNote = gap > 0
    ? statusText('critical', partial ? t('demo.overrunForecast', { amount: money(gap) }) : t('demo.overrun', { amount: money(gap) }))
    : statusText('good', partial ? t('demo.marginForecast', { amount: money(-gap) }) : t('demo.margin', { amount: money(-gap) }));
  const budget = term(t('demo.monthlyBudget'), money(figures.budget), budgetNote, 'term-aside');

  // Chaque terme est arrondi à l'euro ; le reste à courir est déduit des arrondis pour que l'addition tombe juste.
  const euro = (cents) => Math.round(cents / 100) * 100;

  if (!partial) {
    return `
      <section class="statement" aria-label="${t('demo.actualAndBudget')}">
        ${term(t('demo.actualAug'), `<span class="total">${money(figures.total)}</span>`, t('demo.closedBudgetNote', { share: pct(ratio) }), 'term-result')}
        ${budget}
      </section>`;
  }

  return `
    <section class="statement" aria-label="${t('demo.monthEndForecast')}">
      ${term(t('demo.actualSeptFirst'), money(figures.total), t('demo.vsAugFirst', { delta: signedPct(figures.delta) }))}
      ${operator('+', t('demo.opPlus'))}
      ${term(t('demo.remaining15'), money(euro(figures.forecast) - euro(figures.total)), t('demo.avgLast7'))}
      ${operator('=', t('demo.opEquals'))}
      ${term(t('demo.forecastSept'), `<span class="total">${money(figures.forecast)}</span>`, t('demo.ofBudget', { share: pct(ratio) }), 'term-result')}
      ${budget}
    </section>`;
}

function driftNotice() {
  const bigQuery = rows.filter((r) => r.month === 9 && r.project === 'atlas-analytics-prod' && r.service === 'BigQuery');
  const average = (list) => sum(list, (r) => r.cost) / list.length;
  const extra = average(bigQuery.filter((r) => r.day >= 11)) - average(bigQuery.filter((r) => r.day < 11));
  return `
    <div class="notice notice-critical">
      ${icon('alert')}
      <p><strong>${t('demo.driftTitle')}</strong> ${t('demo.driftBody', { amount: money(Math.round(extra / 10000) * 10000) })}</p>
      <div class="notice-actions"><button class="btn" data-rec="bq-partition">${t('demo.reviewDrift')}</button></div>
    </div>`;
}

function projectTable(input) {
  const list = projects
    .map((p) => ({ ...p, cost: sum(input.filter((r) => r.project === p.id), (r) => r.cost) }))
    .filter((p) => p.cost)
    .sort((a, b) => b.cost - a.cost);
  const total = sum(list, (p) => p.cost);
  const budget = sum(list, (p) => p.budget * 100);

  return `
    <section class="section" aria-labelledby="projects-title">
      <div class="section-head">
        <div>
          <h2 id="projects-title">${t('demo.projects')}</h2>
          <p class="section-note">${t('demo.budgetUsedNote')}</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">${t('demo.colProject')}</th>
              <th scope="col">${t('demo.team')}</th>
              <th scope="col">${t('demo.colEnv')}</th>
              <th scope="col">${t('demo.colRegion')}</th>
              <th scope="col" class="num">${t('demo.colSpend')}</th>
              <th scope="col" class="num">${t('demo.colBudgetUsed')}</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((p) => `
              <tr>
                <td><button class="row-link" data-project="${p.id}">${esc(projectLabel(p.id))}</button><span class="cell-sub">${p.id}</span></td>
                <td>${ownerOf(p.id) ? esc(teamLabel(ownerOf(p.id))) : statusText('critical', t('demo.toAssign'))}</td>
                <td>${envLabel(p.env)}</td>
                <td>${p.region}</td>
                <td class="num">${money(p.cost)}</td>
                <td class="num">${meter(p.cost / (p.budget * 100) * 100)}</td>
              </tr>`).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <th scope="row">${t('demo.totalCount', { count: plural(list.length, t('demo.projectOne'), t('demo.projectMany')) })}</th>
              <td></td><td></td><td></td>
              <td class="num">${money(total)}</td>
              <td class="num">${budget ? meter(total / budget * 100) : ''}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>`;
}

/* ---------- Optimisations ---------- */

function optimise() {
  const recs = teamRecommendations();
  const visible = recs.filter((r) => state.recFilter === 'all' || statusOf(r.id) === state.recFilter);
  const open = recs.filter((r) => statusOf(r.id) !== 'rejected');
  const approved = recs.filter((r) => ['approved', 'implemented'].includes(statusOf(r.id)));

  return pageHead(
    t('demo.optimizations'),
    t('demo.optimizationsLede'),
    '',
    ['Usage Optimization', 'Rate Optimization'],
  )
    + filterBar([
      teamField(),
      selectField('rec-filter', t('demo.status'), [['all', t('demo.allStatuses')], ...Object.entries(STATUS).map(([key, label]) => [key, pick(label)])], state.recFilter),
    ], t('demo.monthlyEstimates'))
    + `
    <dl class="figures">
      <div class="figure">
        <dt>${t('demo.estimatedPotential')}</dt>
        <dd class="figure-value">${money(sum(open, (r) => r.saving))}<span class="unit"> ${t('demo.perMonth')}</span></dd>
        <dd class="figure-note">${plural(open.length, t('demo.leadOpenOne'), t('demo.leadOpenMany'))}${t('demo.excludingCud')}</dd>
      </div>
      <div class="figure">
        <dt>${t('demo.approvedLeads')}</dt>
        <dd class="figure-value">${money(sum(approved, (r) => r.saving))}<span class="unit"> ${t('demo.perMonth')}</span></dd>
        <dd class="figure-note">${t('demo.countOfTotal', { count: approved.length, total: recs.length })}</dd>
      </div>
      <div class="figure">
        <dt>${t('demo.realizedSavings')}</dt>
        <dd class="figure-value">${t('demo.notMeasured')}</dd>
        <dd class="figure-note">${t('demo.measureNote')}</dd>
      </div>
    </dl>`
    + recommendationTable(visible)
    + decisionLog();
}

function recommendationTable(list) {
  const counted = list.filter((r) => statusOf(r.id) !== 'rejected');
  return `
    <section class="section" aria-labelledby="plan-title">
      <div class="section-head"><h2 id="plan-title">${t('demo.optimizationPlan')}</h2></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">${t('demo.colLead')}</th>
              <th scope="col">${t('demo.colServiceProject')}</th>
              <th scope="col">${t('demo.colRisk')}</th>
              <th scope="col">${t('demo.colEffort')}</th>
              <th scope="col">${t('demo.status')}</th>
              <th scope="col" class="num">${t('demo.colEstimatedSaving')}</th>
            </tr>
          </thead>
          <tbody>
            ${list.length ? list.map((r) => {
              const rejected = statusOf(r.id) === 'rejected';
              return `
                <tr class="${rejected ? 'is-rejected' : ''}">
                  <td class="cell-wide"><button class="row-link" data-rec="${r.id}">${esc(pick(r.title))}</button><span class="cell-sub">${esc(pick(r.description))}</span></td>
                  <td>${r.service}<span class="cell-sub">${r.project}</span></td>
                  <td>${pick(r.risk)}</td>
                  <td>${pick(r.effort)}</td>
                  <td>${pick(STATUS[statusOf(r.id)])}</td>
                  <td class="num"><span class="amount">${money(r.saving)}</span></td>
                </tr>`;
            }).join('') : `<tr><td colspan="6" class="empty">${t('demo.noLeads')}</td></tr>`}
          </tbody>
          ${list.length ? `
          <tfoot>
            <tr class="total-row">
              <th scope="row" colspan="5">${t('demo.totalShown')}</th>
              <td class="num">${money(sum(counted, (r) => r.saving))}</td>
            </tr>
          </tfoot>` : ''}
        </table>
      </div>
    </section>`;
}

function decisionLog() {
  const time = (iso) => new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
  return `
    <section class="section" aria-labelledby="log-title">
      <div class="section-head">
        <div>
          <h2 id="log-title">${t('demo.decisionLog')}</h2>
          <p class="section-note">${t('demo.decisionLogNote')}</p>
        </div>
        <button class="btn" data-action="export-decisions" ${state.decisions.length ? '' : 'disabled'}>${t('demo.exportJson')}</button>
      </div>
      ${state.decisions.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th scope="col">${t('demo.colTime')}</th><th scope="col">${t('demo.colLead')}</th><th scope="col">${t('demo.colDecision')}</th><th scope="col">${t('demo.colReason')}</th></tr></thead>
          <tbody>
            ${state.decisions.slice().reverse().map((d) => `
              <tr>
                <td class="nowrap">${time(d.at)}</td>
                <td>${esc(pick(recommendations.find((r) => r.id === d.id).title))}</td>
                <td class="nowrap">${pick(STATUS[d.status])}</td>
                <td>${esc(d.note)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : `<p class="empty">${t('demo.noDecisions')}</p>`}
    </section>`;
}

/* ---------- Allocation ---------- */

function allocationView() {
  const input = rows.filter((r) => r.month === state.month);
  const a = allocation(input, state.owners, state.method);
  const allocated = sum(a.items, (x) => x.total);
  const unowned = projects.filter((p) => !p.team && !state.owners[p.id]);
  const gap = a.total - allocated - a.unallocated;
  const max = Math.max(1, ...a.items.map((r) => r.total));
  const share = (v) => a.total ? pct(v / a.total * 100) : '—';

  return pageHead(
    t('demo.allocation'),
    t('demo.allocationLede'),
    `<button class="btn" data-action="export-allocation">${t('demo.exportShowback')}</button>
     <button class="btn btn-primary" data-action="export-chargeback" ${a.unallocated ? 'disabled' : ''}>${t('demo.prepareChargeback')}</button>`,
    ['Allocation', 'Invoicing & Chargeback'],
  )
    + filterBar([
      periodField(),
      selectField('allocation-method', t('demo.sharingKey'), [['usage', t('demo.byDirectCost')], ['equal', t('demo.equalShares')]], state.method),
    ], t('demo.allocationNote'))
    + (unowned.length ? `
    <div class="notice notice-critical">
      ${icon('alert')}
      <p><strong>${t('demo.sandboxNoOwner')}</strong> ${t('demo.unassignedBlocked', { amount: money(a.unallocated) })}</p>
      <div class="notice-actions">
        <label class="sr-only" for="assign-owner">${t('demo.ownerOfSandbox')}</label>
        <select id="assign-owner">${teams.map((team) => `<option value="${esc(team)}" ${team === 'Innovation' ? 'selected' : ''}>${esc(teamLabel(team))}</option>`).join('')}</select>
        <button class="btn btn-primary" data-action="assign">${t('demo.assign')}</button>
      </div>
    </div>` : `
    <div class="notice notice-good">
      ${icon('check')}
      <p><strong>${t('demo.allCostsOwned')}</strong> ${t('demo.chargebackReady')}</p>
    </div>`)
    + `
    <section class="section" aria-labelledby="split-title">
      <div class="section-head">
        <div>
          <h2 id="split-title">${t('demo.splitTitle')}</h2>
          <p class="section-note">${t('demo.splitNote')}</p>
        </div>
        <ul class="legend">
          <li><span class="key key-rect key-direct"></span>${t('demo.directCosts')}</li>
          <li><span class="key key-rect key-shared"></span>${t('demo.sharedShare')}</li>
        </ul>
      </div>
      <div class="stacks">
        ${a.items.map((r) => `
          <div class="stack-row">
            <span class="stack-name">${teamLabel(r.team)}</span>
            <span class="stack" role="img" aria-label="${t('demo.stackAria', { team: teamLabel(r.team), direct: money(r.direct), shared: money(r.shared) })}">
              <span class="stack-direct" style="width:${(r.direct / max * 98).toFixed(2)}%" title="${t('demo.directCostsTitle', { amount: money(r.direct) })}"></span>
              ${r.shared ? `<span class="stack-shared" style="width:${(r.shared / max * 98).toFixed(2)}%" title="${t('demo.sharedTitle', { amount: money(r.shared) })}"></span>` : ''}
            </span>
            <span class="stack-value">${money(r.total)}</span>
          </div>`).join('')}
      </div>

      <div class="table-wrap stacks-table">
        <table>
          <thead>
            <tr>
              <th scope="col">${t('demo.team')}</th>
              <th scope="col" class="num">${t('demo.directCosts')}</th>
              <th scope="col" class="num">${t('demo.sharedPlatform')}</th>
              <th scope="col" class="num">${t('demo.totalAllocated')}</th>
              <th scope="col" class="num">${t('demo.shareOfTotal')}</th>
            </tr>
          </thead>
          <tbody>
            ${a.items.map((r) => `
              <tr>
                <th scope="row">${teamLabel(r.team)}</th>
                <td class="num">${money(r.direct, 2)}</td>
                <td class="num">${money(r.shared, 2)}</td>
                <td class="num">${money(r.total, 2)}</td>
                <td class="num">${share(r.total)}</td>
              </tr>`).join('')}
            ${a.unallocated ? `
              <tr>
                <th scope="row">${statusText('critical', t('demo.unassigned'))}</th>
                <td class="num">${money(a.unallocated, 2)}</td>
                <td class="num">—</td>
                <td class="num">${money(a.unallocated, 2)}</td>
                <td class="num">${share(a.unallocated)}</td>
              </tr>` : ''}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <th scope="row">${t('demo.reconciledTotal')}</th>
              <td class="num">${money(a.totalDirect + a.unallocated, 2)}</td>
              <td class="num">${money(a.shared, 2)}</td>
              <td class="num">${money(a.total, 2)}</td>
              <td class="num">${pct(100)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="check">
        <p class="check-formula">${t('demo.checkFormula', {
          billed: money(a.total, 2),
          allocated: money(allocated, 2),
          unassigned: money(a.unallocated, 2),
          gap: `<strong>${money(gap, 2)}</strong>`,
        })}</p>
        ${gap === 0 ? statusText('good', t('demo.reconciledToCent')) : statusText('critical', t('demo.gapToReview'))}
      </div>

      <p class="section-note">${pick({
        fr: 'Montants en coût effectif (EffectiveCost) : la remise du CUD flexible profite aux projets qui consomment, sa part inutilisée reste au socle partagé. Les centimes résiduels sont attribués aux plus forts restes.',
        en: 'Amounts in effective cost (EffectiveCost): the flexible CUD discount benefits the projects that consume, and its unused share stays with the shared platform. Leftover cents go to the largest remainders.',
      })} ${state.method === 'usage' ? t('demo.methodUsage') : t('demo.methodEqual')} ${state.month === 9 ? t('demo.septPartial') : ''}</p>
    </section>`;
}

/* ---------- Simulateur CUD ---------- */

function range(id, label, min, max, minNote = '', maxNote = '') {
  return `
    <div class="control">
      <div class="control-head">
        <label for="${id}">${label}</label>
        <output id="${id}-output" for="${id}">${pct(state[id])}</output>
      </div>
      <input id="${id}" type="range" min="${min}" max="${max}" step="1" value="${state[id]}">
      <div class="range-scale"><span>${pct(min)}${minNote}</span><span>${pct(max)}${maxNote}</span></div>
    </div>`;
}

function simulate() {
  return pageHead(
    t('demo.cudSimulator'),
    t('demo.cudLede'),
    '',
    ['Rate Optimization', 'Planning & Estimating'],
  ) + `
    <div class="sim">
      <section class="controls" aria-labelledby="controls-title">
        <h2 id="controls-title">${t('demo.assumptions')}</h2>
        <div class="control">
          <label for="base">${t('demo.onDemandAt100', { usage: pct(100) })}</label>
          <div class="input-affix">
            <input id="base" type="number" min="100" max="1000000" step="100" value="${state.base}" inputmode="numeric">
            <span>${t('demo.eurosPerMonth')}</span>
          </div>
        </div>
        ${range('usage', t('demo.realUsage'), 20, 120, t('demo.contractionNote'), t('demo.growthNote'))}
        ${range('commit', t('demo.committedShare'), 0, 100)}
        ${range('discount', t('demo.commitDiscount'), 10, 60)}
        <div class="control">
          <p class="control-label">${t('demo.scenarios')}</p>
          <div class="presets">
            <button class="btn btn-small" data-scenario="stable">${t('demo.scenarioStable')}</button>
            <button class="btn btn-small" data-scenario="drop">${t('demo.scenarioDrop', { usage: pct(40) })}</button>
            <button class="btn btn-small" data-scenario="none">${t('demo.scenarioNone')}</button>
          </div>
        </div>
        <p class="control-note">${t('demo.simNote')}</p>
      </section>
      <div id="simulation-results"></div>
    </div>`;
}

function simResults() {
  const { base, usage, commit, discount } = state;
  const r = commitment(base, usage, commit, discount);
  const euros = (v) => money(Math.round(v * 100));
  const breakeven = commit * (1 - discount / 100);
  const outcome = r.saving > 0
    ? statusText('good', t('demo.savingPerMonth', { amount: euros(r.saving) }))
    : r.saving < 0
      ? statusText('critical', t('demo.overcostPerMonth', { amount: euros(-r.saving) }))
      : `<span class="status">${t('demo.noGap')}</span>`;

  const xs = [...new Set([...Array.from({ length: 25 }, (_, i) => i * 5), commit, usage])].sort((a, b) => a - b);

  return `
    <section class="statement statement-compact" aria-label="${t('demo.monthlyWithCommit')}">
      ${term(t('demo.fixedCommitment'), euros(r.fee), t('demo.commitNote', { commit: pct(commit), discount: pct(discount) }))}
      ${operator('+', t('demo.opPlus'))}
      ${term(t('demo.usageAbove'), money(Math.round(r.cost) * 100 - Math.round(r.fee) * 100), t('demo.billedOnDemand'))}
      ${operator('=', t('demo.opEquals'))}
      ${term(t('demo.withCommitment'), `<span class="total">${euros(r.cost)}</span>`, t('demo.atUsage', { usage: pct(usage) }), 'term-result')}
      ${term(t('demo.onDemand'), euros(r.actual), outcome, 'term-aside')}
    </section>

    ${r.unused ? `
    <div class="notice notice-critical">
      ${icon('alert')}
      <p><strong>${t('demo.unusedTitle', { amount: euros(r.unused) })}</strong> ${t('demo.unusedBody')}</p>
    </div>` : ''}

    <section class="section section-tight" aria-labelledby="sim-chart-title">
      <h2 id="sim-chart-title">${t('demo.monthlyByUsage')}</h2>
      <p class="section-note">${commit
        ? t('demo.breakevenNote', { breakeven: pct(breakeven), utilization: pct(r.utilization) })
        : t('demo.noCommitNote')}</p>
      ${lineChart({
        id: 'commitment',
        label: t('demo.commitChartLabel'),
        xs,
        xDomain: [0, 120],
        xTicks: [0, 20, 40, 60, 80, 100, 120].map((u) => ({ value: u, label: pct(u) })),
        series: [
          { key: 'current', label: t('demo.withCommitment'), values: xs.map((u) => commitment(base, u, commit, discount).cost * 100) },
          { key: 'reference', label: t('demo.onDemand'), values: xs.map((u) => base * u) },
        ],
        axis: kEuros,
        title: (u) => t('demo.usageTitle', { usage: pct(u) }),
        value: (cents) => money(Math.round(cents)),
        annotations: [{ x: usage, label: t('demo.currentUsage', { usage: pct(usage) }), tone: 'neutral', align: usage > 90 ? 'end' : 'start' }],
        dots: [{ key: 'current', x: usage, y: r.cost * 100 }],
      })}
      <p class="section-note">${t('demo.rightsizingNote')}</p>
    </section>`;
}

function bindSimulator() {
  const update = () => {
    $('#simulation-results').innerHTML = simResults();
    bindCharts($('#simulation-results'));
  };
  update();

  ['usage', 'commit', 'discount'].forEach((id) => {
    $(`#${id}`).addEventListener('input', (e) => {
      state[id] = Number(e.target.value);
      $(`#${id}-output`).textContent = pct(state[id]);
      update();
    });
  });

  const base = $('#base');
  base.addEventListener('input', () => {
    const v = Number(base.value);
    if (Number.isFinite(v) && v >= 100 && v <= 1000000) {
      state.base = v;
      update();
    }
  });
  base.addEventListener('change', () => {
    if (!base.checkValidity()) {
      base.value = state.base;
      base.reportValidity();
    }
  });
}

/* ---------- Méthode ---------- */

function method() {
  const steps = [
    ['demo/overview', '', t('demo.step1Title'), t('demo.step1Text')],
    ['demo/optimise', 'bq-partition', t('demo.step2Title'), t('demo.step2Text')],
    ['demo/allocation', '', t('demo.step3Title'), t('demo.step3Text')],
    ['demo/simulate', '', t('demo.step4Title'), t('demo.step4Text')],
    ['situations/bill-spike', '', t('demo.step5Title'), t('demo.step5Text')],
  ];

  const rules = [
    [t('demo.ruleFormat'), pick({
      fr: 'Lignes FOCUS 1.2 quotidiennes : usage, crédits, achat d’engagement et part inutilisée. La démo agrège l’EffectiveCost par jour, projet et service.',
      en: 'Daily FOCUS 1.2 rows: usage, credits, commitment purchases and unused share. The demo aggregates EffectiveCost by day, project and service.',
    })],
    [t('demo.ruleCommitment'), t('demo.ruleCommitmentText', { fee: money(190000), discount: pct(28) })],
    [t('demo.ruleCredits'), t('demo.ruleCreditsText', { share: pct(2) })],
    [t('demo.ruleForecast'), pick({
      fr: 'Septembre : réalisé du 1er au 15 + moyenne quotidienne des 7 derniers jours × 15 jours restants. Extrapolation simple, sans intervalle de confiance.',
      en: 'September: actual from the 1st to the 15th + daily average of the last 7 days × 15 remaining days. Simple extrapolation, with no confidence interval.',
    })],
    [t('demo.ruleComparison'), pick({
      fr: 'Septembre du 1er au 15 comparé à août du 1er au 15. Les budgets sont mensuels.',
      en: 'September 1–15 compared with August 1–15. Budgets are monthly.',
    })],
    [t('demo.ruleLeads'), pick({
      fr: 'Somme des estimations des pistes non écartées, sur des ressources distinctes. Aucune économie constatée n’est inventée.',
      en: 'Sum of the estimates for open leads, on distinct resources. No realized saving is made up.',
    })],
    [t('demo.ruleAllocation'), pick({
      fr: 'Coûts directs par équipe, socle partagé redistribué au prorata ou à parts égales. Les coûts non attribués restent visibles et bloquent le chargeback.',
      en: 'Direct costs by team, shared platform redistributed pro rata or in equal shares. Unassigned costs stay visible and block the chargeback.',
    })],
    [t('demo.ruleRounding'), pick({
      fr: 'Calculs en centimes entiers, reliquat aux plus forts restes. Affichage à l’euro, exports au centime.',
      en: 'Calculations in whole cents, remainder allocated by largest remainders. Displayed to the euro, exports to the cent.',
    })],
  ];

  const pipeline = [
    [t('demo.pipeTitle1'), pick({
      fr: 'Google Cloud : export FOCUS vers BigQuery (preview), dans un projet dédié, lecture au moindre privilège. AWS et Azure : exports FOCUS vers S3 ou un compte de stockage.',
      en: 'Google Cloud: FOCUS export to BigQuery (preview), in a dedicated project, with least-privilege read access. AWS and Azure: FOCUS exports to S3 or a storage account.',
    })],
    [t('demo.pipeTitle2'), pick({
      fr: 'Lancer le contrôle qualité du Labo SQL, rapprocher BilledCost de la facture d’un mois clôturé, noter les écarts de conformité.',
      en: 'Run the quality check in the SQL Lab, reconcile BilledCost with the invoice of a closed month, and log compliance gaps.',
    })],
    [t('demo.pipeTitle3'), pick({
      fr: 'Rapprocher projets, labels et centres de coûts ; joindre les métriques d’usage et les propriétaires applicatifs.',
      en: 'Reconcile projects, labels and cost centers; attach usage metrics and application owners.',
    })],
    [t('demo.pipeTitle4'), pick({
      fr: 'Ajouter une API authentifiée, un contrôle d’accès par équipe et un historique auditable des décisions.',
      en: 'Add an authenticated API, team-based access control and an auditable decision history.',
    })],
  ];

  const references = [
    ['https://focus.finops.org/focus-specification/', t('demo.refFocusTitle'), t('demo.refFocusText')],
    ['https://www.finops.org/framework/', t('demo.refFinopsTitle'), t('demo.refFinopsText')],
    ['https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/focus-export', t('demo.refGcpTitle'), t('demo.refGcpText')],
    ['https://cloud.google.com/docs/cuds', t('demo.refCudsTitle'), t('demo.refCudsText')],
  ];

  return pageHead(
    t('demo.method'),
    t('demo.methodLede'),
    `<button class="btn" data-action="reset">${t('demo.resetDemo')}</button>`,
  ) + `
    <section class="section section-first" aria-labelledby="tour-title">
      <h2 id="tour-title">${t('demo.tour')}</h2>
      <ol class="steps">
        ${steps.map(([route, rec, title, text], i) => `
        <li>
          <a class="step" href="#${route}" ${rec ? `data-guide="${rec}"` : `data-nav="${route}"`}>
            <span class="step-number">${i + 1}</span>
            <strong>${title}</strong>
            <span>${text}</span>
          </a>
        </li>`).join('')}
      </ol>
    </section>

    <div class="columns section">
      <section class="prose" aria-labelledby="scope-title">
        <h2 id="scope-title">${t('demo.scope')}</h2>
        <p>${t('demo.scopeP1', { count: focusRows.length.toLocaleString(locale()) })}</p>
        <p>${pick({
          fr: 'Un générateur déterministe produit les mêmes lignes à chaque ouverture : variation quotidienne, activité réduite le week-end, croissance du stockage de Nova Intelligence et surconsommation BigQuery à partir du 11 septembre.',
          en: 'A deterministic generator produces the same rows each time it opens: daily variation, reduced weekend activity, storage growth at Nova Intelligence and BigQuery overconsumption from September 11.',
        })}</p>
        <p>${pick({
          fr: 'Aucune donnée d’entreprise réelle, aucun compte cloud connecté. Les affectations et décisions restent dans la session de cet onglet ; fermer l’onglet ou réinitialiser la démo les efface.',
          en: 'No real company data, no connected cloud account. Assignments and decisions stay in this tab’s session; closing the tab or resetting the demo erases them.',
        })}</p>
        <h3>${t('demo.calcRules')}</h3>
        <dl class="rules">
        ${rules.map(([name, text]) => `<div><dt>${name}</dt><dd>${text}</dd></div>`).join('')}
        </dl>
      </section>

      <section class="prose" aria-labelledby="real-title">
        <h2 id="real-title">${t('demo.connectRealExport')}</h2>
        <ol class="pipeline">
        ${pipeline.map(([title, text]) => `<li><strong>${title}</strong> ${text}</li>`).join('')}
        </ol>
        <p>${pick({
          fr: 'Les tests automatiques vérifient les règles de coût FOCUS de la démo et exécutent chaque requête de la bibliothèque. Ce prototype ne contient ni connecteur actif, ni moteur de facturation, ni automatisation de ressources.',
          en: 'Automated tests check the demo’s FOCUS cost rules and run every query in the library. This prototype includes no live connector, no billing engine and no resource automation.',
        })}</p>
        <h3>${t('demo.references')}</h3>
        <ul class="references">
        ${references.map(([href, title, text]) => `<li><a class="link" href="${href}" target="_blank" rel="noopener noreferrer">${title}</a><span>${text}</span></li>`).join('')}
        </ul>
      </section>
    </div>`;
}

/* ---------- Fiches détaillées ---------- */

function showProject(id) {
  const p = projectById[id];
  const input = rows.filter((r) => r.month === state.month && r.project === id);
  const cost = sum(input, (r) => r.cost);
  const owner = ownerOf(id);

  openSheet(sheetHead(esc(projectLabel(p.id)), `${p.id}, ${p.region}`) + `
<div class="sheet-figure">
<p class="figure-value">${money(cost)}</p>
<p class="figure-note">${t('demo.effectiveCostFor', { period: pick(MONTHS[state.month].range) })}</p>
</div>
<dl class="facts">
<div><dt>${t('demo.team')}</dt><dd>${owner ? esc(teamLabel(owner)) : statusText('critical', t('demo.toAssign'))}</dd></div>
<div><dt>${t('demo.colEnv')}</dt><dd>${envLabel(p.env)}</dd></div>
<div><dt>${t('demo.monthlyBudget')}</dt><dd>${money(p.budget * 100)}</dd></div>
<div><dt>${t('demo.colBudgetUsed')}</dt><dd>${pct(cost / (p.budget * 100) * 100)}</dd></div>
</dl>
<h3>${t('demo.byService')}</h3>
${serviceBars(input)}
<p class="sheet-foot">${t('demo.fictionalNote')}</p>`);
}

function showRecommendation(id) {
  const r = recommendations.find((x) => x.id === id);
  const status = statusOf(id);
  const actions = {
    candidate: [['approved', t('demo.approveLead'), true], ['rejected', t('demo.dropLead')]],
    approved: [['implemented', t('demo.markDeployed'), true], ['rejected', t('demo.dropLead')]],
    implemented: [['candidate', t('demo.sendBackToQualify')]],
    rejected: [['candidate', t('demo.sendBackToQualify')]],
  }[status];

  openSheet(sheetHead(esc(pick(r.title)), `${r.service}, ${r.project}`) + `
<dl class="facts facts-four">
<div><dt>${t('demo.status')}</dt><dd>${pick(STATUS[status])}</dd></div>
<div><dt>${t('demo.colRisk')}</dt><dd>${pick(r.risk)}</dd></div>
<div><dt>${t('demo.colEffort')}</dt><dd>${pick(r.effort)}</dd></div>
<div><dt>${t('demo.owner')}</dt><dd>${pick(r.owner)}</dd></div>
</dl>
<div class="sheet-figure">
<p class="figure-value">${money(r.saving)}<span class="unit"> ${t('demo.perMonth')}</span></p>
<p class="figure-note">${t('demo.estimatedNotRealized')}</p>
<p class="formula">${pick(r.formula)}</p>
</div>
<h3>${t('demo.finding')}</h3>
<p>${pick(r.evidence)}</p>
<h3>${t('demo.proposedAction')}</h3>
<p>${pick(r.action)}</p>
${r.before ? `
<details class="sql">
<summary>${t('demo.sqlExample')}</summary>
<p class="code-caption">${t('demo.sqlBefore')}</p>
<pre><code>${esc(r.before)}</code></pre>
<p class="code-caption">${t('demo.sqlAfter')}</p>
<pre><code>${esc(r.after)}</code></pre>
<p>${t('demo.sqlNote')}</p>
</details>` : ''}
<h3>${t('demo.guardrails')}</h3>
<p>${pick(r.guardrail)}</p>
<h3>${t('demo.measureAfterDeploy')}</h3>
<p>${pick(r.validation)}</p>
<form id="decision-form" class="decision">
<label for="decision-note">${t('demo.decisionReason')}</label>
<textarea id="decision-note" rows="3" maxlength="500" placeholder="${t('demo.reasonPlaceholder')}"></textarea>
<p class="form-help">${t('demo.reasonRequired')}</p>
<div class="decision-actions">
${actions.map(([value, label, primary]) => `<button type="submit" class="btn ${primary ? 'btn-primary' : ''}" value="${value}">${label}</button>`).join('')}
</div>
</form>`);

  const note = $('#decision-note');
  note.addEventListener('input', () => note.setCustomValidity(''));
  $('#decision-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = note.value.trim();
    if (!text) {
      note.setCustomValidity(t('demo.reasonMissing'));
      note.reportValidity();
      return;
    }
    const next = e.submitter.value;
    state.statuses[id] = next;
    state.decisions.push({ id, status: next, note: text, at: new Date().toISOString() });
    persist();
    $('#detail').close();
    rerender();
    toast(t('demo.decisionSaved', { done: pick(DECISION_DONE[next]) }));
  });
}


function exportFocus() {
  const input = focusRows.filter((r) => r.month === state.month && inTeam(r.SubAccountId));
  download(`stratus-focus-${MONTHS[state.month].key}.csv`, toFocusCsv(input));
  toast(t('demo.focusExported', { count: input.length }));
}

function exportAllocation(chargeback = false) {
  const input = rows.filter((r) => r.month === state.month);
  const a = allocation(input, state.owners, state.method);
  if (chargeback && a.unallocated) {
    toast(t('demo.assignFirst'));
    return;
  }
  const period = MONTHS[state.month].key;
  const header = ['Period', 'Mode', 'Team', 'DirectCostEUR', 'SharedCostEUR', 'TotalEUR', 'AllocationMethod', 'Status'];
  const lines = a.items.map((r) => [
    period, chargeback ? 'Chargeback' : 'Showback', r.team,
    (r.direct / 100).toFixed(2), (r.shared / 100).toFixed(2), (r.total / 100).toFixed(2),
    state.method, state.month === 9 ? 'PROVISOIRE_1_15_SEPTEMBRE' : 'BROUILLON_A_VALIDER',
  ]);
  if (a.unallocated) {
    lines.push([period, 'Showback', 'Non attribué', (a.unallocated / 100).toFixed(2), '0.00', (a.unallocated / 100).toFixed(2), state.method, 'NON_ATTRIBUE']);
  }
  download(`stratus-${chargeback ? 'chargeback-brouillon' : 'showback'}-2026-${state.month}.csv`, [header, ...lines].map((l) => l.join(',')).join('\r\n'));
  toast(t('demo.allocExported', { kind: chargeback ? t('demo.chargebackDraft') : 'Showback', total: money(a.total, 2) }));
}

function exportDecisions() {
  const payload = state.decisions.map((d) => ({ ...d, title: pick(recommendations.find((r) => r.id === d.id).title), simulation: true }));
  download('stratus-decisions.json', JSON.stringify(payload, null, 2), 'application/json');
  toast(t('demo.decisionLogExported'));
}

function resetDemo() {
  Object.assign(state, DEFAULTS, { owners: {}, statuses: {}, decisions: [] });
  persist();
  rerender();
  toast(t('demo.demoReset'));
}

const SCENARIOS = {
  stable: { usage: 85, commit: 65 },
  drop: { usage: 40, commit: 85 },
  none: { commit: 0 },
};

// Libellés bilingues {fr, en} (affichés avec pick()) ; les identifiants servent au routage.
export const DEMO_VIEWS = [
  ['overview', { fr: 'Vue d’ensemble', en: 'Overview' }, overview],
  ['optimise', { fr: 'Optimisations', en: 'Optimizations' }, optimise],
  ['allocation', { fr: 'Allocation', en: 'Allocation' }, allocationView],
  ['simulate', { fr: 'Simulateur CUD', en: 'CUD simulator' }, simulate],
  ['method', { fr: 'Méthode', en: 'Method' }, method],
];

export function renderDemo() {
  const view = DEMO_VIEWS.find(([id]) => id === state.view) || DEMO_VIEWS[0];
  return `
    <nav class="subnav" aria-label="${t('demo.viewsAria')}">
    ${DEMO_VIEWS.map(([id, label]) => `<a class="subnav-link" href="#demo/${id}" data-nav="demo/${id}" ${view[0] === id ? 'aria-current="page"' : ''}>${pick(label)}</a>`).join('')}
    </nav>
    ${view[2]()}`;
}

export function bindDemo() {
  const on = (selector, type, handler) => $(selector)?.addEventListener(type, handler);
  on('#period', 'change', (e) => { state.month = Number(e.target.value); rerender(); });
  on('#team', 'change', (e) => { state.team = e.target.value; rerender(); });
  on('#rec-filter', 'change', (e) => { state.recFilter = e.target.value; rerender(); });
  on('#allocation-method', 'change', (e) => { state.method = e.target.value; persist(); rerender(); });
  if (state.view === 'simulate') bindSimulator();
  bindCharts();
}

export { showRecommendation };

// Renvoie true si le clic concernait la démo.
export function handleDemoClick(target) {
  const { project, rec, action, scenario } = target.dataset;
  if (project) { showProject(project); return true; }
  if (rec) { showRecommendation(rec); return true; }
  if (scenario) {
    Object.assign(state, SCENARIOS[scenario]);
    rerender();
    return true;
  }
  switch (action) {
    case 'export': exportFocus(); return true;
    case 'export-allocation': exportAllocation(); return true;
    case 'export-chargeback': exportAllocation(true); return true;
    case 'export-decisions': exportDecisions(); return true;
    case 'reset': resetDemo(); return true;
    case 'assign':
      state.owners['sandbox-experiments'] = $('#assign-owner').value;
      persist();
      rerender();
      toast(t('demo.assigned', { team: teamLabel(state.owners['sandbox-experiments']) }));
      return true;
    default:
      return false;
  }
}
