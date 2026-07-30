/* Agentic Triage demo engine: alert flood → agent clustering, prioritization,
   root cause → graduated actions (human gate / scheduled+cancel / auto-close). */
(function () {
  'use strict';
  const C = window.DemoCore, D = window.DEMO, S = D.strings;
  const $ = C.$, el = C.el;
  let phase = 0;

  function build() {
    const root = $('#app-root');
    root.innerHTML = `
      <div class="tr-layout two-col">
        <div class="panel">
          <div class="fields-head"><h3>${S.feedTitle}</h3><span class="pill pill-grey" id="feed-pill">${S.feedIdle}</span></div>
          <div class="feed" id="feed" aria-live="off"></div>
          <p class="feed-count" id="feed-count"></p>
        </div>
        <div class="tr-main">
          <div class="panel">
            <h3>${S.agentTitle}</h3>
            <div class="alog" id="alog"><p class="fields-empty" id="alog-empty">${S.agentIdle}</p></div>
          </div>
        </div>
      </div>
      <div id="clusters" class="cluster-wrap"></div>
      <div id="summary-slot"></div>
      <div class="run-row">
        <button class="btn btn-primary" id="flood-btn">${S.floodBtn}</button>
        <button class="btn btn-primary hidden" id="agent-btn">${S.agentBtn}</button>
        <button class="btn btn-secondary btn-small hidden" id="reset-btn">${S.again}</button>
      </div>`;
    $('#flood-btn').addEventListener('click', flood);
    $('#agent-btn').addEventListener('click', runAgent);
    $('#reset-btn').addEventListener('click', () => { build(); });
  }

  async function flood() {
    if (phase !== 0) return;
    phase = 1;
    $('#flood-btn').disabled = true;
    C.announce(S.floodA11y);
    const feed = $('#feed');
    /* Focusable only once it has content: an empty scroll pane is a confusing
       tab stop, and a 0px-tall one reads as a sub-minimum target to auditors. */
    feed.tabIndex = 0;
    feed.setAttribute('role', 'region');
    feed.setAttribute('aria-label', S.feedTitle);
    $('#feed-pill').textContent = S.feedLive;
    $('#feed-pill').className = 'pill pill-red';
    for (let i = 0; i < D.alerts.length; i++) {
      const a = D.alerts[i];
      const item = el('div', 'feed-item');
      item.dataset.cluster = a.c;
      item.innerHTML = `<span class="sev ${a.sev}" aria-hidden="true"></span><span class="ft">${a.t}</span><span class="fsrc">${a.src}</span><span>${a.txt}</span>`;
      feed.appendChild(item);
      requestAnimationFrame(() => requestAnimationFrame(() => item.classList.add('show')));
      feed.scrollTop = feed.scrollHeight;
      $('#feed-count').textContent = S.feedCount(i + 1);
      await C.sleep(170 + Math.random() * 160);
    }
    $('#flood-btn').classList.add('hidden');
    $('#agent-btn').classList.remove('hidden');
    $('#agent-btn').focus({ preventScroll: true });
  }

  async function runAgent() {
    if (phase !== 1) return;
    phase = 2;
    $('#agent-btn').disabled = true;
    C.announce(S.agentA11y);
    const alog = $('#alog');
    $('#alog-empty')?.remove();

    for (const [i, line] of D.agentLog.entries()) {
      const l = el('div', 'line', `<span class="t">${line.t}</span><span>${line.txt}</span>`);
      alog.appendChild(l);
      requestAnimationFrame(() => requestAnimationFrame(() => l.classList.add('show')));
      /* Highlight the feed items of the cluster being analyzed */
      if (line.hl !== undefined) {
        C.$$('#feed .feed-item').forEach(f => {
          f.classList.toggle('grouped', f.dataset.cluster === String(line.hl));
        });
      }
      await C.sleep(i === 0 ? 900 : 1050);
    }
    C.$$('#feed .feed-item').forEach(f => f.classList.remove('grouped'));

    const cwrap = $('#clusters');
    for (const cl of D.clusters) {
      const card = el('div', `cluster-card ${cl.prio.toLowerCase()}`);
      const prioPill = { P1: 'pill-red', P2: 'pill-amber', P3: 'pill-grey' }[cl.prio];
      card.innerHTML = `
        <div class="cl-head">
          <span class="pill ${prioPill}">${cl.prio} · ${cl.prioLabel}</span>
          <strong>${cl.title}</strong>
          <span class="cl-n">${S.nAlerts(cl.n)}</span>
        </div>
        <p class="cl-cause"><span class="lbl">${S.causeLbl}</span>${cl.cause}</p>
        <div class="cl-act"><span class="lbl">${S.actLbl}</span>${cl.action}</div>
        <div class="appr-row"></div>`;
      cwrap.appendChild(card);
      C.reveal(card);
      /* Mark the alerts this cluster absorbed. Uses a class, not inline opacity:
         dimming 11px text to 45% took its contrast down to 2.16:1. */
      C.$$('#feed .feed-item').forEach(f => {
        if (f.dataset.cluster === String(cl.id)) f.classList.add('settled');
      });
      wireActions(card, cl);
      await C.sleep(1200);
    }
  }

  function wireActions(card, cl) {
    const row = card.querySelector('.appr-row');
    if (cl.mode === 'approve') {
      row.innerHTML = `
        <span class="gate-note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>${S.gateNote}</span>
        <button class="btn btn-primary btn-small" data-a="ok">${S.approve}</button>
        <button class="btn btn-secondary btn-small" data-a="no">${S.reject}</button>`;
      row.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        const ok = b.dataset.a === 'ok';
        row.innerHTML = `<span class="pill ${ok ? 'pill-green' : 'pill-grey'}">${ok ? cl.doneOk : cl.doneNo}</span>`;
        addLog(ok ? cl.logOk : cl.logNo);
        C.announce(ok ? cl.doneOk : cl.doneNo);
        maybeSummary(ok);
      }));
    } else if (cl.mode === 'scheduled') {
      row.innerHTML = `
        <span class="pill pill-blue">${cl.schedLabel}</span>
        <button class="btn btn-secondary btn-small">${S.cancel}</button>`;
      row.querySelector('button').addEventListener('click', e => {
        row.innerHTML = `<span class="pill pill-grey">${cl.cancelled}</span>`;
        addLog(cl.logCancel);
      });
    } else {
      row.innerHTML = `<span class="pill pill-green">${cl.autoLabel}</span>`;
    }
  }

  function addLog(txt) {
    const alog = $('#alog');
    const l = el('div', 'line', `<span class="t">${S.nowT}</span><span>${txt}</span>`);
    alog.appendChild(l);
    requestAnimationFrame(() => requestAnimationFrame(() => l.classList.add('show')));
  }

  function maybeSummary(approved) {
    if (phase !== 2) return;
    phase = 3;
    const s = el('div', 'summary-strip');
    s.innerHTML = approved ? S.summaryOk : S.summaryNo;
    $('#summary-slot').appendChild(s);
    C.reveal(s);
    $('#agent-btn').classList.add('hidden');
    $('#reset-btn').classList.remove('hidden');
    C.announce(s.textContent);
  }

  window.addEventListener('DOMContentLoaded', build);
})();
