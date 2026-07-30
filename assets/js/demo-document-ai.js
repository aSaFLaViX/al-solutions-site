/* Document AI demo engine. Locale-agnostic: all text and canned data come
   from window.DEMO defined inline in each locale page. */
(function () {
  'use strict';
  const C = window.DemoCore, D = window.DEMO, S = D.strings;
  const $ = C.$, el = C.el;

  let current = 0, running = false, done = false;

  const money = v => v.toLocaleString(D.numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /* Hebrew convention puts the shekel after the number ("1,562.00 ₪");
     English puts the dollar before it. D.curAfter selects per locale. */
  const cash = v => D.curAfter ? money(v) + ' ' + D.cur : D.cur + money(v);

  function totals(doc) {
    const sub = doc.items.reduce((a, it) => a + it.qty * it.price, 0);
    const vat = sub * doc.vatRate;
    return { sub, vat, total: sub + vat };
  }

  /* ---- Synthetic paper rendering ---- */
  function renderPaper(doc) {
    const t = totals(doc);
    const wrap = el('div', 'paper' + (doc.messy ? ' messy' : ''));
    wrap.setAttribute('dir', D.dir);
    const rows = doc.items.map(it =>
      `<tr><td>${it.name}</td><td class="pnum">${it.qty}</td><td class="pnum">${money(it.price)}</td><td class="pnum">${money(it.qty * it.price)}</td></tr>`
    ).join('');
    const amounts = doc.type === 'invoice' ? `
      <div class="ptotals">
        <div><span>${S.subtotal}</span><span class="pnum" data-f="subtotal">${money(t.sub)}</span></div>
        <div><span>${S.vat} ${Math.round(doc.vatRate * 100)}%</span><span class="pnum" data-f="vat">${money(t.vat)}</span></div>
        <div class="grand${doc.blurTotal ? ' blurred' : ''}"><span>${S.total}</span><span class="pnum" data-f="total">${cash(t.total)}</span></div>
      </div>` : `
      <div class="ptotals"><div class="grand"><span>${S.totalUnits}</span><span class="pnum" data-f="units">${doc.items.reduce((a, i) => a + i.qty, 0)}</span></div></div>`;
    wrap.innerHTML = `
      <div class="phead">
        <div>
          <strong class="psup" data-f="supplier">${doc.supplier}</strong>
          <span class="psub">${doc.supplierSub}</span>
        </div>
        <div class="pmeta">
          <span class="ptype">${doc.typeLabel}</span>
          <span data-f="docNo" class="pnum">${doc.docNo}</span>
          <span>${S.date}: <span data-f="date" class="pnum">${doc.date}</span></span>
          <span>${S.po}: <span data-f="po" class="pnum">${doc.po || S.poMissingPaper}</span></span>
        </div>
      </div>
      <table class="pitems"><thead><tr><th>${S.item}</th><th>${S.qty}</th><th>${S.unitPrice}</th><th>${S.lineTotal}</th></tr></thead><tbody>${rows}</tbody></table>
      ${amounts}
      <div class="pfoot">${doc.footer}</div>`;
    return wrap;
  }

  /* ---- Extraction plan per doc ---- */
  function fieldsFor(doc) {
    const t = totals(doc);
    const f = [
      { k: 'supplier', label: S.fSupplier, value: doc.supplier, conf: doc.conf.supplier },
      { k: 'docNo', label: S.fDocNo, value: doc.docNo, conf: doc.conf.docNo, num: true },
      { k: 'date', label: S.fDate, value: doc.date, conf: doc.conf.date, num: true },
      { k: 'po', label: S.fPo, value: doc.po || S.missing, conf: doc.po ? doc.conf.po : 34, num: !!doc.po, missing: !doc.po }
    ];
    if (doc.type === 'invoice') {
      f.push({ k: 'subtotal', label: S.fSubtotal, value: cash(t.sub), conf: doc.conf.subtotal, num: true });
      f.push({ k: 'vat', label: S.fVat, value: cash(t.vat), conf: doc.conf.vat, num: true });
      f.push({
        k: 'total', label: S.fTotal, value: cash(t.total), conf: doc.conf.total, num: true,
        review: doc.blurTotal ? { choices: [cash(t.total), cash(doc.wrongTotal)], correct: 0 } : null
      });
    } else {
      f.push({ k: 'units', label: S.fUnits, value: String(doc.items.reduce((a, i) => a + i.qty, 0)), conf: doc.conf.units, num: true });
    }
    return f;
  }

  /* ---- UI skeleton ---- */
  function build() {
    const root = $('#app-root');
    root.innerHTML = `
      <div class="doc-picker">
        <p class="picker-label">${S.pick}</p>
        <div class="chips" id="doc-chips" role="group" aria-label="${S.pick}"></div>
      </div>
      <div class="two-col mt-16">
        <div>
          <div class="panel doc-panel"><div id="paper-slot"></div></div>
        </div>
        <div class="extract-side">
          <div class="panel">
            <h4>${S.pipeline}</h4>
            <div class="pipe" id="pipe"></div>
          </div>
          <div class="panel mt-12">
            <div class="fields-head">
              <h4>${S.fields}</h4>
              <span class="pill pill-grey" id="field-count"></span>
            </div>
            <div id="fields"></div>
            <div id="review-slot"></div>
            <div id="result-slot"></div>
          </div>
        </div>
      </div>
      <div class="run-row">
        <button class="btn btn-primary" id="run-btn">${S.run}</button>
        <button class="btn btn-secondary btn-small hidden" id="reset-btn">${S.again}</button>
      </div>`;

    const chips = $('#doc-chips');
    D.docs.forEach((doc, i) => {
      const b = el('button', 'chip', doc.chip);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(i === current));
      b.addEventListener('click', () => { if (!running) select(i); });
      chips.appendChild(b);
    });
    $('#run-btn').addEventListener('click', run);
    $('#reset-btn').addEventListener('click', () => select(current));
    select(0);
  }

  function select(i) {
    current = i; done = false;
    C.$$('#doc-chips .chip').forEach((c, j) => {
      c.setAttribute('aria-pressed', String(j === i));
      c.classList.toggle('active', j === i);
    });
    const slot = $('#paper-slot');
    slot.innerHTML = '';
    slot.appendChild(renderPaper(D.docs[i]));
    $('#pipe').innerHTML = S.steps.map(s => `<div class="pipe-step"><span class="ind"></span>${s}</div>`).join('');
    $('#fields').innerHTML = `<p class="fields-empty">${S.fieldsEmpty}</p>`;
    $('#field-count').textContent = '';
    $('#review-slot').innerHTML = '';
    $('#result-slot').innerHTML = '';
    $('#run-btn').classList.remove('hidden');
    $('#run-btn').disabled = false;
    $('#reset-btn').classList.add('hidden');
  }

  /* ---- The show ---- */
  async function run() {
    if (running) return;
    running = true;
    const doc = D.docs[current];
    $('#run-btn').disabled = true;
    C.announce(S.processing);

    const steps = C.$$('#pipe .pipe-step');
    for (let i = 0; i < 3; i++) {
      steps[i].classList.add('run');
      await C.sleep(i === 1 ? 950 : 650);
      steps[i].classList.remove('run');
      steps[i].classList.add('done');
    }

    steps[3].classList.add('run');
    $('#fields').innerHTML = '';
    const fields = fieldsFor(doc);
    let flagged = null;
    for (const f of fields) {
      const paperEl = $(`#paper-slot [data-f="${f.k}"]`);
      if (paperEl) { paperEl.classList.add('hl'); }
      const low = f.conf < D.threshold;
      const row = el('div', 'f-row' + (low ? ' low' : ''));
      row.innerHTML = `
        <span class="f-label">${f.label}</span>
        <span class="f-val ${f.num ? 'pnum' : ''} ${f.missing ? 'f-missing' : ''}">${f.value}</span>
        <span class="f-conf"><span class="meter ${low ? 'warn' : ''}"><i></i></span><span class="f-pct pnum">${f.conf}%</span></span>`;
      $('#fields').appendChild(row);
      C.reveal(row);
      await C.sleep(60);
      row.querySelector('.meter i').style.width = f.conf + '%';
      $('#field-count').textContent = S.count(C.$$('.f-row').length, fields.length);
      await C.sleep(260);
      if (paperEl) setTimeout(() => paperEl.classList.remove('hl'), 900);
      if (f.review && !flagged) flagged = f;
      if (f.missing && !flagged) flagged = f;
    }
    steps[3].classList.remove('run');
    steps[3].classList.add('done');

    steps[4].classList.add('run');
    await C.sleep(800);
    steps[4].classList.remove('run');
    steps[4].classList.add('done');

    if (flagged && flagged.review) {
      await reviewFlow(flagged);
    } else {
      finish(doc, flagged ? 'partial' : 'auto');
    }
    running = false;
  }

  async function reviewFlow(f) {
    C.announce(S.reviewNeeded);
    const slot = $('#review-slot');
    const box = el('div', 'review-box');
    box.innerHTML = `
      <div class="review-head">
        <span class="pill pill-amber">${S.reviewPill}</span>
        <strong>${S.reviewTitle}</strong>
      </div>
      <p class="review-why">${S.reviewWhy(f.label, f.conf)}</p>
      <div class="review-choices"></div>`;
    slot.appendChild(box);
    C.reveal(box);
    const choices = box.querySelector('.review-choices');
    await new Promise(resolve => {
      f.review.choices.forEach((c, i) => {
        const b = el('button', 'chip pnum', c);
        b.type = 'button';
        b.addEventListener('click', async () => {
          C.$$('.review-choices .chip').forEach(x => x.disabled = true);
          b.classList.add('active');
          const rows = C.$$('.f-row');
          const totalRow = rows[rows.length - 1];
          totalRow.classList.remove('low');
          totalRow.querySelector('.f-val').textContent = c;
          totalRow.querySelector('.meter').classList.remove('warn');
          totalRow.querySelector('.meter i').style.width = '100%';
          totalRow.querySelector('.f-pct').textContent = S.manual;
          await C.sleep(350);
          box.remove();
          finish(D.docs[current], 'human');
          resolve();
        });
        choices.appendChild(b);
      });
    });
  }

  function finish(doc, mode) {
    done = true;
    const slot = $('#result-slot');
    const cls = { human: 'pill-blue', partial: 'pill-amber', auto: 'pill-green' }[mode];
    const label = { human: S.doneHuman, partial: S.donePartial, auto: S.doneAuto }[mode];
    const box = el('div', 'result-box');
    box.innerHTML = `
      <div class="result-line"><span class="pill ${cls}">${label}</span><span>${S.saved}</span></div>
      <button class="btn btn-secondary btn-small" id="export-btn">${S.export}</button>
      ${mode === 'partial' ? `<span class="result-note">${S.partialNote}</span>` : ''}`;
    slot.appendChild(box);
    C.reveal(box);
    C.announce(S.savedA11y);
    $('#export-btn').addEventListener('click', e => {
      e.target.disabled = true;
      const t = el('span', 'toast', S.exported);
      e.target.after(t);
      C.reveal(t);
    });
    $('#run-btn').classList.add('hidden');
    $('#reset-btn').classList.remove('hidden');
  }

  window.addEventListener('DOMContentLoaded', build);
})();
