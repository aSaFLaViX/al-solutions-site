# AL Solutions Website

This repository contains the source files for **AL Solutions**, an operational AI consultancy led by **Asaf&nbsp;Lavi**.  The site is built as a simple, multi‑page static website using plain HTML and CSS—there is no build process or framework involved.

## Repository structure

```
al-solutions-site-new/
├── index.html      # Home page with hero, overview of services and calls to action
├── services.html   # Overview of the main service categories and engagement model
├── about.html      # Background on AL Solutions and Asaf Lavi
├── contact.html    # Contact page with email, LinkedIn link and call request button
├── css/
│   └── style.css   # Shared styles for all pages (dark theme)
├── images/
│   ├── logo.png    # Company logo (abstract, blue‑purple gradient)
│   └── hero-bg.png # Subtle background image used on the home page hero
└── TODO.md         # Roadmap of future enhancements
```

## Getting started

Since the site is fully static, there are no dependencies to install.  To preview the site locally:

1. Clone or download this repository.
2. Open `index.html` in your browser, or start a simple HTTP server:

   ```bash
   cd al-solutions-site-new
   python -m http.server 8000
   ```
3. Navigate to `http://localhost:8000/index.html` in your browser.

### Deploying to GitHub Pages

This site can be hosted directly from GitHub Pages.  Commit the contents of `al-solutions-site-new` to the `main` branch of your repository and enable GitHub Pages for that branch in the repository settings.  The site will be served at `https://<username>.github.io/<repo>/`.

## Customising the site

* **Content** – Update the text in the HTML files to reflect your current offerings.  Service descriptions are intentionally generic (Knowledge Bots, Data&nbsp;Copilot API, Multi‑Agent Orchestration and Custom AI Pipelines) so they apply to a wide range of clients.  Avoid detailing proprietary implementations.
* **Contact details** – The contact page uses the real email address `asaflavi9@gmail.com` and links to Asaf’s LinkedIn profile at `linkedin.com/in/asaf-lavi-ai`.  Update these if necessary.
* **Styling** – All styling is contained in `css/style.css`.  Colours and spacing are defined with CSS variables at the top of the file.  Use semantic HTML and keep layouts responsive.
* **Images** – Replace `images/logo.png` and `images/hero-bg.png` if you design new branding.  Ensure images are optimized for web.

## Future improvements

See `TODO.md` for a list of enhancements that may be implemented in future, such as a blog/resources section, dark/light theme toggle, CRM‑integrated contact form, testimonials and interactive demos.  Contributions and ideas are welcome.
