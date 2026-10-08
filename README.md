# queens-gambit-zurich
Official website of Queen's Gambit Zürich

*A place for women to play chess.*

Live site (GitHub Pages, `main` branch, root): https://adelpopon.github.io/queens-gambit-zurich/

## About this site

Version 1 is a single-page landing site built with plain HTML, CSS and JavaScript. There is no build step and no external dependencies, and the fonts are self-hosted. GitHub Pages publishes the `main` branch as it is.

Every section is a self-contained block in `index.html` with its own anchor, so each one can later move to a dedicated page:

| Section | Anchor |
|---|---|
| Hero | `#home` |
| Upcoming at Queen's Gambit | `#upcoming` |
| Our Community | `#community` |
| Chess for the Next Generation (Kids Chess) | `#kids` |
| Chess with Social Impact | `#impact` |
| Collaborations & Projects | `#collaborations` |
| Who We Are | `#about` |
| Join Queen's Gambit | `#join` |

## Files

```
index.html          Page content (all sections)
css/fonts.css       Self-hosted fonts (League Spartan, Inter)
css/site.css        Design system ("Modern Editorial") and layout
js/site.js          Menu, events, links, copy-email button
data/config.js      Links and contact details  <- edit here
data/events.js      Events                     <- edit here
assets/brand/       QGZ crown and wordmark
assets/photos/      Community photos
assets/fonts/       Font files and licences (SIL OFL 1.1)
.nojekyll           Tells GitHub Pages to serve the files as they are
```

## Common updates

**Add a link (WhatsApp, Instagram, Kids registration, Impressum, privacy policy)**
Open `data/config.js` and replace `null` with the URL. The matching buttons appear automatically. While a link is `null`, its buttons are hidden or point to the contact section, so visitors never see unfinished content.

**Add or change an event**
Edit `data/events.js`. Dates use `YYYY-MM-DD`. Events are sorted automatically, and past events disappear on their own. A meeting time appears only once it is filled in.

**Change text**
Edit `index.html`. Each section starts with a comment such as `<!-- 3. COMMUNITY -->`.

## Design system

- Colours: Warm Ivory `#FDFBF7`, Neutral Sand `#EFECE6`, Natural Charcoal `#2B2A27`, Zurich Blue `#0070B4` (accent only)
- Type: League Spartan Bold for headings, Inter for body text and UI

## Custom domain

The site currently uses the GitHub Pages address. To use `queensgambitzurich.ch` later, add a `CNAME` file containing the domain, configure DNS at the domain registrar, then set the domain under Settings → Pages.

## Local preview

From the repository folder, run `python3 -m http.server 8000` and open http://localhost:8000.
