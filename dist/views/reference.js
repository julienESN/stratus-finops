// Référentiel : framework FinOps, FOCUS (avec l'anatomie d'une ligne) et KPI, avec une recherche transversale.

import { framework, focus, kpis } from '../content/reference.js';
import { snippetById } from '../content/snippets.js';
import { focusRows, COMMITMENT, sum } from '../data.js';
import { state, rerender } from '../state.js';
import { $, esc, rich, money, pageHead } from '../ui.js';
import { t, pick, lang } from '../i18n.js';

// Libellés (clés de dist/strings/reference.js) résolus au rendu, pour suivre la langue courante.
const SECTIONS = [
  ['framework', 'reference.section.framework'],
  ['focus', 'reference.section.focus'],
  ['kpis', 'reference.section.kpis'],
];

let query = '';
let anatomy = 'used';

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- Framework ---------- */

function frameworkSection() {
  return `
    <section class="ref-block" aria-labelledby="fw-title">
      <h2 id="fw-title">${framework.version}</h2>
      <p class="ref-lede">${esc(pick(framework.definition))}</p>
    </section>

    <section class="ref-block" aria-labelledby="principles-title">
      <h3 id="principles-title">${t('reference.principles')}</h3>
      <ol class="ref-principles">
        ${framework.principles.map(([name, text]) => `<li><strong>${esc(name)}</strong><span>${esc(pick(text))}</span></li>`).join('')}
      </ol>
    </section>

    <div class="ref-columns">
      <section class="ref-block" aria-labelledby="phases-title">
        <h3 id="phases-title">${t('reference.phases')}</h3>
        <dl class="ref-list">${framework.phases.map(([n, text]) => `<div><dt>${n}</dt><dd>${esc(pick(text))}</dd></div>`).join('')}</dl>
        <h3>${t('reference.maturity')}</h3>
        <dl class="ref-list">${framework.maturity.map(([n, text]) => `<div><dt>${n}</dt><dd>${esc(pick(text))}</dd></div>`).join('')}</dl>
        <h3>${t('reference.scopes')}</h3>
        <p class="ref-text">${esc(pick(framework.scopes))}</p>
      </section>
      <section class="ref-block" aria-labelledby="personas-title">
        <h3 id="personas-title">${t('reference.personas.core')}</h3>
        <dl class="ref-list">${framework.personas.core.map(([n, text]) => `<div><dt>${n}</dt><dd>${esc(pick(text))}</dd></div>`).join('')}</dl>
        <h3>${t('reference.personas.allied')}</h3>
        <dl class="ref-list">${framework.personas.allied.map(([n, text]) => `<div><dt>${n}</dt><dd>${esc(pick(text))}</dd></div>`).join('')}</dl>
      </section>
    </div>

    <section class="ref-block" aria-labelledby="domains-title">
      <h3 id="domains-title">${t('reference.domains')}</h3>
      <div class="domains">
        ${framework.domains.map((d) => `
          <div class="domain">
            <h4>${esc(d.name)}</h4>
            <p class="domain-fr">${esc(pick(d.subtitle))}</p>
            <dl class="ref-list ref-list-tight">
              ${d.capabilities.map(([n, text]) => `<div><dt>${esc(n)}</dt><dd>${esc(pick(text))}</dd></div>`).join('')}
            </dl>
          </div>`).join('')}
      </div>
    </section>`;
}

/* ---------- FOCUS ---------- */

const ANATOMY_DATE = '2026-09-13';

// [id, clé du libellé, prédicat sur les lignes, explication bilingue]
const EXAMPLES = [
  ['standard', 'reference.anatomy.standard', (r) => r.ChargeCategory === 'Usage' && r.PricingCategory === 'Standard' && r.SubAccountId === 'atlas-analytics-prod' && r.ServiceName === 'BigQuery',
    { fr: 'Sans remise négociée ni engagement, les quatre coûts sont égaux.', en: 'With no negotiated discount or commitment, the four costs are equal.' }],
  ['used', 'reference.anatomy.used', (r) => r.CommitmentDiscountStatus === 'Used' && r.SubAccountId === 'orion-platform-prod',
    {
      fr: 'BilledCost vaut 0 : les frais sont facturés sur la ligne Purchase. EffectiveCost porte la part amortie, 28 % sous ContractedCost, qui reste l’équivalent à la demande.',
      en: 'BilledCost is 0: the fee is billed on the Purchase row. EffectiveCost carries the amortized share, 28% below ContractedCost, which remains the on-demand equivalent.',
    }],
  ['unused', 'reference.anatomy.unused', (r) => r.CommitmentDiscountStatus === 'Unused',
    { fr: 'Seul EffectiveCost est renseigné : c’est l’engagement payé mais non consommé ce jour-là.', en: 'Only EffectiveCost is filled in: this is the committed spend that went unused that day.' }],
  ['purchase', 'reference.anatomy.purchase', (r) => r.ChargeCategory === 'Purchase',
    { fr: 'BilledCost porte les frais du jour. EffectiveCost vaut 0 car ces frais sont amortis sur les lignes Used et Unused.', en: 'BilledCost carries the day’s fee. EffectiveCost is 0 because this fee is amortized over the Used and Unused rows.' }],
  ['credit', 'reference.anatomy.credit', (r) => r.ChargeCategory === 'Credit' && r.SubAccountId === 'atlas-analytics-prod' && r.ServiceName === 'BigQuery',
    { fr: 'Montant négatif ; pour un crédit indépendant, les quatre coûts sont égaux.', en: 'Negative amount; for a standalone credit, the four costs are equal.' }],
];

