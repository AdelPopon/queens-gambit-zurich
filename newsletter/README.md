# Newsletter signup backend (Google Apps Script → Mailchimp)

The newsletter form on the website (`js/newsletter.js`) sends signups to this
small Apps Script web app, which adds them to the Mailchimp audience
"Queen's Gambit Zürich" through the Mailchimp API.

Why: Mailchimp no longer serves the browser-side signup endpoint
(`/subscribe/post-json` returns 404 since October 2026), so a static website
cannot subscribe people directly any more.

What it does, and does not do:

- A **new** address is created as **pending**; Mailchimp sends its confirmation
  email (double opt-in). It becomes "subscribed" only after the link is clicked.
- An address that **already exists** (subscribed, pending, unsubscribed,
  cleaned, archived) is **never changed**. The visitor gets a message instead.
- Topics → Mailchimp group "Newsletter topics". Language (de/en) → contact
  language, and the audience field `LANG` if it exists.
- Nothing is stored by the script itself. It is separate from the event
  registration script and does not touch the registration Sheet.
- The Mailchimp API key lives only in the script's properties, never in GitHub.

## One-time setup (about 10 minutes)

1. **Mailchimp API key.** In Mailchimp: profile icon → *Profile* → *Extras* →
   *API keys* → *Create A Key*, name it "QGZ website newsletter". Copy it
   (it ends in `-us12`). Treat it like a password.
2. **Create the script.** Go to <https://script.google.com> with the QGZ Google
   account (queensgambitzurich@gmail.com) → *New project*. Name it
   "QGZ Newsletter signup".
3. Replace the contents of `Code.gs` with `newsletter/apps-script/Code.gs`.
   In *Project settings*, tick *Show "appsscript.json" manifest file*, then
   replace `appsscript.json` with `newsletter/apps-script/appsscript.json`.
4. **Store the key.** *Project settings* → *Script properties* → *Add script
   property*: name `MC_API_KEY`, value = the key from step 1. Save.
5. **Check.** In the editor, choose the function `checkSetup` and click *Run*
   (allow the permission prompt: "connect to an external service"). The log
   should end with `OK: setup looks good.` It creates no contacts.
6. **Deploy.** *Deploy* → *New deployment* → type *Web app*; *Execute as*: Me;
   *Who has access*: Anyone. Copy the URL ending in `/exec`.
7. **Connect the website.** Put that URL in `data/config.js` →
   `newsletter.endpoint`, bump the cache versions and open a pull request.
   The form appears only while `endpoint` is set.

After changing `Code.gs`, deploy again via *Deploy → Manage deployments →
Edit → New version* so the `/exec` URL stays the same.

## Answers the web app gives

`{ ok: true, code: "success" }` (created as pending) · `already` · `pending` ·
`existing` · `email` · `topics` · `consent` · `rate` · `invalid` · `server`.
The website shows a DE/EN message for each.

## Turning it off

Set `newsletter.endpoint` to `null` in `data/config.js`: the form disappears.
To stop the backend too, archive the deployment and delete the API key in
Mailchimp.
