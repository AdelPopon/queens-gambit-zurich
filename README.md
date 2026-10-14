# QGZ email designs

Version-controlled source for Queen's Gambit Zürich email designs (Mailchimp).

This branch is **never merged into `main`**: `main` is published by GitHub Pages, and these files are not part of the website.

## Kids Chess Zollikon – v4 (approved design)

| | |
|---|---|
| Status | **Design approved** on 14 Oct 2026. The campaign is **not approved for sending**. |
| Approved source | `kids-chess-zollikon/v4-approved/zollikon-kids-chess-v4.html` |
| Mailchimp copy | `kids-chess-zollikon/v4-approved/zollikon-kids-chess-v4.mailchimp.html` |
| Mailchimp campaign | Draft, ID 18003024, content type "Paste in code" |
| Mailchimp template | "Kids Chess Zollikon v4 (approved)", template ID 10086535 |
| Checksums | `kids-chess-zollikon/v4-approved/SHA256SUMS.txt` |

**Mailchimp copy.** When code is saved, Mailchimp adds an XHTML 1.0 Transitional DOCTYPE line, changes `<style>` to `<style type="text/css">` and drops the final newline. The `.mailchimp.html` file is the approved source with exactly these three changes. Its SHA-256 (`b37e5064…c221`) matches the code stored in the campaign draft, as checked on 14 Oct 2026.

**Saved template.** The template editor also reformats the CSS `<style>` block. The email body is identical.

**Structure.** The email runs in this order:
1. QGZ header: logo, wordmark and "ZOLLIKON KIDS CHESS" with the Kids Chess crown.
2. German box: schedule, details, an "Inklusive" box and the "Jetzt anmelden" button.
3. Kids Chess illustration.
4. English box, the same layout as the German one, with the "Register now" button.
5. Light QGZ footer with unsubscribe, update-topics and privacy links.

**Assets.** The email loads its images from queensgambitzurich.ch:
- `assets/brand/qgz-logo.png`
- `assets/brand/qgz-wordmark-line.png`
- `assets/brand/qgz-crown.png`
- `assets/photos/kids-chess-illustration.jpg`

### Still open before sending

Do not send until all of these are settled:
- **Registration:** the buttons use a temporary Google Form (https://forms.gle/7hB3VTcpPQPC6QsGA). It will be replaced by the dedicated Kids Chess registration system.
- **Pricing and promotional offer.**
- **Final campaign messaging.**
- **Mailchimp settings:** recipients, subject line, preview text and footer postal address.

### Rebuilding

`source/build_zollikon_v4.py` writes `zollikon-kids-chess-v4.html` next to itself. The output is identical, byte for byte, to the approved file.

The builder imports `build_zollikon_v2.py`, so keep both files together. Run it with:

```
cd source && python3 build_zollikon_v4.py
```

## QGZ Master Template

- The reusable template is saved in Mailchimp as "QGZ Master Template" (template ID 10086534), with editable regions.
- `master-template/qgz-master-template.html` is its source.
- `source/build_email.py` generates it.
- It is separate from the Zollikon design and was not changed by it.