function anatomySection() {
  const day = focusRows.filter((r) => r.date === ANATOMY_DATE);
  const [, , find, explanation] = EXAMPLES.find(([id]) => id === anatomy);
  const row = day.find(find);
  const mine = day.filter((r) => r.CommitmentDiscountId === COMMITMENT.id);
  const fee = sum(mine.filter((r) => r.ChargeCategory === 'Purchase'), (r) => r.BilledCost);
  const used = sum(mine.filter((r) => r.CommitmentDiscountStatus === 'Used'), (r) => r.EffectiveCost);
  const unused = sum(mine.filter((r) => r.CommitmentDiscountStatus === 'Unused'), (r) => r.EffectiveCost);
  const columns = ['ChargeCategory', 'ChargeFrequency', 'PricingCategory', 'CommitmentDiscountStatus', 'ServiceName', 'SubAccountId', 'ChargeDescription'];

  return `
    <section class="ref-block anatomy" aria-labelledby="anatomy-title">
      <h3 id="anatomy-title">${t('reference.anatomy.title')}</h3>
      <p class="ref-text">${t('reference.anatomy.intro')}</p>
      <div class="segmented" role="radiogroup" aria-label="${t('reference.anatomy.group')}">
        ${EXAMPLES.map(([id, labelKey]) => `<button role="radio" aria-checked="${id === anatomy}" data-anatomy="${id}">${t(labelKey)}</button>`).join('')}
      </div>
      <div class="anatomy-costs">
        ${['ListCost', 'ContractedCost', 'BilledCost', 'EffectiveCost'].map((c) => `
          <div class="${row[c] === 0 ? 'is-zero' : ''}">
            <p class="term-label"><code>${c}</code></p>
            <p class="anatomy-value">${money(row[c], 2)}</p>
          </div>`).join('')}
      </div>
      <p class="anatomy-explain">${rich(pick(explanation))}</p>
      <dl class="anatomy-columns">
        ${columns.map((c) => `<div><dt><code>${c}</code></dt><dd>${row[c] === null ? '<span class="null">null</span>' : esc(row[c])}</dd></div>`).join('')}
      </dl>
      <p class="check-formula anatomy-check">${t('reference.anatomy.check', { fee: money(fee, 2), used: money(used, 2), unused: money(unused, 2) })}</p>
    </section>`;
}

