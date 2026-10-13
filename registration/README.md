# Event registration (Google Sheets + Apps Script)

The website form sends each registration to a small Google Apps Script web app.
The script stores it in a Google Sheet, checks that it was stored, and only then
emails the participant (in their language) and the QGZ inbox.

The **Register for free** button stays hidden on the website until the web app
URL is entered in `data/config.js` (`registration.endpoint`). Nothing visitors
can submit is lost while the backend is not set up.

No passwords, API keys or tokens are needed in the website. The only value the
website knows is the public web app URL, which can *add* a registration but
cannot read any data.

## One-time setup (about 10 minutes)

Use the Google account that should own the participant list and send the
emails (ideally a QGZ account rather than a personal one).

1. **Create the Sheet.** Go to <https://sheets.new> and name it
   `QGZ Event Registrations`.
2. **Open Apps Script.** In the Sheet: *Extensions ▸ Apps Script*.
3. **Paste the code.** Replace everything in `Code.gs` with the contents of
   [`apps-script/Code.gs`](apps-script/Code.gs).
4. **Paste the manifest.** *Project Settings* (gear icon) ▸ tick
   *Show "appsscript.json" manifest file in editor*. Back in the editor, open
   `appsscript.json` and replace its contents with
   [`apps-script/appsscript.json`](apps-script/appsscript.json). Save (Ctrl/Cmd + S).
5. **Run setup.** Choose `setup` in the function dropdown and click *Run*.
   Google asks for permission: *Review permissions ▸ choose the account ▸
   Advanced ▸ Go to … (unsafe) ▸ Allow*. ("Unsafe" only means the script is
   not published by Google; it is your own script.) The script requests only:
   access to this one spreadsheet, sending email as you, and your email address.
   The Sheet now has three tabs: **Registrations**, **Summary**, **Log**.
6. *(Optional)* **Test the emails.** Run `testEmails`. You receive one English
   and one German confirmation; the Registrations tab is not touched.
7. **Deploy.** *Deploy ▸ New deployment ▸* gear icon ▸ *Web app*.
   - Description: `QGZ registration`
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click *Deploy* and copy the **Web app URL** (ends in `/exec`).
8. **Send the URL** to whoever maintains the website, or enter it yourself in
   `data/config.js`:

   ```js
   registration: { endpoint: "https://script.google.com/macros/s/…/exec" }
   ```

   After that change is deployed, the button appears on the event card.

## Working with registrations

- **Registrations tab:** one row per person — Registration Date, Full Name,
  Email Address, Participation Type (General / Blitz / Both), Elo Rating,
  Language (EN / DE), Registration Status (Confirmed). Use the filter arrows
  in the header row to show, for example, only Blitz and Both.
- **Summary tab:** totals per participation type, number of blitz players, and
  a live list of blitz players with their Elo rating.
- **Export:** *File ▸ Download ▸ CSV or Microsoft Excel*.
- **Log tab:** technical events (rejected spam, duplicates, email problems)
  with masked email addresses, for troubleshooting.

## Changing things later

- **Sender and admin address:** `SETTINGS.ADMIN_EMAIL` / `REPLY_TO` at the top
  of `Code.gs`. Emails are sent from the Google account that deployed the
  script, with replies going to `REPLY_TO`.
- **Close registration:** set `open: false` for the event in `EVENTS`, or
  remove `registration: true` from the event in `data/events.js`.
- **Shareable link:** `https://queensgambitzurich.ch/winz/` (German) and `/en/winz/` (English) open the form directly. The confirmation emails link to `https://queensgambitzurich.ch/` (DE) and `/en/` (EN); old `/de/` addresses still forward. For a new event, add an entry to `REG_PAGES` in `tools/build.py` and run the build.
- **New event:** add an entry to `EVENTS` (key = event id shown in
  `data/events.js`, e.g. `chess-club-2027-01-31`) and set `registration: true`
  on that event in `data/events.js`.
- **After editing `Code.gs`:** *Deploy ▸ Manage deployments ▸* pencil icon ▸
  *Version: New version ▸ Deploy*. The URL stays the same.

## Protection built in

- Spam: hidden honeypot field, minimum fill time, rate limits (per address and
  overall).
- Duplicates: one registration per email address per event (case-insensitive).
- No false confirmations: the website shows success only after the script
  confirms the row was stored; emails are sent only after storing.
- Formula injection: values starting with `=`, `+`, `-` or `@` are stored as
  plain text.
- No data access: the web app has no endpoint that returns registrations.

## Data protection

Participant data stays in the Google account that owns the Sheet. The Privacy
Policy (section 5) states that registrations are deleted no later than three
months after the event; delete the rows (or the Sheet) accordingly.
