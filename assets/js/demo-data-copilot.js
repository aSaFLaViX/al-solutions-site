/* Data Copilot demo engine. NL question → generated SQL → animated result
   (bar / line / horizontal bars / table) → grounded answer → follow-up. */
(function () {
  'use strict';
  const C = window.DemoCore, D = window.DEMO, S = D.strings;
  const $ = C.$, el = C.el;
  let busy = false;

  function build() {
    const root = $('#app-root');
    root.innerHTML = `
      <div class="panel schema-strip">
        <div class="fields-head"><h3>${S.schemaTitle}</h3><span class="pill pill-grey">${S.readOnly}</span></div>
        <ul class="schema" id="schema"></ul>
        <p class="corpus-meta">${S.schemaMeta}</p>
      </div>
      <div class="panel dc-main">
        <h3>${S.chatTitle}</h3>
        <div class="dc-log" id="dc-log"></div>
        <div class="chat-input">
          <input type="text" id="q-input" disabled placeholder="${S.inputPlaceholder}" aria-label="${S.inputLabel}">
          <button class="btn btn-primary btn-small" disabled>${S.send}</button>
        </div>
      </div>
      <div class="ask-block">
        <p class="picker-label">${S.pickQ}</p>
        <div class="chips" id="q-chips"></div>
      </div>`;

    const schema = $('#schema');
    D.tables.forEach(t => {
      const li = el('li', '', `
        <span class="tname"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>${t.name}<span class="trows">${t.rows}</span></span>
        <span class="cols">${t.cols}</span>`);
      schema.appendChild(li);
    });

    const chips = $('#q-chips');
    D.qa.forEach((qa, i) => {
      const b = el('button', 'chip', qa.q);
      b.type = 'button';
      b.id = 'qchip-' + i;
      b.addEventListener('click', () => ask(i, b));
      chips.appendChild(b);
    });

    const hello = el('div', 'msg msg-ai');
    hello.innerHTML = `<div class="msg-head">${head()}</div>${S.hello}`;
    $('#dc-log').appendChild(hello);
  }

  function head() {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7"/><path d="M20 8l-3.5 3.5L14 9l-4 4"/></svg>${S.aiName}`;
  }

  async function ask(i, chipBtn) {
    if (busy) return;
    busy = true;
    const qa = D.qa[i];
    chipBtn.disabled = true;
    const log = $('#dc-log');
    const input = $('#q-input');

    await C.type(input, qa.q, 55);
    await C.sleep(250);
    input.value = '';

    const um = el('div', 'msg msg-user', qa.q);
    log.appendChild(um); C.reveal(um); scroll();

    const card = el('div', 'result-card');
    card.innerHTML = `
      <div class="sql-status"><span class="thinking"><i></i><i></i><i></i></span> ${S.writing}</div>
      <div class="sql-label hidden">${S.sqlLabel}</div>
      <pre class="code hidden" aria-label="SQL"></pre>
      <div class="viz-slot"></div>
      <div class="answer-slot"></div>`;
    log.appendChild(card); C.reveal(card); scroll();
    await C.sleep(1100);

    const status = card.querySelector('.sql-status');
    const codeEl = card.querySelector('.code');
    card.querySelector('.sql-label').classList.remove('hidden');
    codeEl.classList.remove('hidden');
    await C.stream(codeEl, qa.sql, 26);
    status.innerHTML = `<span class="thinking"><i></i><i></i><i></i></span> ${S.running}`;
    scroll();
    await C.sleep(1000);
    status.innerHTML = `<span class="pill pill-green">${S.done}</span> <span>${S.rows(qa.rows)}</span>`;

    renderViz(card.querySelector('.viz-slot'), qa);
    scroll();
    await C.sleep(700);

    const ans = el('div', 'answer-line');
    card.querySelector('.answer-slot').appendChild(ans);
    await C.stream(ans, qa.answer, 15);
    const meta = el('div', 'res-meta', S.meta);
    card.querySelector('.answer-slot').appendChild(meta);
    scroll();
    C.announce(S.answered);

    if (qa.followup !== undefined && qa.followup !== null) {
      const f = el('div', 'msg msg-ai');
      f.innerHTML = `<div class="msg-head">${head()}</div>${S.followup} <button class="chip" type="button">${D.qa[qa.followup].q}</button>`;
      log.appendChild(f); C.reveal(f); scroll();
      f.querySelector('.chip').addEventListener('click', () => {
        f.querySelector('.chip').disabled = true;
        ask(qa.followup, $('#qchip-' + qa.followup));
      });
    }
    busy = false;
  }

  /* ---- Visualizations (per dataviz specs: single hue, thin marks,
     rounded data-ends, recessive grid, labels in text tokens) ---- */

  function renderViz(slot, qa) {
    const wrap = el('div', 'chart');
    wrap.setAttribute('dir', 'ltr');
    if (qa.kind === 'bar') wrap.appendChild(bars(qa));
    else if (qa.kind === 'hbar') wrap.appendChild(hbars(qa));
    else if (qa.kind === 'line') wrap.appendChild(line(qa));
    else if (qa.kind === 'table') { wrap.appendChild(table(qa)); wrap.removeAttribute('dir'); }
    slot.appendChild(wrap);
    /* Screen-reader table twin for every graphic chart */
    if (qa.kind !== 'table') {
      const t = el('table', 'vh', `<caption>${qa.title}</caption>` + qa.data.map(d => `<tr><th scope="row">${d.l}</th><td>${d.dv}</td></tr>`).join(''));
      slot.appendChild(t);
    }
  }

  function bars(qa) {
    const max = Math.max(...qa.data.map(d => d.v));
    const box = el('div');
    box.innerHTML = `<div class="chart-title">${qa.title}</div>`;
    const row = el('div', 'cbars');
    row.setAttribute('role', 'img');
    row.setAttribute('aria-label', qa.title);
    qa.data.forEach(d => {
      const b = el('div', 'cbar', `<span class="bval">${d.dv}</span><span class="bfill"></span>`);
      row.appendChild(b);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        b.querySelector('.bfill').style.height = (d.v / max * 82) + '%';
        b.classList.add('on');
      }));
    });
    const labels = el('div', 'cbar-labels', qa.data.map(d => `<span>${d.l}</span>`).join(''));
    box.appendChild(row);
    box.appendChild(labels);
    return box;
  }

  function hbars(qa) {
    const max = Math.max(...qa.data.map(d => d.v));
    const box = el('div');
    box.innerHTML = `<div class="chart-title">${qa.title}</div>`;
    const listEl = el('div', 'hbars');
    listEl.setAttribute('role', 'img');
    listEl.setAttribute('aria-label', qa.title);
    qa.data.forEach(d => {
      const r = el('div', 'hbar', `<span class="hlabel">${d.l}</span><span class="htrack"><span class="hfill"></span><span class="hval">${d.dv}</span></span>`);
      listEl.appendChild(r);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        r.querySelector('.hfill').style.width = (d.v / max * 100) + '%';
        r.classList.add('on');
      }));
    });
    box.appendChild(listEl);
    return box;
  }

  function line(qa) {
    const W = 560, H = 200, P = { t: 30, r: 26, b: 26, l: 26 };
    const vals = qa.data.map(d => d.v);
    const vmax = Math.max(...vals) * 1.12, vmin = Math.min(...vals) * 0.82;
    const x = i => P.l + i * (W - P.l - P.r) / (vals.length - 1);
    const y = v => P.t + (1 - (v - vmin) / (vmax - vmin)) * (H - P.t - P.b);
    const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    const peak = vals.indexOf(Math.max(...vals));
    const labeled = new Set([0, peak, vals.length - 1]);
    const grid = [0.25, 0.5, 0.75].map(f => `<line class="grid-line" x1="${P.l}" x2="${W - P.r}" y1="${P.t + f * (H - P.t - P.b)}" y2="${P.t + f * (H - P.t - P.b)}"/>`).join('');
    /* Anchor edge labels inward so the first and last values are not clipped by
       the viewBox (text-anchor:middle overflowed on both ends). */
    const anchor = i => (i === 0 ? 'start' : i === vals.length - 1 ? 'end' : 'middle');
    const dots = vals.map((v, i) => `
      <circle class="dot" cx="${x(i)}" cy="${y(v)}" r="4"><title>${qa.data[i].l}: ${qa.data[i].dv}</title></circle>
      ${labeled.has(i) ? `<text class="pt-label" x="${x(i)}" y="${y(v) - 11}" text-anchor="${anchor(i)}">${qa.data[i].dv}</text>` : ''}`).join('');
    const ax = qa.data.map((d, i) => `<text class="ax-label" x="${x(i)}" y="${H - 8}" text-anchor="${anchor(i)}">${d.l}</text>`).join('');
    const box = el('div', 'cline');
    box.innerHTML = `<div class="chart-title">${qa.title}</div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${qa.title}">
        ${grid}
        <polyline class="series" points="${pts}"/>
        ${dots}${ax}
      </svg>`;
    const pl = box.querySelector('.series');
    const len = 1600;
    if (!C.reduced) {
      pl.style.strokeDasharray = len;
      pl.style.strokeDashoffset = len;
      pl.style.transition = 'stroke-dashoffset 1.1s ease';
      requestAnimationFrame(() => requestAnimationFrame(() => { pl.style.strokeDashoffset = '0'; }));
    }
    return box;
  }

  function table(qa) {
    const box = el('div');
    box.innerHTML = `<div class="chart-title">${qa.title}</div>`;
    const t = el('table', 'dtable');
    t.innerHTML = `<thead><tr>${qa.cols.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead>`;
    const tb = el('tbody');
    qa.data.forEach(r => {
      const tr = el('tr', '', r.cells.map((c, j) => `<td class="${j > 0 ? 'num' : ''}">${c}</td>`).join(''));
      tb.appendChild(tr);
      C.reveal(tr);
    });
    t.appendChild(tb);
    box.appendChild(t);
    return box;
  }

  /* The conversation no longer scrolls inside itself, so "scroll" means: keep the
     newest card in view on the page, without yanking the viewport around. */
  function scroll() {
    const cards = C.$$('#dc-log > *');
    const last = cards[cards.length - 1];
    if (!last) return;
    const r = last.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 20 || r.top < 0) {
      last.scrollIntoView({ behavior: C.reduced ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  window.addEventListener('DOMContentLoaded', build);
})();
