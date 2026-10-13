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

    // Kids Chess / Zollikon pilot registration form URL
    kidsRegistration: null,

    // Legal pages (English / German)
    impressum: { en: "/impressum/", de: "/de/impressum/" },
    privacy: { en: "/privacy/", de: "/de/datenschutz/" }
  },

  // Event registration (QGZ × WINZ). The URL of the deployed Google Apps
  // Script web app ("…/exec"). It is not a secret: it only accepts new
  // registrations and never returns stored data. While it is null, the
  // "Register for free" button stays hidden, so no form is shown that
  // cannot store registrations. Setup: registration/README.md
  registration: {
    endpoint: null
  },

  contact: {
    // Source: Kinder Schach banner, October 2026
    email: "info@queensgambitzurich.ch"
  }
};
