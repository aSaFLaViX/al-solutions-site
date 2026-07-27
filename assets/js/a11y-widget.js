/* AL Solutions accessibility widget (תפריט נגישות).
   Self-hosted vanilla JS. No library, no CDN, no network request, no cookie.
   Preferences live in localStorage under one key and carry no identifier.

   Two deliberate structural choices:
   1. The panel is built inside a shadow root, so the page-mode overrides in
      a11y-widget.css can use * without ever reaching the panel's own styling.
   2. The host is inserted right after the skip link, so the skip link stays the first
      Tab stop and the widget is the second. Keyboard-only visitors are the people this
      widget exists for; burying it behind every link on the page defeats the purpose.
      No positive tabindex is used anywhere.

   Text scaling writes absolute inline font sizes derived from each element's ORIGINAL
   computed size (cached in data-a11y-fs). The site's stylesheet is px-based, so scaling
   the root font size would do nothing, and recomputing from the current size would
   compound on every click. */
(function () {
  'use strict';

  var HOST_ID = 'a11y-widget';
  var STORE_KEY = 'al-a11y-prefs';
  var SCALES = [0.9, 1, 1.15, 1.3, 1.5];
  var LOGO_DARK = '/assets/img/logo-icon-on-dark.svg';
  var LOGO_LIGHT = '/assets/img/logo-icon-on-light.svg';
  var READ_SEL = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, figcaption, td, th, dt, dd';

  var isEn = (document.documentElement.lang || 'he').toLowerCase().indexOf('en') === 0;
  var L = isEn ? 'en' : 'he';

  var T = {
    he: {
      open: 'פתיחת תפריט נגישות', close: 'סגירת תפריט הנגישות', title: 'נגישות',
      gText: 'טקסט', gColor: 'צבעים', gNav: 'הדגשה וניווט', gRead: 'הקראה',
      bigger: 'הגדלת טקסט', smaller: 'הקטנת טקסט', fontSize: 'גודל טקסט',
      readable: 'גופן קריא', hcDark: 'ניגודיות כהה', hcLight: 'ניגודיות בהירה',
      invert: 'ניגודיות הפוכה', gray: 'גווני אפור', colorHint: 'אפשר לבחור מצב צבע אחד',
      links: 'הדגשת קישורים', focus: 'הדגשת מיקוד', cursor: 'סמן גדול',
      motion: 'עצירת אנימציות', speak: 'הקראת טקסט',
      speakHint: 'לחצו על פסקה כדי להקריא אותה. Esc עוצר.',
      reset: 'איפוס הגדרות', statement: 'הצהרת נגישות', contact: 'פנייה בנושא נגישות',
      noVoice: 'בדפדפן הזה אין קול עברי מותקן, ולכן ההקראה אינה זמינה.',
      speakOn: 'הקראה פעילה. לחצו על פסקה.', speakOff: 'ההקראה כובתה.',
      wasReset: 'כל ההגדרות אופסו.', local: 'ההעדפות נשמרות במחשב שלכם בלבד.'
    },
    en: {
      open: 'Open accessibility menu', close: 'Close accessibility menu', title: 'Accessibility',
      gText: 'Text', gColor: 'Colours', gNav: 'Highlighting and navigation', gRead: 'Read aloud',
      bigger: 'Increase text size', smaller: 'Decrease text size', fontSize: 'Text size',
      readable: 'Readable font', hcDark: 'Dark high contrast', hcLight: 'Light high contrast',
      invert: 'Inverted colours', gray: 'Grayscale', colorHint: 'One colour mode at a time',
      links: 'Highlight links', focus: 'Strong focus outline', cursor: 'Large cursor',
      motion: 'Stop animations', speak: 'Read aloud',
      speakHint: 'Click any paragraph to hear it. Esc stops.',
      reset: 'Reset settings', statement: 'Accessibility statement', contact: 'Contact us about accessibility',
      noVoice: 'This browser has no English voice installed, so read aloud is unavailable.',
      speakOn: 'Read aloud is on. Click a paragraph.', speakOff: 'Read aloud is off.',
      wasReset: 'All settings were reset.', local: 'Preferences are stored on your device only.'
    }
  }[L];

  var STATEMENT_URL = isEn ? '/en/accessibility/' : '/accessibility/';
  var CONTACT_URL = 'mailto:asaflavi@al-solutions.co.il?subject=' +
    encodeURIComponent(isEn ? 'Website accessibility' : 'נגישות האתר');

  var state = {
    scale: 1, color: null, readable: false, links: false,
    focus: false, cursor: false, motion: false, speak: false
  };

  var host, root, panel, fab, live, sizeLabel, readingEl = null, voices = [];

  /* ---------- storage ---------- */
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        if (SCALES.indexOf(s.scale) > -1) state.scale = s.scale;
        if (['hc-dark', 'hc-light', 'invert', 'grayscale'].indexOf(s.color) > -1) state.color = s.color;
        ['readable', 'links', 'focus', 'cursor', 'motion', 'speak'].forEach(function (k) {
          state[k] = s[k] === true;
        });
      }
    } catch (e) {}
  }

  /* ---------- text scaling ---------- */
  function scalable() {
    var out = [];
    var all = document.body.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el === host) continue;
      var tag = (el.tagName || '').toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'br') continue;
      if (el.closest && el.closest('svg')) continue;
      out.push(el);
    }
    return out;
  }
  function applyScale() {
    // Long words only need the break-word safety net while text is actually enlarged.
    document.documentElement.classList.toggle('a11y-scaled', state.scale !== 1);
    var els = scalable();
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var base = el.getAttribute('data-a11y-fs');
      if (base === null) {
        base = parseFloat(getComputedStyle(el).fontSize);
        if (!base) continue;
        el.setAttribute('data-a11y-fs', base);
      }
      el.style.fontSize = state.scale === 1 ? '' : (parseFloat(base) * state.scale).toFixed(2) + 'px';
    }
  }

  /* ---------- page modes ---------- */
  function syncLogos() {
    var wantLight = state.color === 'hc-light' || state.color === 'invert';
    var imgs = document.querySelectorAll('.brand img');
    for (var i = 0; i < imgs.length; i++) {
      var want = wantLight ? LOGO_LIGHT : LOGO_DARK;
      if (imgs[i].getAttribute('src') !== want) imgs[i].setAttribute('src', want);
    }
  }
  function applyModes() {
    var cl = document.documentElement.classList;
    ['a11y-hc-dark', 'a11y-hc-light', 'a11y-invert', 'a11y-grayscale'].forEach(function (c) {
      cl.remove(c);
    });
    if (state.color) cl.add('a11y-' + state.color);
    cl.toggle('a11y-readable-font', state.readable);
    cl.toggle('a11y-links', state.links);
    cl.toggle('a11y-focus', state.focus);
    cl.toggle('a11y-big-cursor', state.cursor);
    cl.toggle('a11y-no-motion', state.motion);
    syncLogos();
  }

  /* ---------- read aloud ---------- */
  function refreshVoices() {
    if (!('speechSynthesis' in window)) return;
    voices = window.speechSynthesis.getVoices() || [];
  }
  // getVoices() returns an empty array on the first call in every browser tested: the
  // list loads asynchronously. Without this wait the feature silently does nothing on
  // a fresh page load.
  function waitForVoices(done) {
    if (!('speechSynthesis' in window)) return done();
    var tries = 0;
    window.speechSynthesis.onvoiceschanged = refreshVoices;
    (function attempt() {
      refreshVoices();
      if (voices.length || tries++ > 12) return done();
      setTimeout(attempt, 250);
    })();
  }
  function pickVoice() {
    var want = isEn ? 'en' : 'he';
    var m = voices.filter(function (v) {
      return (v.lang || '').toLowerCase().indexOf(want) === 0;
    });
    // A local voice keeps the text on the device. Some browsers only offer a network
    // voice, which would send the text to the vendor; prefer local whenever it exists.
    var localFirst = m.filter(function (v) { return v.localService; });
    return localFirst[0] || m[0] || null;
  }
  function stopSpeaking() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (readingEl) { readingEl.classList.remove('a11y-reading'); readingEl = null; }
  }
  function speakEl(el) {
    stopSpeaking();
    var text = (el.innerText || el.textContent || '').trim();
    if (!text) return;
    var v = pickVoice();
    if (!v) { announce(T.noVoice); return; }
    var u = new SpeechSynthesisUtterance(text);
    u.voice = v;
    u.lang = v.lang || (isEn ? 'en-US' : 'he-IL');
    u.onend = u.onerror = function () {
      if (readingEl === el) { el.classList.remove('a11y-reading'); readingEl = null; }
    };
    readingEl = el;
    el.classList.add('a11y-reading');
    window.speechSynthesis.speak(u);
  }
  function onPageClick(e) {
    if (!state.speak) return;
    if (e.target === host || (host && host.contains(e.target))) return;
    if (!e.target.closest) return;
    // Interactive elements keep their normal behaviour: intercepting a link click would
    // make the site unusable in this mode.
    if (e.target.closest('a, button, input, textarea, select, label')) return;
    var el = e.target.closest(READ_SEL);
    if (el) speakEl(el);
  }

  /* ---------- panel plumbing ---------- */
  function announce(msg) { if (live) live.textContent = msg; }

  function setPressed(name, on) {
    var b = root.querySelector('[data-act="' + name + '"]');
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function syncUI() {
    setPressed('readable', state.readable);
    setPressed('links', state.links);
    setPressed('focus', state.focus);
    setPressed('cursor', state.cursor);
    setPressed('motion', state.motion);
    setPressed('speak', state.speak);
    ['hc-dark', 'hc-light', 'invert', 'grayscale'].forEach(function (c) {
      setPressed(c, state.color === c);
    });
    if (sizeLabel) sizeLabel.textContent = Math.round(state.scale * 100) + '%';
  }
  function applyAll() { applyModes(); applyScale(); syncUI(); }

  function toggle(key) {
    state[key] = !state[key];
    if (key === 'speak') {
      if (state.speak) { waitForVoices(function () { announce(pickVoice() ? T.speakOn : T.noVoice); }); }
      else { stopSpeaking(); announce(T.speakOff); }
    }
    applyAll(); save();
  }
  function setColor(mode) {
    state.color = state.color === mode ? null : mode;
    applyAll(); save();
  }
  function step(dir) {
    var i = SCALES.indexOf(state.scale);
    if (i < 0) i = 1;
    i = Math.min(SCALES.length - 1, Math.max(0, i + dir));
    state.scale = SCALES[i];
    applyAll(); save();
    announce(T.fontSize + ': ' + Math.round(state.scale * 100) + '%');
  }
  function resetAll() {
    stopSpeaking();
    state = { scale: 1, color: null, readable: false, links: false, focus: false, cursor: false, motion: false, speak: false };
    applyAll();
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    announce(T.wasReset);
  }
  function openPanel() {
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    panel.focus();
  }
  function closePanel(refocus) {
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    if (refocus !== false) fab.focus();
  }

  /* ---------- markup ---------- */
  var ICON = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="4" r="2.1" fill="currentColor"/>' +
    '<path fill="currentColor" d="M20.4 8.3c-.15-.6-.75-.95-1.35-.8L15 8.4V8h-6v.4L4.95 7.5c-.6-.15-1.2.2-1.35.8-.15.6.2 1.2.8 1.35L9 10.7v2.05L6.6 19.6c-.2.6.1 1.25.7 1.45.6.2 1.25-.1 1.45-.7L12 12.9l3.25 7.45c.2.6.85.9 1.45.7.6-.2.9-.85.7-1.45L15 12.75V10.7l4.6-1.05c.6-.15.95-.75.8-1.35z"/>' +
    '</svg>';
  var CHECK = '<svg class="ck" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
    '<path d="M2 8.6l3.4 3.4L14 3.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function tog(act, label) {
    return '<button type="button" class="row" data-act="' + act + '" aria-pressed="false">' +
      '<span class="lbl">' + label + '</span>' + CHECK + '</button>';
  }

  /* The explicit font, size, colour and direction on :host are the insulation: the host
     inherits from <body>, so without them a page mode or a scaled font size would leak
     into the panel. Do not add `all: revert` here, it wipes the positioning too. */
  var CSS = ':host{position:fixed;bottom:18px;left:18px;z-index:9999;font-family:"Heebo",-apple-system,"Segoe UI",Arial,sans-serif;font-size:16px;font-weight:400;line-height:1.5;letter-spacing:normal;color:#fff;direction:' + (isEn ? 'ltr' : 'rtl') + ';text-align:start}' +
    '*{margin:0;padding:0;box-sizing:border-box;font:inherit;color:inherit}' +
    'button{cursor:pointer;background:none;border:0}' +
    /* 52px square: comfortably over the 44px minimum, white ring guarantees a visible
       boundary on both the white sections and the navy ones. */
    '.fab{width:52px;height:52px;border-radius:50%;background:#2D7FF9;color:#fff;border:2px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center}' +
    '.fab:hover{background:#1F6FE8}' +
    '.fab:focus-visible,.panel button:focus-visible,.panel a:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
    '.panel{position:absolute;bottom:64px;left:0;width:300px;max-width:calc(100vw - 36px);max-height:min(76vh,560px);overflow-y:auto;background:#0B1F3A;border:1px solid #6382AD;border-radius:14px;padding:14px;box-shadow:0 10px 34px rgba(0,0,0,.5)}' +
    '.panel[hidden]{display:none}' +
    '.panel:focus{outline:none}' +
    '.hd{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}' +
    '.hd h2{font-size:18px;font-weight:800}' +
    '.x{width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;margin:-8px -8px -8px 0}' +
    '.x:hover{background:#16324F}' +
    'fieldset{border:0;margin-bottom:12px}' +
    'legend{font-size:13px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#B9CBE4;padding-bottom:6px}' +
    '.hint{font-size:12.5px;color:#B9CBE4;padding:0 2px 6px}' +
    /* 15px text on #16324F measures 11.7:1; the border clears 3:1 as the control boundary. */
    '.row{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:44px;padding:8px 12px;margin-bottom:6px;background:#16324F;border:1px solid #6382AD;border-radius:10px;font-size:15px;text-align:start}' +
    '.row:hover{border-color:#2D7FF9}' +
    /* Active state is never colour alone: the checkmark appears too (WCAG 1.4.1). */
    '.row[aria-pressed="true"]{background:#1D4ED8;border-color:#fff;font-weight:700}' +
    '.row .ck{opacity:0;flex:none}' +
    '.row[aria-pressed="true"] .ck{opacity:1}' +
    '.lbl{flex:1}' +
    '.size{display:flex;align-items:center;gap:8px}' +
    '.size button{flex:none;width:48px;height:44px;background:#16324F;border:1px solid #6382AD;border-radius:10px;font-size:20px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center}' +
    '.size button:hover{border-color:#2D7FF9}' +
    '.size .val{flex:1;text-align:center;font-size:15px;font-weight:700}' +
    '.ft{border-top:1px solid #6382AD;padding-top:10px;display:grid;gap:4px}' +
    '.ft a,.ft button{display:flex;align-items:center;min-height:44px;padding:6px 12px;border-radius:8px;font-size:14.5px;color:#fff;text-decoration:underline}' +
    '.ft a:hover,.ft button:hover{background:#16324F}' +
    '.note{font-size:12px;color:#B9CBE4;padding:6px 12px 0}' +
    '.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}';

  var HTML =
    '<button type="button" class="fab" aria-expanded="false" aria-controls="a11y-panel" aria-label="' + T.open + '">' + ICON + '</button>' +
    '<div class="panel" id="a11y-panel" role="dialog" aria-label="' + T.title + '" tabindex="-1" hidden>' +
      '<div class="hd"><h2>' + T.title + '</h2>' +
        '<button type="button" class="x" data-act="close" aria-label="' + T.close + '">&#10005;</button></div>' +
      '<fieldset><legend>' + T.gText + '</legend>' +
        '<div class="size">' +
          '<button type="button" data-act="smaller" aria-label="' + T.smaller + '">&#8722;</button>' +
          '<span class="val" data-size aria-hidden="true">100%</span>' +
          '<button type="button" data-act="bigger" aria-label="' + T.bigger + '">+</button>' +
        '</div>' +
        '<div class="hint" style="padding-top:6px">' + T.fontSize + '</div>' +
        tog('readable', T.readable) +
      '</fieldset>' +
      '<fieldset><legend>' + T.gColor + '</legend>' +
        '<div class="hint">' + T.colorHint + '</div>' +
        tog('hc-dark', T.hcDark) + tog('hc-light', T.hcLight) +
        tog('invert', T.invert) + tog('grayscale', T.gray) +
      '</fieldset>' +
      '<fieldset><legend>' + T.gNav + '</legend>' +
        tog('links', T.links) + tog('focus', T.focus) +
        tog('cursor', T.cursor) + tog('motion', T.motion) +
      '</fieldset>' +
      '<fieldset><legend>' + T.gRead + '</legend>' +
        tog('speak', T.speak) +
        '<div class="hint">' + T.speakHint + '</div>' +
      '</fieldset>' +
      '<div class="ft">' +
        '<button type="button" data-act="reset">' + T.reset + '</button>' +
        '<a href="' + STATEMENT_URL + '">' + T.statement + '</a>' +
        '<a href="' + CONTACT_URL + '">' + T.contact + '</a>' +
        '<p class="note">' + T.local + '</p>' +
      '</div>' +
      '<div class="sr" role="status" aria-live="polite" data-live></div>' +
    '</div>';

  /* ---------- init ---------- */
  function init() {
    host = document.createElement('div');
    host.id = HOST_ID;
    root = host.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    var wrap = document.createElement('div');
    wrap.innerHTML = HTML;
    while (wrap.firstChild) root.appendChild(wrap.firstChild);

    var skip = document.querySelector('.skip-link');
    if (skip && skip.parentNode === document.body) document.body.insertBefore(host, skip.nextSibling);
    else document.body.insertBefore(host, document.body.firstChild);

    fab = root.querySelector('.fab');
    panel = root.querySelector('.panel');
    live = root.querySelector('[data-live]');
    sizeLabel = root.querySelector('[data-size]');

    fab.addEventListener('click', function () {
      panel.hidden ? openPanel() : closePanel();
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]');
      if (!b) return;
      var a = b.getAttribute('data-act');
      if (a === 'close') return closePanel();
      if (a === 'reset') return resetAll();
      if (a === 'bigger') return step(1);
      if (a === 'smaller') return step(-1);
      if (['hc-dark', 'hc-light', 'invert', 'grayscale'].indexOf(a) > -1) return setColor(a);
      if (['readable', 'links', 'focus', 'cursor', 'motion', 'speak'].indexOf(a) > -1) return toggle(a);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      stopSpeaking();
      if (!panel.hidden) closePanel();
    });
    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (e.target === host || host.contains(e.target)) return;
      closePanel(false);
    });
    document.addEventListener('click', onPageClick, true);
    window.addEventListener('pagehide', stopSpeaking);

    load();
    applyAll();
    if (state.speak) waitForVoices(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
