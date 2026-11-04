// Veille : offres souveraines en Europe et fil d'actualité, chaque entrée reliée à son impact FinOps et à sa source.

import { news, offers, PROVIDERS, barometer, VEILLE_AS_OF } from '../content/veille.js';
import { rerender } from '../state.js';
import { t, pick } from '../i18n.js';
import { $, esc, rich, pageHead, selectField, plural, pct, icon, statusText, longDate } from '../ui.js';

const filters = { provider: 'all' };

const providerName = Object.fromEntries(PROVIDERS.map(([id, label]) => [id, label]));

const sourceLink = (url, text) => `<a class="link" href="${esc(url)}" target="_blank" rel="noopener">${text}</a>`;

function keyFigures() {
  const qualified = offers.filter((o) => o.tone === 'good').length;
  return `
    <dl class="figures veille-figures">
      <div class="figure">
        <dt>${t('veille.figAi')}</dt>
        <dd class="figure-value">${pct(barometer.aiShare)}</dd>
        <dd class="figure-note">${t('veille.figAiNote', {
          previous: pct(barometer.aiSharePrevious),
          source: sourceLink(barometer.source.url, esc(barometer.source.label)),
        })}</dd>
      </div>
      <div class="figure">
        <dt>${t('veille.figFocus')}</dt>
        <dd class="figure-value">${barometer.focusVersion}</dd>
        <dd class="figure-note">${t('veille.figFocusNote', { date: longDate(barometer.focusDate) })}</dd>
      </div>
      <div class="figure">
        <dt>${t('veille.figOffers')}</dt>
        <dd class="figure-value">${offers.length}</dd>
        <dd class="figure-note">${t('veille.figOffersNote', { qualified, pending: offers.length - qualified })}</dd>
      </div>
    </dl>`;
}

function offerTable() {
  return `
    <section class="section" aria-labelledby="offers-title">
      <div class="section-head">
        <div>
          <h2 id="offers-title">${t('veille.offersTitle')}</h2>
          <p class="section-note">${t('veille.offersNote')}</p>
        </div>
      </div>
      <div class="table-wrap">
        <table class="offers">
          <thead>
            <tr>
              <th scope="col">${t('veille.colOffer')}</th>
              <th scope="col">${t('veille.colOperator')}</th>
              <th scope="col">${t('veille.colLocation')}</th>
              <th scope="col">${t('veille.colStatus')}</th>
            </tr>
          </thead>
          <tbody>
            ${offers.map((o) => `
              <tr>
                <th scope="row">${sourceLink(o.source, esc(pick(o.name)))}<span class="cell-sub">${esc(pick(providerName[o.provider]))}</span></th>
                <td>${esc(pick(o.operator))}</td>
                <td class="nowrap">${esc(pick(o.location))}</td>
                <td>${statusText(o.tone, esc(pick(o.status)))}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`;
}

function newsItem(n) {
  return `
    <li class="news-item">
      <time class="news-date" datetime="${n.date}">${longDate(n.date)}</time>
      <article class="news-body" aria-labelledby="news-${n.id}">
        <p class="news-providers">${n.providers.map((id) => `<span class="chip">${esc(pick(providerName[id]))}</span>`).join('')}</p>
        <h3 id="news-${n.id}">${esc(pick(n.title))}</h3>
        <p class="news-summary">${rich(pick(n.summary))}</p>
        <div class="news-impact">
          <h4>${t('veille.impact')}</h4>
          <p>${rich(pick(n.impact))}</p>
        </div>
        <p class="news-source">${sourceLink(n.source.url, `${esc(t('veille.source', { label: n.source.label }))}${icon('external')}`)}</p>
      </article>
    </li>`;
}

export function renderVeille() {
  const list = news.filter((n) => filters.provider === 'all' || n.providers.includes(filters.provider));

  return pageHead(
    t('veille.title'),
    t('veille.intro'),
    '',
    ['Architecting & Workload Placement', 'Governance, Policy & Risk'],
  )
    + `<p class="as-of">${t('veille.asOf', { date: longDate(VEILLE_AS_OF) })}</p>`
    + keyFigures()
    + offerTable()
    + `
    <section class="section" aria-labelledby="feed-title">
      <div class="section-head">
        <div>
          <h2 id="feed-title">${t('veille.feedTitle')}</h2>
          <p class="section-note">${t('veille.feedNote')}</p>
        </div>
      </div>
      <div class="filter-bar filter-bar-tight">
        ${selectField('veille-provider', t('veille.provider'), [['all', t('veille.allProviders')], ...PROVIDERS.map(([id, label]) => [id, pick(label)])], filters.provider)}
        <p class="filter-note" aria-live="polite">${plural(list.length, t('veille.countOne'), t('veille.countMany'))}</p>
      </div>
      ${list.length ? `<ol class="news">${list.map(newsItem).join('')}</ol>` : `<p class="empty">${t('veille.empty')}</p>`}
    </section>`;
}

export function bindVeille() {
  $('#veille-provider')?.addEventListener('change', (e) => {
    filters.provider = e.target.value;
    rerender();
  });
}
