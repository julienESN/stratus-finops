// Langue de l'interface : français par défaut, anglais avec ?lang=en ou le sélecteur FR/EN (retenu dans ce navigateur).
// Les chaînes courtes sont dans dist/strings/*.js (une table {fr, en} par zone) ; les textes longs sont des objets {fr, en}.

import { STRINGS as APP } from './strings/app.js';
import { STRINGS as UI } from './strings/ui.js';
import { STRINGS as DATA } from './strings/data.js';
import { STRINGS as DEMO } from './strings/demo.js';
import { STRINGS as SITUATIONS } from './strings/situations.js';
import { STRINGS as LAB } from './strings/lab.js';
import { STRINGS as REFERENCE } from './strings/reference.js';

export const LANGS = ['fr', 'en'];
export const DEFAULT_LANG = 'fr';
const STORAGE_KEY = 'stratus-lang';

const TABLES = [APP, UI, DATA, DEMO, SITUATIONS, LAB, REFERENCE];
export const MESSAGES = Object.fromEntries(LANGS.map((code) => [code, Object.assign({}, ...TABLES.map((table) => table[code]))]));

const asLang = (value) => (LANGS.includes(value) ? value : null);

// Ordre de priorité : paramètre d'URL, puis choix mémorisé, puis français.
export function resolveLang({ search = '', stored = null } = {}) {
  return asLang(new URLSearchParams(search).get('lang')) || asLang(stored) || DEFAULT_LANG;
}

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

let current = typeof location === 'undefined' ? DEFAULT_LANG : resolveLang({ search: location.search, stored: readStored() });

export const lang = () => current;
export const locale = () => (current === 'en' ? 'en-US' : 'fr-FR');

// Texte bilingue {fr, en} vers la langue courante.
export const pick = (text) => (text && typeof text === 'object' ? text[current] ?? text.fr : text);

// Chaîne d'interface : `t('clé')` ou `t('clé', { n: 3 })` pour remplacer {n}. Une clé absente renvoie la clé elle-même.
export function t(key, vars = {}) {
  const template = MESSAGES[current][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
}

// Libellé d'une valeur de données (équipe, environnement, projet) : `dataLabel('team', 'Partagé')`.
// La valeur d'origine est gardée dans les données et les requêtes ; seule l'affichage change.
export function dataLabel(kind, value) {
  return MESSAGES[current][`${kind}.${value}`] ?? value;
}

// Change la langue, la retient et la reflète dans l'URL (?lang=…). Le rendu est à la charge de l'appelant.
export function setLang(code) {
  if (!asLang(code) || code === current) return false;
  current = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch { /* stockage indisponible : le choix vaut pour cette page */ }
  document.documentElement.lang = code;
  const url = new URL(location.href);
  url.searchParams.set('lang', code);
  history.replaceState(history.state, '', url);
  return true;
}
