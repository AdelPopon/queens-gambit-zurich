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
    impressum: { en: "/en/impressum/", de: "/impressum/" },
    privacy: { en: "/en/privacy/", de: "/datenschutz/" }
  },

  // Event registration (QGZ × WINZ). The URL of the deployed Google Apps
  // Script web app ("…/exec"). It is not a secret: it only accepts new
  // registrations and never returns stored data. While it is null, the
  // "Register for free" button stays hidden, so no form is shown that
  // cannot store registrations. Setup: registration/README.md
  registration: {
    endpoint: "https://script.google.com/macros/s/AKfycbyZVFaN3BAbUFEfRiGaCsAm0Nff1_6liDWFZa2aYx-9jTgwcTwWoAs0lFFPi-E61mMcbQ/exec"
  },

  // Newsletter (Mailchimp audience "Queen's Gambit Zürich", double opt-in).
  // These are the public identifiers of Mailchimp's own signup endpoint (the
  // same values that appear in any Mailchimp signup form). They are not API
  // keys and give no access to the audience. The form posts to Mailchimp only
  // when a visitor submits it. While "action" is null, the form stays hidden.
  // groups: Mailchimp group "Newsletter topics" (interest IDs).
  newsletter: {
    // Hidden 14 Oct 2026: Mailchimp no longer serves the JSONP endpoint (post-json
    // returns 404), so the form could not subscribe anyone. Re-enabled once the
    // Apps Script backend is in place.
    action: null,
    u: "ed48e3ae905866bc59a68cb85",
    id: "309936e8c9",
    groups: {
      community: "group[59269][1]",   // Women's Chess Club & Community
      kids: "group[59269][2]",        // Kids Chess
      news: "group[59269][4]"         // General QGZ News & Events
    },
    languageField: "LANG"             // audience field "Language" (de / en)
  },

  contact: {
    // Source: Kinder Schach banner, October 2026
    email: "info@queensgambitzurich.ch"
  }
};
