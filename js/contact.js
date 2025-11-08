const form = document.getElementById('contactForm');
const statusMessage = document.getElementById('formStatus');

if (form && statusMessage) {
  const submitButton = form.querySelector('button[type="submit"]');
  const endpoint = 'https://formsubmit.co/ajax/asaflavi9@gmail.com';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!submitButton) {
      return;
    }

    statusMessage.textContent = '';
    statusMessage.classList.remove('success', 'error');

    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Sending…';

    try {
      const formData = new FormData(form);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Unable to send your message right now.';
        try {
          const data = await response.json();
          if (data && data.message) {
            errorMessage = data.message;
          }
        } catch (error) {
          // Ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      form.reset();
      statusMessage.textContent = 'Thanks! Your message has been sent and we will be in touch shortly.';
      statusMessage.classList.add('success');
    } catch (error) {
      statusMessage.textContent =
        'Something went wrong. Please try again in a moment or reach out via LinkedIn.';
      statusMessage.classList.add('error');
      console.error(error);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });
}
