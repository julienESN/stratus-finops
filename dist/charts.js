// Graphiques SVG : lignes avec réticule au survol et navigation au clavier, barres horizontales.

import { $, esc, money } from './ui.js';
import { sum } from './data.js';

const charts = new Map();

function niceScale(maxValue, count = 5) {
  const raw = maxValue / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw);
  const max = Math.ceil(maxValue / step) * step;
  return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) };
}

// Graphique en lignes SVG avec réticule au survol et navigation au clavier.
export function lineChart(cfg) {
  const W = 720;
  const H = 280;
  const M = { top: 36, right: 16, bottom: 34, left: 56 };
  const [x0, x1] = cfg.xDomain;
  const scale = niceScale(Math.max(1, ...cfg.series.flatMap((s) => s.values)));
  const x = (v) => M.left + (v - x0) / (x1 - x0) * (W - M.left - M.right);
  const y = (v) => H - M.bottom - v / scale.max * (H - M.top - M.bottom);
  const path = (values) => values.map((v, i) => `${i ? 'L' : 'M'}${x(cfg.xs[i]).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  charts.set(cfg.id, { ...cfg, x, y, W });

  const grid = scale.ticks.map((v) => `
    <line class="${v ? 'grid-line' : 'axis-line'}" x1="${M.left}" x2="${W - M.right}" y1="${y(v)}" y2="${y(v)}"/>
    <text x="${M.left - 10}" y="${y(v) + 4}" text-anchor="end">${cfg.axis(v)}</text>`).join('');

  const xLabels = cfg.xTicks.map((t) => {
    const anchor = x(t.value) > W - 40 ? 'end' : x(t.value) < M.left + 20 ? 'start' : 'middle';
    return `<text x="${x(t.value)}" y="${H - 10}" text-anchor="${anchor}">${t.label}</text>`;
  }).join('');

  const annotations = (cfg.annotations || []).map((a) => `
    <line class="annotation annotation-${a.tone}" x1="${x(a.x)}" x2="${x(a.x)}" y1="${M.top - 14}" y2="${H - M.bottom}"/>
    <text class="annotation-label" x="${x(a.x) + (a.align === 'end' ? -8 : 8)}" y="${M.top - 18}" text-anchor="${a.align || 'start'}">${a.label}</text>`).join('');

  const dots = (cfg.dots || []).map((d) => `<circle class="dot dot-${d.key}" r="4.5" cx="${x(d.x)}" cy="${y(d.y)}"/>`).join('');

  return `
    <figure class="chart" data-chart="${cfg.id}">
      <ul class="legend">
        ${cfg.series.map((s) => `<li><span class="key key-line key-${s.key}"></span>${esc(s.label)}</li>`).join('')}
      </ul>
      <div class="chart-plot">
        <svg viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${esc(cfg.label)}. Flèches gauche et droite pour lire les valeurs.">
          ${grid}${xLabels}${annotations}
          ${cfg.series.slice().reverse().map((s) => `<path class="series series-${s.key}" d="${path(s.values)}"/>`).join('')}
          ${dots}
          <g class="crosshair" visibility="hidden">
            <line x1="0" x2="0" y1="${M.top}" y2="${H - M.bottom}"/>
            ${cfg.series.map((s) => `<circle class="dot dot-${s.key}" r="4.5"/>`).join('')}
          </g>
          <rect x="${M.left}" y="0" width="${W - M.left - M.right}" height="${H - M.bottom}" fill="transparent"/>
        </svg>
        <div class="tooltip" hidden></div>
      </div>
    </figure>`;
}

export function bindCharts(root = document) {
  root.querySelectorAll('[data-chart]:not([data-bound])').forEach((figure) => {
    figure.dataset.bound = 'true';
    const cfg = charts.get(figure.dataset.chart);
    const svg = $('svg', figure);
    const crosshair = $('.crosshair', svg);
    const tooltip = $('.tooltip', figure);
    let index = cfg.xs.length - 1;

    const show = (i) => {
      index = Math.max(0, Math.min(cfg.xs.length - 1, i));
      const px = cfg.x(cfg.xs[index]);
      const line = $('line', crosshair);
      line.setAttribute('x1', px);
      line.setAttribute('x2', px);
      crosshair.querySelectorAll('circle').forEach((dot, s) => {
        dot.setAttribute('cx', px);
        dot.setAttribute('cy', cfg.y(cfg.series[s].values[index]));
      });
      crosshair.setAttribute('visibility', 'visible');

      const title = document.createElement('p');
      title.className = 'tooltip-title';
      title.textContent = cfg.title(cfg.xs[index]);
      const lines = cfg.series.map((s) => {
        const row = document.createElement('p');
        row.className = 'tooltip-row';
        const key = document.createElement('span');
        key.className = `key key-line key-${s.key}`;
        const value = document.createElement('strong');
        value.textContent = cfg.value(s.values[index]);
        const name = document.createElement('span');
        name.textContent = s.label;
        row.append(key, value, name);
        return row;
      });
      tooltip.replaceChildren(title, ...lines);
      tooltip.hidden = false;

      const left = px * svg.getBoundingClientRect().width / cfg.W;
      const room = figure.querySelector('.chart-plot').clientWidth;
      tooltip.style.left = `${left + 14 + tooltip.offsetWidth > room ? left - 14 - tooltip.offsetWidth : left + 14}px`;
    };

    const hide = () => {
      crosshair.setAttribute('visibility', 'hidden');
      tooltip.hidden = true;
    };

    const nearest = (clientX) => {
      const rect = svg.getBoundingClientRect();
      const vx = (clientX - rect.left) / rect.width * cfg.W;
      return cfg.xs.reduce((best, v, i) => Math.abs(cfg.x(v) - vx) < Math.abs(cfg.x(cfg.xs[best]) - vx) ? i : best, 0);
    };

    svg.addEventListener('pointermove', (e) => show(nearest(e.clientX)));
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('focus', () => show(index));
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        show(index + (e.key === 'ArrowRight' ? 1 : -1));
      }
      if (e.key === 'Escape') hide();
    });
  });
}

export function serviceBars(input) {
  const byService = {};
  input.forEach((r) => { byService[r.service] = (byService[r.service] || 0) + r.cost; });
  const list = Object.entries(byService).sort((a, b) => b[1] - a[1]);
  if (!list.length) return '<p class="empty">Aucune dépense sur cette période.</p>';
  const total = sum(list, ([, v]) => v);
  const max = list[0][1];
  return `
    <ol class="bars">
      ${list.map(([name, v]) => `
        <li>
          <span class="bar-name">${esc(name)}</span>
          <span class="bar-value">${money(v)}</span>
          <span class="bar-share">${Math.round(v / total * 100)} %</span>
          <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${(v / max * 100).toFixed(2)}%"></span></span>
        </li>`).join('')}
    </ol>`;
}
