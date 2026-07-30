/* AL Solutions demo suite: shared runtime.
   Each demo page defines window.DEMO = { lang, strings, ...cannedData }
   and loads its engine after this file. */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ?fast=1 skips every timer: instant runs for rehearsal and automated checks */
  const fast = new URLSearchParams(location.search).get('fast') === '1';
  const instant = reduced || fast;

  const core = {
    reduced: instant,
    $: (sel, root) => (root || document).querySelector(sel),
    $$: (sel, root) => Array.from((root || document).querySelectorAll(sel)),

    sleep(ms) {
      if (instant) return Promise.resolve();
      return new Promise(r => setTimeout(r, ms));
    },

    el(tag, cls, html) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (html !== undefined) n.innerHTML = html;
      return n;
    },

    /* Types text into a node. Instant under reduced motion. */
    async type(node, text, cps) {
      const set = v => { if ('value' in node && node.tagName !== 'DIV') node.value = v; else node.textContent = v; };
      if (instant) { set(text); return; }
      const delay = 1000 / (cps || 38);
      node.classList.add('caret');
      let acc = '';
      set(acc);
      for (const ch of text) {
        acc += ch;
        set(acc);
        await core.sleep(delay * (0.7 + Math.random() * 0.6));
      }
      node.classList.remove('caret');
    },

    /* Streams HTML into a node word-by-word (LLM-answer feel), keeping markup. */
    async stream(node, html, wps) {
      if (instant) { node.innerHTML = html; return; }
      const tmp = core.el('div', '', html);
      node.innerHTML = '';
      const walk = async (src, dst) => {
        for (const child of Array.from(src.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            const words = child.textContent.split(/(\s+)/);
            const t = document.createTextNode('');
            dst.appendChild(t);
            for (const w of words) {
              t.textContent += w;
              if (w.trim()) await core.sleep(1000 / (wps || 16));
            }
          } else {
            const clone = child.cloneNode(false);
            dst.appendChild(clone);
            await walk(child, clone);
          }
        }
      };
      await walk(tmp, node);
    },

    reveal(node) {
      node.classList.add('reveal');
      requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add('show')));
    },

    async count(node, to, opts) {
      const o = opts || {};
      const dur = instant ? 0 : (o.dur || 700);
      const dec = o.dec || 0;
      const fmt = v => (o.prefix || '') + v.toLocaleString(o.locale || 'en-US', {
        minimumFractionDigits: dec, maximumFractionDigits: dec
      }) + (o.suffix || '');
      if (!dur) { node.textContent = fmt(to); return; }
      const t0 = performance.now();
      return new Promise(res => {
        const tick = now => {
          const p = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          node.textContent = fmt(+(to * eased).toFixed(dec));
          if (p < 1) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
    },

    /* Live region announcements for screen readers */
    announce(text) {
      let r = core.$('#sr-live');
      if (!r) {
        r = core.el('div', 'vh');
        r.id = 'sr-live';
        r.setAttribute('aria-live', 'polite');
        document.body.appendChild(r);
      }
      r.textContent = '';
      setTimeout(() => { r.textContent = text; }, 60);
    }
  };

  /* ---- Video recording mode (?rec=1) ---- */
  const params = new URLSearchParams(location.search);
  const rec = params.get('rec') === '1';
  if (rec) {
    document.documentElement.classList.add('rec-pending');
    window.addEventListener('DOMContentLoaded', () => {
      document.body.classList.add('rec');
      const bar = core.el('div', 'caption-bar');
      bar.setAttribute('aria-hidden', 'true');
      bar.appendChild(core.el('span', 'cap'));
      document.body.appendChild(bar);
      const wm = core.el('span', 'rec-brand');
      wm.innerHTML = '<img src="/assets/img/logo-icon-on-dark.svg" alt="" width="122" height="100"><span>Solutions</span>';
      document.body.appendChild(wm);
    });
  }

  /* Caption API used by Playwright scripts: window.caption('text') */
  window.caption = async function (text) {
    const cap = core.$('.caption-bar .cap');
    if (!cap) return;
    cap.classList.remove('show');
    await core.sleep(220);
    if (text) {
      cap.textContent = text;
      cap.classList.add('show');
    }
  };

  window.DemoCore = core;
  window.__recMode = rec;
})();
