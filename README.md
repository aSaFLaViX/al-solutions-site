# al-solutions.co.il

Marketing site for AL Solutions. Static HTML + CSS, no build step, hosted on GitHub Pages.

- Hebrew (RTL) at `/`, English at `/en/`
- Brand system: `~/ai-business-campaign/docs/brand-guidelines.md`
- Contact form: FormSubmit.co relay to email (swap the endpoint in both index.html files to change)
- Deploy: push to `main`; GitHub Pages serves the root. Domain via `CNAME` + LiveDNS records
- Full first-time deployment guide: `~/ai-business-campaign/docs/website-deployment-guide.md`

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080
```
