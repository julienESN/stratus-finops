// Formatage et primitives d'interface partagés par toutes les vues.

import { FOCUS_COLUMNS } from './focus.js';
import { t, lang, locale } from './i18n.js';

export const $ = (selector, root = document) => root.querySelector(selector);

// Formats selon la langue : « 80 844 € » ou « €80,844 », « 17,8 % » ou « 17.8% ».
export const money = (cents, digits = 0) => new Intl.NumberFormat(locale(), {
  style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits,
}).format(cents / 100);

const decimal = (n) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(n);
export const pct = (n) => (lang() === 'en' ? `${decimal(n)}%` : `${decimal(n)} %`);
export const signedPct = (n) => `${n > 0 ? '+' : ''}${pct(n)}`;
export const kEuros = (cents) => {
  if (!cents) return '0';
  const thousands = decimal(cents / 100000);
  return lang() === 'en' ? `€${thousands}k` : `${thousands} k€`;
};
// Accord simple : « 1 jour », « 3 jours » ; en français, 0 prend le singulier.
export const plural = (n, one, many) => `${n} ${(lang() === 'en' ? n === 1 : n <= 1) ? one : many}`;

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

// Colonnes FOCUS citées dans les textes (toutes versions), pour les afficher en code.
const COLUMN_NAMES = [
  ...FOCUS_COLUMNS.map(([name]) => name),
  'InvoiceId', 'BillingAccountType', 'SubAccountType', 'PricingQuantity', 'PricingUnit', 'ListUnitPrice', 'ContractedUnitPrice',
  'SkuId', 'SkuPriceId', 'SkuMeter', 'SkuPriceDetails', 'CapacityReservationId', 'CapacityReservationStatus', 'CapacityReservation',
  'CommitmentDiscountQuantity', 'CommitmentDiscountUnit', 'CommitmentDiscount', 'PricingCurrency', 'ServiceProviderName', 'HostProviderName',
  'AllocatedMethodId', 'AllocatedMethodDetails', 'AllocatedResourceId', 'AllocatedResourceName', 'AllocatedTags', 'ContractApplied',
  'InvoiceDetailId', 'CommitmentProgramEligibilityDetails',
].sort((a, b) => b.length - a.length);

const COLUMN_PATTERN = new RegExp(`\\b(x_[A-Za-z]+|${COLUMN_NAMES.join('|')})(\\*?)(?![A-Za-z_])`, 'g');

// Échappe un texte et met en forme les noms de colonnes FOCUS.
export const rich = (text) => esc(text).replace(COLUMN_PATTERN, '<code>$1$2</code>');

const ICONS = {
  alert: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4M12 16.8v.2"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.5 2.5 4.9-5.2"/>',
  close: '<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  upload: '<path d="M12 15V4.5M7.5 9 12 4.5 16.5 9M5 15.5v3h14v-3"/>',
  download: '<path d="M12 4.5V15M7.5 10.5 12 15l4.5-4.5M5 15.5v3h14v-3"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4.5 4.5"/>',
};

export const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

export const logo = () => `<svg class="logo" viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="3.5" width="16" height="3" rx="1.5"/><rect x="2" y="8.5" width="11" height="3" rx="1.5"/><rect x="2" y="13.5" width="6" height="3" rx="1.5"/></svg>`;

// Lien vers la fiche d'une capacité dans le référentiel.
export const capabilityLink = (name) => `<a class="link" href="#reference/framework" data-nav="reference/framework">${esc(name)}</a>`;

export function pageHead(title, lede, actions = '', capabilities = []) {
  return `
    <div class="page-head">
      <div>
        <h1>${title}</h1>
        <p class="lede">${lede}</p>
        ${capabilities.length ? `<p class="capabilities">${t('ui.capabilities')} ${capabilities.map(capabilityLink).join(', ')}</p>` : ''}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </div>`;
}

export function selectField(id, label, options, value) {
  return `
    <label class="field">
      <span class="field-label">${label}</span>
      <select id="${id}">
        ${options.map(([v, text]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(text)}</option>`).join('')}
      </select>
    </label>`;
}

export const filterBar = (fields, note = '') => `
  <div class="filter-bar">
    ${fields.join('')}
    ${note ? `<p class="filter-note">${note}</p>` : ''}
  </div>`;

export const term = (label, value, note, modifier = '') => `
  <div class="term ${modifier}">
    <p class="term-label">${label}</p>
    <p class="term-value">${value}</p>
    <p class="term-note">${note}</p>
  </div>`;

export const operator = (symbol, spoken) => `<span class="operator"><span aria-hidden="true">${symbol}</span><span class="sr-only">${spoken}</span></span>`;

export const statusText = (tone, text) => `<span class="status status-${tone}">${icon(tone === 'good' ? 'check' : 'alert')}${text}</span>`;

export const meter = (ratio) => `
  <span class="meter ${ratio > 100 ? 'is-over' : ''}">
    <span class="meter-track" aria-hidden="true"><span class="meter-fill" style="width:${Math.min(100, ratio).toFixed(1)}%"></span></span>
    <span class="meter-value">${pct(Math.round(ratio))}</span>
  </span>`;

let toastTimer;
export function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3500);
}

export function download(name, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(type.startsWith('text/csv') ? ['﻿', text] : [text], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Fiche latérale partagée (projet, recommandation).
export function openSheet(html) {
  const dialog = $('#detail');
  dialog.innerHTML = `<div class="sheet-body">${html}</div>`;
  if (!dialog.open) dialog.showModal();
}

export const sheetHead = (title, subtitle) => `
  <div class="sheet-head">
    <div>
      <h2 id="detail-title">${title}</h2>
      <p class="sheet-sub">${subtitle}</p>
    </div>
    <button class="close" data-close aria-label="${t('ui.close')}">${icon('close')}</button>
  </div>`;
