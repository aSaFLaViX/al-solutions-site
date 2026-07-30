/* Computer Vision demo engine: a receiving-dock camera frame is analyzed,
   objects are detected with confidence, one finding is checked against the
   warehouse safety policy, and anything under the threshold goes to a person.

   The "camera frames" are drawn as flat vector scenes, never photographs:
   the brand rules forbid stock photos, fake photos and fake people, and a
   drawn scene also makes the bounding-box geometry exact rather than eyeballed.
   Scene geometry lives here so both locales stay pixel-identical; only the
   labels come from window.DEMO. */
(function () {
  'use strict';
  const C = window.DemoCore, D = window.DEMO, S = D.strings;
  const $ = C.$, el = C.el;

  const W = 480, H = 300;
  let current = 0, running = false;

  /* ---- Scene primitives ---- */

  function pallet(x, y, w) {
    return `<g class="sc-pallet">
      <rect x="${x}" y="${y}" width="${w}" height="7" rx="1"/>
      <rect x="${x + 3}" y="${y + 7}" width="9" height="9"/>
      <rect x="${x + w / 2 - 4.5}" y="${y + 7}" width="9" height="9"/>
      <rect x="${x + w - 12}" y="${y + 7}" width="9" height="9"/>
    </g>`;
  }

  /* One carton. `damage` notches a torn corner, `label` draws a shipping tag. */
  function carton(x, y, w, h, opts) {
    const o = opts || {};
    const body = o.damage
      ? `<path d="M${x},${y + h} L${x},${y + 6} L${x + 9},${y} L${x + w},${y} L${x + w},${y + h} Z"/>
         <path class="sc-tear" d="M${x},${y + 6} L${x + 9},${y} M${x + 4},${y + h} L${x + 13},${y + 11}"/>`
      : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5"/>`;
    const tape = `<path class="sc-tape" d="M${x + w / 2},${y} L${x + w / 2},${y + h}"/>`;
    const tag = o.label
      ? `<g class="sc-tag"><rect x="${x + w / 2 - 17}" y="${y + h / 2 - 8}" width="34" height="17" rx="1.5"/>
         ${[0, 3, 5, 9, 11, 16, 20, 23, 27, 30].map(i =>
            `<line x1="${x + w / 2 - 14 + i}" y1="${y + h / 2 - 4}" x2="${x + w / 2 - 14 + i}" y2="${y + h / 2 + 5}"/>`).join('')}</g>`
      : '';
    return `<g class="sc-carton">${body}${tape}</g>${tag}`;
  }

  function stack(x, baseY, w, layers, opts) {
    const o = opts || {};
    let out = pallet(x - 4, baseY, w + 8);
    const ch = 26;
    for (let i = 0; i < layers; i++) {
      const y = baseY - (i + 1) * (ch + 2);
      out += carton(x, y, w, ch, {
        damage: o.damageAt === i,
        label: o.labelAt === i,
      });
    }
    return out;
  }

  /* ---- The four camera frames ---- */

  const SCENES = {
    clean: () => stack(96, 250, 92, 3, { labelAt: 0 }) + stack(268, 250, 92, 3, {}),
    damaged: () => stack(96, 250, 92, 3, { labelAt: 0 }) + stack(268, 250, 92, 3, { damageAt: 1 }),
    tall: () => stack(96, 250, 92, 5, { labelAt: 0 }) + stack(268, 250, 92, 2, {}),
    dim: () => stack(96, 250, 92, 3, { labelAt: 0 }) + stack(268, 250, 92, 3, {}),
  };

  function renderFrame(doc) {
    const wrap = el('div', 'cam' + (doc.dim ? ' cam-dim' : ''));
    wrap.setAttribute('dir', 'ltr');
    wrap.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${doc.alt}">
        <rect class="sc-bg" x="0" y="0" width="${W}" height="${H}"/>
        <path class="sc-floor" d="M0,258 L${W},258"/>
        <path class="sc-wall" d="M0,258 L96,150 M${W},258 L384,150 M0,150 L${W},150"/>
        ${SCENES[doc.scene]()}
        ${doc.dim ? `<rect class="sc-shadow" x="248" y="150" width="140" height="108"/>` : ''}
        <g class="boxes"></g>
      </svg>
      <span class="cam-id">${doc.cam}</span>
      <span class="cam-time">${doc.time}</span>`;
    return wrap;
  }

  /* ---- UI skeleton ---- */

  function build() {
    const root = $('#app-root');
    root.innerHTML = `
      <div class="doc-picker">
        <p class="picker-label">${S.pick}</p>
        <div class="chips" id="frame-chips" role="group" aria-label="${S.pick}"></div>
      </div>
      <div class="two-col mt-16">
        <div><div class="panel cam-panel"><div id="cam-slot"></div></div></div>
        <div class="extract-side">
          <div class="panel">
            <h4>${S.pipeline}</h4>
            <div class="pipe" id="pipe"></div>
          </div>
          <div class="panel mt-12">
            <div class="fields-head">
              <h4>${S.detections}</h4>
              <span class="pill pill-grey" id="det-count"></span>
            </div>
            <div id="dets"></div>
            <div id="review-slot"></div>
            <div id="result-slot"></div>
          </div>
        </div>
      </div>
      <div class="run-row">
        <button class="btn btn-primary" id="run-btn">${S.run}</button>
        <button class="btn btn-secondary btn-small hidden" id="reset-btn">${S.again}</button>
      </div>`;

    const chips = $('#frame-chips');
    D.frames.forEach((f, i) => {
      const b = el('button', 'chip', f.chip);
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
    current = i;
    C.$$('#frame-chips .chip').forEach((c, j) => {
      c.setAttribute('aria-pressed', String(j === i));
      c.classList.toggle('active', j === i);
    });
    const slot = $('#cam-slot');
    slot.innerHTML = '';
    slot.appendChild(renderFrame(D.frames[i]));
    $('#pipe').innerHTML = S.steps.map(s => `<div class="pipe-step"><span class="ind"></span>${s}</div>`).join('');
    $('#dets').innerHTML = `<p class="fields-empty">${S.detsEmpty}</p>`;
    $('#det-count').textContent = '';
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
    const f = D.frames[current];
    $('#run-btn').disabled = true;
    C.announce(S.processing);

    const steps = C.$$('#pipe .pipe-step');
    for (let i = 0; i < 2; i++) {
      steps[i].classList.add('run');
      await C.sleep(i === 1 ? 900 : 600);
      steps[i].classList.remove('run');
      steps[i].classList.add('done');
    }

    /* Detection: each box is drawn on the frame as its row lands in the list */
    steps[2].classList.add('run');
    $('#dets').innerHTML = '';
    const boxes = $('#cam-slot .boxes');
    let flagged = null;
    for (const d of f.detections) {
      const low = d.conf < D.threshold;
      const kind = low ? 'warn' : (d.kind || 'ok');
      /* Frame-level findings ("no damage anywhere") carry no box: a rectangle
         around the whole picture localizes nothing, and its caption collided
         with the captions of the real objects underneath it. */
      if (d.b) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'bbox bbox-' + kind);
        g.innerHTML = `<rect x="${d.b[0]}" y="${d.b[1]}" width="${d.b[2]}" height="${d.b[3]}" rx="2"/>
          <text x="${d.b[0] + 3}" y="${d.b[1] - 5}">${d.short} ${d.conf}%</text>`;
        boxes.appendChild(g);
        requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add('on')));
      }

      const row = el('div', 'f-row' + (low ? ' low' : ''));
      row.innerHTML = `
        <span class="f-label">${d.label}</span>
        <span class="f-val ${d.kind === 'bad' ? 'f-missing' : ''}">${d.value}</span>
        <span class="f-conf"><span class="meter ${low ? 'warn' : ''}"><i></i></span><span class="f-pct pnum">${d.conf}%</span></span>`;
      $('#dets').appendChild(row);
      C.reveal(row);
      await C.sleep(60);
      row.querySelector('.meter i').style.width = d.conf + '%';
      $('#det-count').textContent = S.count(C.$$('#dets .f-row').length, f.detections.length);
      await C.sleep(300);
      if (low && !flagged) flagged = d;
    }
    steps[2].classList.remove('run');
    steps[2].classList.add('done');

    /* Cross-check against the written safety policy */
    steps[3].classList.add('run');
    await C.sleep(850);
    steps[3].classList.remove('run');
    steps[3].classList.add('done');

    if (f.review) await reviewFlow(f);
    else finish(f, f.verdict);
    running = false;
  }

  async function reviewFlow(f) {
    C.announce(S.reviewNeeded);
    const box = el('div', 'review-box');
    box.innerHTML = `
      <div class="review-head"><span class="pill pill-amber">${S.reviewPill}</span><strong>${S.reviewTitle}</strong></div>
      <p class="review-why">${f.review.why}</p>
      <div class="review-choices"></div>`;
    $('#review-slot').appendChild(box);
    C.reveal(box);
    const choices = box.querySelector('.review-choices');
    await new Promise(resolve => {
      f.review.choices.forEach((c, i) => {
        const b = el('button', 'chip', c);
        b.type = 'button';
        b.addEventListener('click', async () => {
          C.$$('.review-choices .chip').forEach(x => { x.disabled = true; });
          b.classList.add('active');
          const rows = C.$$('#dets .f-row');
          const target = rows[f.review.row];
          target.classList.remove('low');
          target.querySelector('.f-val').textContent = c;
          target.querySelector('.meter').classList.remove('warn');
          target.querySelector('.meter i').style.width = '100%';
          target.querySelector('.f-pct').textContent = S.manual;
          C.$$('#cam-slot .bbox-warn').forEach(x => {
            x.classList.remove('bbox-warn');
            x.classList.add(i === f.review.correct ? 'bbox-ok' : 'bbox-bad');
          });
          await C.sleep(350);
          box.remove();
          finish(f, i === f.review.correct ? f.review.verdictOk : f.review.verdictNo);
          resolve();
        });
        choices.appendChild(b);
      });
    });
  }

  function finish(f, mode) {
    const v = D.verdicts[mode];
    const box = el('div', 'result-box');
    box.innerHTML = `
      <div class="result-line"><span class="pill ${v.pill}">${v.label}</span><span>${v.body}</span></div>
      ${v.cta ? `<button class="btn btn-secondary btn-small" id="vision-cta">${v.cta}</button>` : ''}
      ${v.note ? `<span class="result-note">${v.note}</span>` : ''}`;
    $('#result-slot').appendChild(box);
    C.reveal(box);
    C.announce(v.label + '. ' + v.body);
    const cta = $('#vision-cta');
    if (cta) {
      cta.addEventListener('click', e => {
        e.target.disabled = true;
        const t = el('span', 'toast', v.ctaDone);
        e.target.after(t);
        C.reveal(t);
        C.announce(v.ctaDone);
      });
    }
    $('#run-btn').classList.add('hidden');
    $('#reset-btn').classList.remove('hidden');
  }

  window.addEventListener('DOMContentLoaded', build);
})();
