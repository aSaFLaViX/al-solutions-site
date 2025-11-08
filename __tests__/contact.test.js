describe('contact form script', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.resetModules();
    console.error = jest.fn();

    document.body.innerHTML = `
      <form id="contactForm">
        <input type="text" name="name" value="Ada Lovelace" />
        <button type="submit">Send Message</button>
      </form>
      <p id="formStatus"></p>
    `;

    global.fetch = jest.fn();

    global.FormData = jest.fn().mockImplementation((form) => {
      if (!(form instanceof HTMLFormElement)) {
        throw new TypeError('FormData mock expects a form element');
      }
      return {
        formSent: form,
      };
    });

    require('../js/contact.js');
  });

  afterEach(() => {
    console.error = originalConsoleError;
    delete global.fetch;
    delete global.FormData;
  });

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  test('submits the form successfully', async () => {
    const response = {
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    };
    global.fetch.mockResolvedValue(response);

    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');
    const button = form.querySelector('button[type="submit"]');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://formsubmit.co/ajax/asaflavi9@gmail.com',
      expect.objectContaining({
        method: 'POST',
        headers: { Accept: 'application/json' },
      })
    );
    expect(global.FormData).toHaveBeenCalledWith(form);
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Send Message');
    expect(status.textContent).toContain('Thanks!');
    expect(status.classList.contains('success')).toBe(true);
  });

  test('shows an error when submission fails', async () => {
    const errorResponse = {
      ok: false,
      json: jest.fn().mockResolvedValue({ message: 'Service unavailable' }),
    };
    global.fetch.mockResolvedValue(errorResponse);

    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');
    const button = form.querySelector('button[type="submit"]');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(global.fetch).toHaveBeenCalled();
    expect(global.FormData).toHaveBeenCalledWith(form);
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Send Message');
    expect(status.textContent).toContain('Something went wrong');
    expect(status.classList.contains('error')).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });
});
