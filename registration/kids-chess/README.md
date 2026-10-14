# Kids Chess workshop registration (Google Sheets + Apps Script)

Registration for **Kids Chess Zollikon** (24, 25 and 31 October 2026), built on
the same design as the QGZ × WINZ registration (`registration/apps-script`) but
completely separate from it: its own Google Sheet, its own script, its own
web-app URL. Nothing here changes WINZ or the newsletter.

- Website: `https://queensgambitzurich.ch/kids/zollikon/` (German) and
  `/en/kids/zollikon/` (English). Content: `tools/kids_registration.html`,
  behaviour: `js/kids-registration.js`, styles: `css/kids-registration.css`.
- Backend: [`apps-script/Code.gs`](apps-script/Code.gs) in a new Sheet.
- Parents choose one, two or all three sessions. Each session holds at most
  18 children (changeable in the Sheet). Full sessions are greyed out on the
  website, and the script refuses any registration that would exceed capacity.
- Prices are **not** set. They can be entered later in the Sheet; nothing is
  shown to parents until *Publish prices* is set to *Yes*.
- Parents are never added to Mailchimp. The optional marketing consent is only
  recorded in the Sheet.

The website shows the form, and the *Register* button in the Kids Chess
section points to it, only once the web-app URL is entered in
`data/config.js` (`kidsChess.endpoint`).

## One-time setup (about 10 minutes)

Use the Google account that owns the WINZ registration Sheet (it sends the
emails). Do **not** use the WINZ Sheet itself.

1. **Create the Sheet.** Go to <https://sheets.new> and name it
   `QGZ Kids Chess Zollikon Registrations`.
2. **Open Apps Script.** In the Sheet: *Extensions ▸ Apps Script*. Name the
   project `QGZ Kids Chess registration`.
3. **Paste the code.** Replace everything in `Code.gs` with
   [`apps-script/Code.gs`](apps-script/Code.gs).
4. **Paste the manifest.** *Project Settings* (gear icon) ▸ tick
   *Show "appsscript.json" manifest file in editor*. Open `appsscript.json`
   and replace its contents with [`apps-script/appsscript.json`](apps-script/appsscript.json).
   Save (Ctrl/Cmd + S).
5. **Run setup.** Choose `setup` in the function dropdown and click *Run*.
   Allow the permissions (*Advanced ▸ Go to … (unsafe) ▸ Allow*; "unsafe" only
   means the script is your own, not published by Google). It asks for: this
   one spreadsheet, sending email as you, showing a menu in the Sheet, and your
   email address. The Sheet now has the tabs **Dashboard, Registrations,
   Settings, Log**.
6. *(Optional)* **Test the emails.** Reload the Sheet; a **Kids Chess** menu
   appears. *Kids Chess ▸ Send test emails to me* sends you the parent
   confirmation in English and German. No row is added, no organiser email.
7. **Deploy.** In Apps Script: *Deploy ▸ New deployment ▸* gear ▸ *Web app*.
   - Description: `QGZ Kids Chess registration`
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click *Deploy* and copy the **Web app URL** (ends in `/exec`).
8. **Send the URL** to whoever maintains the website (it goes into
   `data/config.js` as `kidsChess.endpoint`). It is not a secret: it can only
   add registrations and say which sessions are full.

## The tabs

- **Dashboard** – registrations (children), cancellations, bookings for 1/2/3
  sessions, children per session, capacity and places left (red at 0),
  expected revenue, paid/open/refunded amounts, and how many registrations
  still have no price. Updates automatically.
- **Registrations** – one row per child: ID, date, parent (first/last name,
  email, phone), child (first/last name, age, experience), one tick box per
  session, number of sessions, selected dates, price, *Registration Status*
  (Confirmed / Cancelled), *Payment Status* (Open / Paid / Refunded), marketing
  consent, language, notes. Columns can be added at the end; do not rename the
  existing headers.
- **Settings** – capacity and price per session, optional package prices for
  2 or 3 sessions, currency, *Publish prices* (Yes/No), *Registration open*
  (Yes/No). Changes take effect immediately, without redeploying.
- **Log** – technical events (rejected spam, duplicates, full sessions, email
  problems) with masked email addresses.

## Everyday tasks

- **Cancel a booking:** set *Registration Status* to *Cancelled*. The places
  are freed immediately and the row no longer counts on the Dashboard.
- **Change sessions for a child:** tick or untick the session boxes in the row
  (and adjust *Sessions*, *Selected Dates* and *Price* if needed).
- **Record a payment:** set *Payment Status* to *Paid*.
- **Set prices later:** enter them in *Settings*. Price = package price for
  that number of sessions if set, otherwise the sum of the session prices.
  Then *Kids Chess ▸ Fill in missing prices* adds the price to earlier
  registrations (existing prices are never changed). Set *Publish prices* to
  *Yes* to show prices on the website and in confirmation emails.
- **Close registration:** *Settings ▸ Registration open ▸ No*. Sessions whose
  date has passed cannot be booked in any case.
- **Export:** *File ▸ Download ▸ CSV / Microsoft Excel*.

## Protection built in

- Spam: hidden honeypot field, minimum fill time, rate limits (per address and
  overall; a parent can register several children).
- Duplicates: the same child (first + last name) with the same parent email
  is accepted only once; siblings are fine. The submit button is locked while
  sending.
- Capacity: counted per session under a lock, so two parents cannot take the
  last place at the same moment.
- No false confirmations: the website shows success only after the script has
  stored the row and read it back; emails are sent only after that.
- Formula injection: values starting with `=`, `+`, `-` or `@` are stored as text.
- No data access: the web app never returns registrations, only whether each
  session is full (and prices once published).

## Tests

- `node registration/kids-chess/test/run-tests.js` runs the real `Code.gs`
  against in-memory sheets (1/2/3 sessions, capacity, duplicates, prices,
  validation, emails). No network, no real emails.
- `node registration/kids-chess/test/serve.js` serves the website at
  <http://localhost:8080/kids/zollikon/> with a local stand-in backend, to try
  the page without touching the real Sheet. Optional: `KIDS_CAPACITY=2`,
  `KIDS_PRICES=40,40,60`.

## A future workshop

*File ▸ Make a copy* of this Sheet (the script is copied with it), clear the
Registrations rows, edit the `WORKSHOP` block at the top of `Code.gs` (id and
session dates must match the event in `data/events.js`), run `setup`, deploy
the copy as a new web app, and add the page to `KIDS_PAGES` in
`tools/build.py`.

## After editing `Code.gs`

*Deploy ▸ Manage deployments ▸* pencil ▸ *Version: New version ▸ Deploy*. The
URL stays the same.

## Data protection

The Privacy Policy (section 5) covers these registrations. Delete the rows (or
the Sheet) no later than three months after the workshop; keep only the names
and email addresses of parents who gave marketing consent, for that purpose.
