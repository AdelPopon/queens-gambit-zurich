/* ==========================================================================
   Queen's Gambit Zürich: site configuration
   --------------------------------------------------------------------------
   Edit links and contact details here. Every button on the page that points
   to one of these keys updates automatically.

   A value of null means "not provided yet": buttons for that link are hidden
   automatically, or point to an on-page section instead (e.g. "Get in touch").
   Nothing incomplete is shown to visitors.
   ========================================================================== */

window.QGZ_CONFIG = {
  links: {
    // Main "Join the community" destination (WhatsApp community invite URL)
    whatsapp: null,

    // Instagram profile URL, e.g. "https://www.instagram.com/<handle>/"
    instagram: "https://www.instagram.com/queensgambitzurich/",

    // LinkedIn page URL (shown in the footer)
    linkedin: "https://www.linkedin.com/company/queensgambitzurich/",

    // Kids Chess workshop registration (the "Register" button in the Kids
    // Chess section). Set automatically below once kidsChess.endpoint is set.
    kidsRegistration: null,

    // Legal pages (English / German)
    impressum: { en: "/en/impressum/", de: "/impressum/" },
    privacy: { en: "/en/privacy/", de: "/datenschutz/" }
  },

  // Visitor statistics (GoatCounter, https://www.goatcounter.com): the site
  // code chosen when creating the GoatCounter account, e.g. "queensgambitzurich"
  // (dashboard at https://<code>.goatcounter.com). No cookies, no personal
  // data; described in the Privacy Policy. While it is null, nothing is loaded.
  analytics: {
    goatcounter: "queensgambitzurich"
  },

  // Event registration (QGZ × WINZ). The URL of the deployed Google Apps
  // Script web app ("…/exec"). It is not a secret: it only accepts new
  // registrations and never returns stored data. While it is null, the
  // "Register for free" button stays hidden, so no form is shown that
  // cannot store registrations. Setup: registration/README.md
  registration: {
    endpoint: "https://script.google.com/macros/s/AKfycbyZVFaN3BAbUFEfRiGaCsAm0Nff1_6liDWFZa2aYx-9jTgwcTwWoAs0lFFPi-E61mMcbQ/exec"
  },

  // Kids Chess workshop registration (Zollikon Kids Chess, /kids/zollikon/).
  // The URL of the deployed Kids Chess Apps Script web app ("…/exec"), a
  // separate script and Sheet from the WINZ registration above. Like that
  // URL, it is not a secret: it accepts registrations and says which sessions
  // are full, but never returns stored data. While it is null, the
  // registration page shows no form and the Kids Chess "Register" button
  // keeps its fallback. Setup: registration/kids-chess/README.md
  kidsChess: {
    endpoint: "https://script.google.com/macros/s/AKfycbx6P4P_y_yHfGL5wGcaEjloJhFeifZsG_-OL1BXsmbYlqFBGk5rZOfVUz3WwWRLDLev/exec",
    page: { en: "/en/kids/zollikon/", de: "/kids/zollikon/" },
    // false = registration closed: the registration page shows the "closed"
    // message and the Register buttons become a "Registration closed" label.
    // (Also set "Registration open" to No in the Sheet's Settings tab.)
    open: false
  },

  // Newsletter (Mailchimp audience "Queen's Gambit Zürich", double opt-in).
  // The form sends signups to a Google Apps Script web app (newsletter/),
  // which adds new addresses to Mailchimp as "pending" (Mailchimp then sends
  // its confirmation email) and never changes existing contacts. The Mailchimp
  // API key lives only in that script. While "endpoint" is null, the form
  // stays hidden. Setup: newsletter/README.md
  newsletter: {
    endpoint: "https://script.google.com/macros/s/AKfycbxsVjO5oMMFWyY_-zlMf4mamnJbldoe3oRCeUiQsexRnECnObBCPRafPxKHN-MRd3W97w/exec"
  },

  contact: {
    // Source: Kinder Schach banner, October 2026
    email: "info@queensgambitzurich.ch"
  }
};

// The Kids Chess "Register" button points to the registration page only once
// the registration backend is connected.
if (window.QGZ_CONFIG.kidsChess.endpoint && window.QGZ_CONFIG.kidsChess.open !== false) {
  window.QGZ_CONFIG.links.kidsRegistration = window.QGZ_CONFIG.kidsChess.page;
}
// Links whose registration is closed: shown as a "Registration closed" label.
window.QGZ_CONFIG.closedLinks = { kidsRegistration: window.QGZ_CONFIG.kidsChess.open === false };