function focusSection() {
  return `
    <section class="ref-block" aria-labelledby="focus-title">
      <h2 id="focus-title">FOCUS</h2>
      <p class="ref-lede">${esc(pick(focus.definition))}</p>
    </section>

    <section class="ref-block" aria-labelledby="costs-title">
      <h3 id="costs-title">${t('reference.costs.title')}</h3>
      <div class="table-wrap">
        <table class="ref-table">
          <thead><tr><th scope="col">${t('reference.costs.column')}</th><th scope="col">${t('reference.costs.definition')}</th><th scope="col">${t('reference.costs.use')}</th></tr></thead>
          <tbody>${focus.costs.map(([c, d, u]) => `<tr><th scope="row"><code>${c}</code></th><td>${rich(pick(d))}</td><td>${rich(pick(u))}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </section>

    ${anatomySection()}

    <section class="ref-block" aria-labelledby="rules-title">
      <h3 id="rules-title">${t('reference.rules')}</h3>
      <ul class="checklist">${focus.rules.map((r) => `<li>${rich(pick(r))}</li>`).join('')}</ul>
    </section>

    <section class="ref-block" aria-labelledby="columns-title">
      <h3 id="columns-title">${t('reference.columns')}</h3>
      <div class="column-groups">
        ${focus.columnGroups.map(([group, columns]) => `
          <div>
            <h4>${esc(pick(group))}</h4>
            <dl class="ref-list ref-list-tight">
              ${columns.map(([c, text]) => `<div><dt><code>${c}</code></dt><dd>${rich(pick(text))}</dd></div>`).join('')}
            </dl>
          </div>`).join('')}
      </div>
    </section>

    <section class="ref-block" aria-labelledby="providers-title">
      <h3 id="providers-title">${t('reference.providers')}</h3>
      <div class="table-wrap">
        <table class="ref-table providers">
          <thead><tr><th scope="col"></th>${focus.providers.map((p) => `<th scope="col">${p.name}</th>`).join('')}</tr></thead>
          <tbody>
            ${[['export', 'reference.providers.export'], ['subAccount', 'reference.providers.subAccount'], ['tags', 'reference.providers.tags'], ['commitments', 'reference.providers.commitments'], ['gaps', 'reference.providers.gaps']].map(([key, labelKey]) => `
              <tr><th scope="row">${t(labelKey)}</th>${focus.providers.map((p) => `<td>${rich(pick(p[key]))}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="ref-text">${esc(pick(focus.sovereignNote))}</p>
    </section>

    <section class="ref-block" aria-labelledby="versions-title">
      <h3 id="versions-title">${t('reference.versions')}</h3>
      <dl class="ref-list">${focus.versions.map(([v, date, text]) => `<div><dt>FOCUS ${v}<span>${esc(pick(date))}</span></dt><dd>${rich(pick(text))}</dd></div>`).join('')}</dl>
    </section>`;
}

/* ---------- KPI ---------- */

function kpiSection() {
  return `
    <section class="ref-block" aria-labelledby="kpi-title">
      <h2 id="kpi-title">${t('reference.section.kpis')}</h2>
      <p class="ref-lede">${t('reference.kpi.lede')}</p>
    </section>
    <div class="kpi-cards">
      ${kpis.map((k) => `
        <article class="kpi" id="kpi-${k.id}">
          <h3>${esc(pick(k.name))}</h3>
          <p class="kpi-capability">${esc(k.capability)}</p>
          <p class="kpi-formula">${esc(pick(k.formula))}</p>
          <p class="kpi-focus"><code>${esc(pick(k.focus))}</code></p>
          <p class="ref-text">${rich(pick(k.reading))}</p>
          <a class="link" href="#lab/${k.snippet}" data-nav="lab/${k.snippet}" data-run="true">${esc(t('reference.kpi.run', { title: pick(snippetById[k.snippet].title) }))}</a>
        </article>`).join('')}
    </div>`;
}

/* ---------- Recherche ---------- */

function searchIndex() {
  return [
    ...framework.principles.map(([name, text]) => ['framework', t('reference.kind.principle'), name, pick(text)]),
    ...framework.domains.flatMap((d) => d.capabilities.map(([n, text]) => ['framework', t('reference.kind.capability', { domain: d.name }), n, pick(text)])),
    ...[...framework.personas.core, ...framework.personas.allied].map(([n, text]) => ['framework', t('reference.kind.persona'), n, pick(text)]),
    ...focus.costs.map(([c, d]) => ['focus', t('reference.kind.cost'), c, pick(d)]),
    ...focus.columnGroups.flatMap(([g, cols]) => cols.map(([c, text]) => ['focus', t('reference.kind.column', { group: pick(g) }), c, pick(text)])),
    ...focus.rules.map((r) => ['focus', t('reference.kind.rule'), pick(r), '']),
    ...focus.providers.map((p) => ['focus', t('reference.kind.provider'), p.name, [p.export, p.tags, p.commitments, p.gaps].map(pick).join(' ')]),
    ...kpis.map((k) => ['kpis', t('reference.kind.kpi', { capability: k.capability }), pick(k.name), `${pick(k.formula)}. ${pick(k.focus)}`]),
  ];
}

function results() {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const found = searchIndex().filter((entry) => words.every((w) => normalize(entry.join(' ')).includes(w)));
  return `
    <p class="master-count" aria-live="polite">${t(found.length > 1 ? 'reference.resultsMany' : 'reference.resultsOne', { n: found.length })}</p>
    ${found.length ? `<ul class="search-results">
      ${found.map(([section, kind, title, text]) => `
        <li>
          <a href="#reference/${section}" data-nav="reference/${section}" data-clear-search="true">
            <span class="result-kind">${esc(kind)}</span>
            <strong>${esc(title)}</strong>
            ${text ? `<span>${esc(text)}</span>` : ''}
          </a>
        </li>`).join('')}
    </ul>` : `<p class="empty">${t('reference.noResults')}</p>`}`;
}

export function renderReference() {
  const section = SECTIONS.some(([id]) => id === state.detail) ? state.detail : 'framework';
  const body = { framework: frameworkSection, focus: focusSection, kpis: kpiSection }[section];
  return pageHead(
    t('reference.title'),
    t('reference.lede'),
  ) + `
    <div class="filter-bar">
      <label class="field field-grow">
        <span class="field-label">${t('reference.searchLabel')}</span>
        <input id="reference-search" type="search" value="${esc(query)}" placeholder="${t('reference.searchPlaceholder')}" autocomplete="off">
      </label>
    </div>
    ${query.trim() ? results() : `
      <nav class="subnav" aria-label="${t('reference.sectionsLabel')}">
        ${SECTIONS.map(([id, labelKey]) => `<a class="subnav-link" href="#reference/${id}" data-nav="reference/${id}" ${id === section ? 'aria-current="page"' : ''}>${t(labelKey)}</a>`).join('')}
      </nav>
      <div class="reference">${body()}</div>`}`;
}

export function bindReference() {
  const search = $('#reference-search');
  search?.addEventListener('input', () => {
    query = search.value;
    rerender();
  });
}

export function handleReferenceClick(target) {
  if (target.dataset.anatomy) {
    anatomy = target.dataset.anatomy;
    rerender();
    return true;
  }
  if (target.dataset.clearSearch) query = '';
  return false;
}
