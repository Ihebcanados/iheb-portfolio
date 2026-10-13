# Iheb Ichi — portfolio

Personal portfolio of Iheb Ichi: software engineer and creative technologist, Mahdia, Tunisia.

A fast, dependency-free static site (HTML, CSS, vanilla JavaScript). No build step.

## Structure

```
index.html                  Home: hero, about, projects, skills, experience, education, creative, contact
projects/sawarny/index.html Sawarny case study
404.html                    Not-found page
api/contact.js              Contact form endpoint (Vercel serverless function, sends through Resend)
assets/css/site.css         Design tokens and all styles
assets/js/site.js           Navigation, mobile menu, filters, viewfinder, contact form
assets/fonts/               Bricolage Grotesque + Geist (self-hosted, SIL Open Font Licence)
assets/img/                 Portrait, Sawarny logo, Open Graph images
cv/Iheb-Ichi-CV.pdf         The CV behind every "Download CV" button
scripts/dev-server.mjs      Local preview server (static files + /api/contact)
scripts/set-site-url.mjs    Writes your real domain into canonical/OG tags, sitemap and robots.txt
vercel.json                 Clean URLs, caching and security headers
```

## Run locally

Requires Node.js 18 or newer. Nothing to install.

```bash
node scripts/dev-server.mjs
# open http://localhost:3000
```


## Deploy (Vercel)

1. Push this folder to a GitHub repository.
2. On vercel.com, **Add New → Project**, import the repository. Framework preset: **Other**. No build command, no output directory.
3. Deploy. Every push to `main` redeploys.
4. Set your domain in the meta tags, then commit:
   ```bash
   node scripts/set-site-url.mjs https://your-domain.com
   ```

## Contact

The contact section lists email, phone, LinkedIn, GitHub and location only. There is no form, so no email service or API key is needed. `api/contact.js` is no longer used by the page.

## Editing content

All content is plain HTML in `index.html` and `projects/sawarny/index.html`.

- **New project:** copy one `<li class="project-item">` block in the projects list. `data-cat` sets which filters show it (`web`, `ai`, `iot`; space-separated).
- **Photos for the creative section:** add images to `assets/img/work/` and uncomment the gallery block in the "Behind the camera" section.
- **Sawarny screenshots:** live in `assets/img/sawarny/` and are listed in the case study's Realisation section. The two live-session screens have guests' faces blurred; if those people agree to appear, replace `10-live-session.jpg` and `11-find-me.jpg` with unblurred versions.
- **Projects:** each project row can show screenshots in a `project__media` block; images live in `assets/img/projects/`.
- **Hero photo:** the viewfinder uses `assets/img/graduation.jpg` (twice in `index.html`: a blurred base and a sharp copy clipped to the focus box). If you swap the photo, update both `src` attributes and the `SUBJECTS` list in `assets/js/site.js` (the centre of each lock-on point as a fraction of width and height).
- **CV:** replace `cv/Iheb-Ichi-CV.pdf`, keeping the file name.

## Accessibility and performance

- Semantic landmarks, a skip link, visible focus styles, keyboard-operable menu (Escape closes it, focus is trapped while open).
- `prefers-reduced-motion` stops the timecode, light beams, floor grid, light motes, scan line, entrance animations and smooth scrolling.
- The hero light motes are drawn on a canvas that pauses when it scrolls out of view or the tab is hidden.
- Self-hosted, subset fonts; no third-party scripts or trackers; total page weight is small.
