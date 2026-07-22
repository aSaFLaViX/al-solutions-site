/* Contact form: submit to Formspree via fetch so the visitor stays on our domain.
   Progressive enhancement. With JS off the form still POSTs normally and Formspree
   shows its own confirmation page, so nothing is ever lost. */
(function () {
  var form = document.querySelector('form.form-card');
  if (!form || !window.fetch) return;

  var isHebrew = document.documentElement.lang === 'he';
  var nextField = form.querySelector('input[name="_next"]');
  var thanksUrl = nextField ? nextField.value : (isHebrew ? '/thanks/' : '/en/thanks/');
  var button = form.querySelector('button[type="submit"]');
  var originalLabel = button ? button.textContent : '';

  var text = isHebrew ? {
    sending: 'שולח...',
    error: 'משהו השתבש בשליחה. אפשר לנסות שוב, או לפנות ישירות ב-WhatsApp או במייל.'
  } : {
    sending: 'Sending...',
    error: 'Something went wrong sending the form. Please try again, or reach out directly on WhatsApp or by email.'
  };

  // Live region so screen readers announce failures
  var status = document.createElement('p');
  status.className = 'form-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  form.appendChild(status);

  form.addEventListener('submit', function (e) {
    if (!form.checkValidity()) return; // let the browser show native validation
    e.preventDefault();

    status.hidden = true;
    status.classList.remove('is-error');
    if (button) { button.disabled = true; button.textContent = text.sending; }

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(res); })
      .then(function (data) {
        if (data && data.ok === false) return Promise.reject(data);
        window.location.href = thanksUrl;
      })
      .catch(function () {
        if (button) { button.disabled = false; button.textContent = originalLabel; }
        status.textContent = text.error;
        status.classList.add('is-error');
        status.hidden = false;
        status.focus && status.focus();
      });
  });
})();
