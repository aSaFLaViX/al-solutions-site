/* RAG Assistant demo engine. Locale-agnostic; window.DEMO supplies strings,
   the corpus and canned Q&A pairs (with citations or guardrail refusals). */
(function () {
  'use strict';
  const C = window.DemoCore, D = window.DEMO, S = D.strings;
  const $ = C.$, el = C.el;
  let busy = false, asked = new Set();

  function build() {
    const root = $('#app-root');
    root.innerHTML = `
      <div class="rag-layout two-col">
        <div class="panel rag-chat">
          <h4>${S.chatTitle}</h4>
          <div class="chat-log" id="chat"></div>
          <div class="chat-input">
            <input type="text" id="q-input" disabled placeholder="${S.inputPlaceholder}" aria-label="${S.inputLabel}">
            <button class="btn btn-primary btn-small" id="send-btn" disabled>${S.send}</button>
          </div>
        </div>
        <div class="rag-side">
         <div class="rag-sticky">
          <div class="panel">
            <h4>${S.corpusTitle}</h4>
            <ul class="corpus" id="corpus"></ul>
            <p class="corpus-meta">${S.corpusMeta}</p>
          </div>
          <div class="panel mt-12 hidden" id="ret-panel">
            <h4>${S.retrievedTitle}</h4>
            <div id="ret-list" class="ret-list"></div>
          </div>
         </div>
        </div>
      </div>
      <div class="ask-block">
        <p class="picker-label">${S.pickQ}</p>
        <div class="chips" id="q-chips"></div>
      </div>`;

    const corpus = $('#corpus');
    D.sources.forEach(src => {
      const li = el('li', '', `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
        <span>${src.title}</span><span class="c-pages">${src.meta}</span>`);
      corpus.appendChild(li);
    });

    const chips = $('#q-chips');
    D.qa.forEach((qa, i) => {
      const b = el('button', 'chip', qa.q);
      b.type = 'button';
      b.addEventListener('click', () => ask(i, b));
      chips.appendChild(b);
    });

    const hello = el('div', 'msg msg-ai');
    hello.innerHTML = `<div class="msg-head">${aiHead()}</div>${S.hello}`;
    $('#chat').appendChild(hello);
  }

  function aiHead() {
    return `<svg width="14" height="14" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="square" aria-hidden="true"><path d="M12,32 L12,12 L32,12"/><path d="M68,12 L88,12 L88,32"/><path d="M88,68 L88,88 L68,88"/><path d="M32,88 L12,88 L12,68"/><circle cx="50" cy="50" r="14" fill="currentColor" stroke="none"/></svg>${S.aiName}`;
  }

  async function ask(i, chipBtn) {
    if (busy) return;
    busy = true;
    const qa = D.qa[i];
    chipBtn.disabled = true;
    asked.add(i);
    const chat = $('#chat');

    /* Simulate the question being typed into the input, then sent */
    const input = $('#q-input');
    const ph = input.placeholder;
    await C.type(input, qa.q, 55);
    await C.sleep(250);
    input.value = ''; input.placeholder = ph;

    const um = el('div', 'msg msg-user', qa.q);
    chat.appendChild(um); C.reveal(um);
    scroll();

    const am = el('div', 'msg msg-ai');
    am.innerHTML = `<div class="msg-head">${aiHead()}</div><span class="thinking" role="img" aria-label="${S.searching}"><i></i><i></i><i></i></span> <span class="search-note">${S.searching}</span>`;
    chat.appendChild(am); C.reveal(am);
    scroll();
    await C.sleep(1400);

    /* Retrieved passages appear in the side panel. When nothing clears the
       relevance threshold we SHOW that, rather than hiding the panel: "we looked
       and found nothing" is the whole point of the guardrail question. */
    const retPanel = $('#ret-panel'), retList = $('#ret-list');
    retList.innerHTML = '';
    retPanel.classList.remove('hidden');
    /* Focusable only once populated, same reasoning as the triage feed. */
    retList.tabIndex = 0;
    retList.setAttribute('role', 'region');
    retList.setAttribute('aria-label', S.retrievedTitle);
    if (qa.cites.length) {
      qa.cites.forEach((c, j) => {
        const card = el('div', 'src-quote');
        card.id = 'ret-' + j;
        card.innerHTML = `<span class="src-name">[${j + 1}] ${c.doc}, ${c.section}</span>${c.quote}`;
        retList.appendChild(card);
        C.reveal(card);
      });
    } else {
      const none = el('div', 'ret-none', `<strong>${S.noneTitle}</strong>${S.noneBody}`);
      retList.appendChild(none);
      C.reveal(none);
    }
    await C.sleep(600);

    /* Stream the answer */
    const body = el('div');
    am.querySelector('.thinking').remove();
    am.querySelector('.search-note').remove();
    am.appendChild(body);
    await C.stream(body, qa.a, 15);

    if (qa.guard) {
      const g = el('div', 'guard-box');
      g.innerHTML = `
        <div class="review-head"><span class="pill pill-amber">${S.guardPill}</span><strong>${S.guardTitle}</strong></div>
        <p class="review-why">${qa.guardWhy}</p>
        <button class="btn btn-secondary btn-small" type="button">${qa.guardCta}</button>`;
      am.appendChild(g); C.reveal(g);
      g.querySelector('button').addEventListener('click', e => {
        e.target.disabled = true;
        const t = el('span', 'toast', qa.guardDone);
        e.target.after(t); C.reveal(t);
        C.announce(qa.guardDone);
      });
    } else {
      const meta = el('div', 'ans-meta', S.meta(qa.cites.length));
      am.appendChild(meta);
      /* Wire citation buttons to their retrieved passage */
      C.$$('.cite', am).forEach(cb => {
        cb.addEventListener('click', () => {
          const j = +cb.dataset.c;
          C.$$('.src-quote', retList).forEach(x => x.classList.remove('cite-hl'));
          const target = $('#ret-' + j);
          if (target) {
            target.classList.add('cite-hl');
            target.scrollIntoView({ behavior: C.reduced ? 'auto' : 'smooth', block: 'nearest' });
          }
        });
      });
    }
    scroll();
    C.announce(S.answered);
    busy = false;
    if (asked.size === D.qa.length) {
      const done = el('div', 'msg msg-ai');
      done.innerHTML = `<div class="msg-head">${aiHead()}</div>${S.allDone}`;
      chat.appendChild(done); C.reveal(done);
      scroll();
    }
  }

  function scroll() {
    const chat = $('#chat');
    chat.scrollTop = chat.scrollHeight;
  }

  window.addEventListener('DOMContentLoaded', build);
})();
