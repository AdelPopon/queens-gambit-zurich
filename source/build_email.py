#!/usr/bin/env python3
"""QGZ email builder.

Builds two files from one layout so they never drift apart:
  qgz-master-template.html   reusable Mailchimp template (mc:edit regions)
  zollikon-kids-chess-campaign.html   Zollikon Kids Chess draft content

Brand source: queensgambitzurich.ch (css/glass.css "Blue, Indigo & Ice").
Email-safe: table layout, inline styles, 600px, bulletproof VML button for
Outlook, system font fallbacks (no remote web fonts).
"""
import html, pathlib

OUT = pathlib.Path(__file__).parent
SITE = "https://queensgambitzurich.ch"

C = dict(blue="#0070B4", electric="#1479FF", indigo="#3949AB", indigo_deep="#2D3A9A",
         ice="#EAF3FF", lavender="#E4E9FF", white="#FFFFFF", ink="#202334",
         muted="#4E5470", rule="#D5DBF2")
DISPLAY = "'Archivo Black','Arial Black',Arial,Helvetica,sans-serif"
BODY = "Inter,'Segoe UI',Helvetica,Arial,sans-serif"


def head(title, preheader):
    return f"""<!doctype html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{title}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table,td,div,p,a,h1,h2,h3{{font-family:Arial,Helvetica,sans-serif !important;}}</style><![endif]-->
<style>
  body{{margin:0;padding:0;width:100% !important;background:{C['ice']};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}}
  table{{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}}
  img{{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;display:block;height:auto;}}
  a{{color:{C['blue']};}}
  .qgz-body p{{margin:0 0 14px 0;}}
  .qgz-body p:last-child{{margin-bottom:0;}}
  @media screen and (max-width:620px){{
    .qgz-wrap{{width:100% !important;}}
    .qgz-pad{{padding-left:20px !important;padding-right:20px !important;}}
    .qgz-hero-title{{font-size:28px !important;line-height:32px !important;}}
    .qgz-col{{display:block !important;width:100% !important;padding:0 0 12px 0 !important;}}
    .qgz-stack td{{display:block !important;width:100% !important;}}
    .qgz-btn a{{display:block !important;}}
    .qgz-hide-sm{{display:none !important;}}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{C['ice']};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:{C['ice']};" mc:edit="preheader">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{C['ice']}" style="background:{C['ice']};">
<tr><td align="center" style="padding:24px 12px 32px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="qgz-wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
"""


def header():
    return f"""
<!-- HEADER: logo + wordmark (as on the website) -->
<tr><td class="qgz-pad" bgcolor="{C['white']}" style="background:{C['white']};border-radius:18px 18px 0 0;padding:22px 32px;border:1px solid #FFFFFF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="52" valign="middle"><a href="{SITE}/" target="_blank"><img src="{SITE}/assets/brand/qgz-logo.png" width="48" alt="Queen's Gambit Zürich" style="width:48px;"></a></td>
    <td valign="middle" style="padding-left:14px;"><a href="{SITE}/" target="_blank"><img src="{SITE}/assets/brand/qgz-wordmark-line.png" width="186" alt="QUEEN'S GAMBIT ZÜRICH" style="width:186px;"></a></td>
    <td class="qgz-hide-sm" align="right" valign="middle" style="font:600 11px/16px {BODY};letter-spacing:1.4px;text-transform:uppercase;color:{C['indigo']};" mc:edit="header_label">*|DATE:F Y|*</td>
  </tr></table>
</td></tr>
"""


def hero(badge, title, subtitle):
    """Indigo-to-blue band, like the Join panel and the WINZ 'Special event' badge."""
    return f"""
<!-- HERO: gradient band (solid indigo fallback for Outlook) -->
<tr><td class="qgz-pad" bgcolor="{C['indigo']}" style="background:{C['indigo']};background-image:linear-gradient(135deg,{C['indigo_deep']} 0%,{C['indigo']} 42%,{C['blue']} 100%);padding:34px 32px 36px 32px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:999px;padding:6px 12px;font:600 11px/12px {BODY};letter-spacing:1.3px;text-transform:uppercase;color:{C['indigo']};" mc:edit="hero_badge">{badge}</td>
  </tr></table>
  <h1 class="qgz-hero-title" style="margin:18px 0 10px 0;font:400 34px/38px {DISPLAY};color:#FFFFFF;letter-spacing:-.2px;" mc:edit="hero_title">{title}</h1>
  <div style="font:400 17px/25px {BODY};color:{C['lavender']};" mc:edit="hero_subtitle">{subtitle}</div>
</td></tr>
"""


def image(src, alt, region="hero_image"):
    return f"""
<!-- IMAGE (no identifiable faces: QGZ photo rule) -->
<tr><td bgcolor="{C['white']}" style="background:{C['white']};padding:0;" mc:edit="{region}"><img src="{src}" width="600" alt="{html.escape(alt)}" style="width:100%;max-width:600px;"></td></tr>
"""


def body_block(region, inner, top_rule=False):
    border = f"border-top:1px solid {C['rule']};" if top_rule else ""
    return f"""
<tr><td class="qgz-pad qgz-body" bgcolor="{C['white']}" style="background:{C['white']};padding:28px 32px;{border}font:400 16px/25px {BODY};color:{C['ink']};" mc:edit="{region}">
{inner}
</td></tr>
"""


def eyebrow(text):
    return (f'<p style="margin:0 0 10px 0;font:600 12px/16px {BODY};letter-spacing:1.6px;text-transform:uppercase;color:{C["indigo"]};">'
            f'<span style="display:inline-block;width:9px;height:9px;background:{C["electric"]};border-radius:3px;margin-right:8px;vertical-align:1px;"></span>{text}</p>')


def h2(text):
    return f'<h2 style="margin:0 0 12px 0;font:400 23px/28px {DISPLAY};color:{C["ink"]};">{text}</h2>'


def sessions_table(rows, heads):
    th = "".join(f'<th align="left" style="padding:0 10px 8px 0;border-bottom:2px solid #9FA9DC;font:600 12px/16px {BODY};letter-spacing:1px;text-transform:uppercase;color:{C["indigo"]};">{h}</th>' for h in heads)
    tr = "".join(
        "<tr>" + "".join(f'<td style="padding:10px 10px 10px 0;border-bottom:1px solid {C["rule"]};font:{"600" if i == 0 else "400"} 15px/21px {BODY};color:{C["ink"]};">{c}</td>' for i, c in enumerate(r)) + "</tr>"
        for r in rows)
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px 0;"><tr>{th}</tr>{tr}</table>'


def facts(items):
    cells = "".join(
        f'<td class="qgz-col" width="{100 // len(items)}%" valign="top" style="padding:0 12px 0 0;">'
        f'<div style="font:600 12px/16px {BODY};letter-spacing:1px;text-transform:uppercase;color:{C["indigo"]};">{k}</div>'
        f'<div style="font:600 16px/22px {BODY};color:{C["ink"]};padding-top:4px;">{v}</div></td>'
        for k, v in items)
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;"><tr>{cells}</tr></table>'


def panel(inner):
    """Ice panel like the website's glass cards."""
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 6px 0;">'
            f'<tr><td bgcolor="{C["ice"]}" style="background:{C["ice"]};border:1px solid #D6E4FB;border-radius:14px;padding:18px 20px;font:400 15px/23px {BODY};color:{C["ink"]};">{inner}</td></tr></table>')


def principles(items):
    """Numbered principles, as in the Kids Chess section (01 / 02 / 03)."""
    cells = "".join(
        f'<td class="qgz-col" width="33%" valign="top" style="padding:0 8px 0 0;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="{C["ice"]}" style="background:{C["ice"]};border-radius:14px;padding:16px;">'
        f'<div style="font:400 22px/24px {DISPLAY};color:{C["blue"]};">{n}</div>'
        f'<div style="font:700 15px/20px {BODY};color:{C["ink"]};padding-top:8px;">{t}</div></td></tr></table></td>'
        for n, t in items)
    return f'<table role="presentation" class="qgz-stack" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px 0;"><tr>{cells}</tr></table>'


def button(region, label, href, align="left"):
    """Bulletproof pill button: gradient in modern clients, solid VML in Outlook."""
    return f"""
<tr><td class="qgz-pad" bgcolor="{C['white']}" style="background:{C['white']};padding:4px 32px 30px 32px;" align="{align}">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="qgz-btn"><tr><td align="center" mc:edit="{region}">
  <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{href}" style="height:50px;v-text-anchor:middle;width:260px;" arcsize="50%" stroke="f" fillcolor="{C['blue']}"><center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">{label}</center></v:roundrect><![endif]-->
  <!--[if !mso]><!--><a href="{href}" target="_blank" style="display:inline-block;background:{C['blue']};background-image:linear-gradient(135deg,{C['blue']} 0%,{C['indigo']} 100%);color:#FFFFFF;font:600 16px/20px {BODY};text-decoration:none;padding:15px 30px;border-radius:999px;mso-hide:all;">{label}</a><!--<![endif]-->
  </td></tr></table>
</td></tr>
"""


def closing(title, text):
    return f"""
<!-- CLOSING: lavender band with the Kids Chess / community statement -->
<tr><td class="qgz-pad" bgcolor="{C['lavender']}" style="background:{C['lavender']};padding:26px 32px;" mc:edit="closing">
  <div style="font:400 20px/26px {DISPLAY};color:{C['indigo']};">{title}</div>
  <div style="font:italic 400 16px/24px {BODY};color:{C['ink']};padding-top:8px;">{text}</div>
</td></tr>
"""


def footer(lang_note=""):
    """Join-panel style footer. Mailchimp merge tags provide unsubscribe,
    preferences (topics) and the audience's required contact line."""
    return f"""
<!-- FOOTER: deep indigo panel (Join section) -->
<tr><td class="qgz-pad" bgcolor="{C['indigo']}" style="background:{C['indigo']};background-image:linear-gradient(135deg,{C['indigo_deep']} 0%,{C['indigo']} 48%,{C['blue']} 100%);border-radius:0 0 18px 18px;padding:28px 32px 30px 32px;font:400 13px/20px {BODY};color:{C['lavender']};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="top" mc:edit="footer_main">
      <div style="font:400 16px/22px {DISPLAY};color:#FFFFFF;">Queen's Gambit Zürich</div>
      <div style="padding-top:4px;">Ein Ort, an dem Frauen Schach spielen. · A place for women to play chess.</div>
      <div style="padding-top:14px;">
        <a href="{SITE}/" target="_blank" style="color:#FFFFFF;font-weight:600;text-decoration:underline;">queensgambitzurich.ch</a>
        &nbsp;·&nbsp; <a href="https://www.instagram.com/queensgambitzurich/" target="_blank" style="color:#FFFFFF;font-weight:600;text-decoration:underline;">Instagram</a>
        &nbsp;·&nbsp; <a href="mailto:info@queensgambitzurich.ch" style="color:#FFFFFF;font-weight:600;text-decoration:underline;">info@queensgambitzurich.ch</a>
      </div>
    </td>
  </tr></table>
  <div style="border-top:1px solid rgba(255,255,255,.28);margin-top:20px;padding-top:16px;font:400 12px/19px {BODY};color:{C['lavender']};">
    Du erhältst diese E-Mail, weil du den Newsletter von Queen's Gambit Zürich abonniert hast. · You are receiving this email because you subscribed to the Queen's Gambit Zürich newsletter.<br>
    <a href="*|UPDATE_PROFILE|*" style="color:#FFFFFF;text-decoration:underline;">Themen ändern · Update topics</a>
    &nbsp;·&nbsp; <a href="*|UNSUB|*" style="color:#FFFFFF;text-decoration:underline;">Abmelden · Unsubscribe</a>
    &nbsp;·&nbsp; <a href="{SITE}/datenschutz/" style="color:#FFFFFF;text-decoration:underline;">Datenschutz · Privacy</a><br>
    *|LIST:ADDRESSLINE|*<br>
    © 2026 QGZ | Queen's Gambit Zürich
  </div>
</td></tr>
"""


def foot():
    return """
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
"""


# --------------------------------------------------------------------------
# 1. Master template (generic, reusable; every content area is mc:edit)
# --------------------------------------------------------------------------
def master():
    parts = [head("*|MC:SUBJECT|*", "Kurze Vorschau-Zeile · Short preview line"),
             header(),
             hero("Programm · Programme", "Titel der E-Mail", "Ein bis zwei Sätze, die erklären, worum es geht."),
             image(f"{SITE}/assets/brand/qgz-social-1200x630.jpg", "Queen's Gambit Zürich"),
             body_block("intro", eyebrow("Rubrik · Section") + h2("Abschnittstitel") +
                        "<p>Haupttext. Kurze Absätze, klare Sprache, ein Ziel pro E-Mail.</p>"),
             body_block("details",
                        sessions_table([["Sa 1. Jan", "09:00–10:00", "Programmpunkt"]], ["Datum", "Zeit", "Programm"]) +
                        facts([("Ort", "Name, Adresse"), ("Für", "Zielgruppe")]) +
                        panel("<strong>Hinweis:</strong> Kasten für wichtige Informationen."), top_rule=True),
             button("cta", "Mehr erfahren", f"{SITE}/"),
             closing("Schlusssatz.", "Optionales Zitat oder Abschluss."),
             footer(),
             foot()]
    return "".join(parts)


# --------------------------------------------------------------------------
# 2. Zollikon Kids Chess draft (DE first, EN below, content from the website)
# --------------------------------------------------------------------------
REG_URL = f"{SITE}/#kids"          # replace with the public Kids registration form link


def zollikon():
    de = (eyebrow("Kids Chess · Nächster Workshop") + h2("Schach für die nächste Generation") +
          "<p>Mehr als Champions. Für eine lebenslange Freude am Schach. An drei Vormittagen im Oktober lernen und spielen Kinder von 5 bis 13 Jahren gemeinsam Schach, mit eigenen Lernmaterialien, Spielen und Herausforderungen.</p>" +
          principles([("01", "Begeisterung zuerst"), ("02", "Jedes Kind kann wachsen"), ("03", "Ein Leben lang mit Schach verbunden")]))
    details = (sessions_table([
                  ["Sa 24. Okt", "09:30–11:30", "Lernen &amp; Entdecken"],
                  ["So 25. Okt", "09:30–11:30", "Üben &amp; Herausfordern"],
                  ["Sa 31. Okt", "09:00–12:00", "Turnier &amp; Preisverleihung"]], ["Datum", "Zeit", "Programm"]) +
               facts([("Ort", "Combi Face<br>Oberdorfstrasse 37, 8702 Zollikon"), ("Alter", "5–13 Jahre"), ("Gruppe", "Maximal 18 Kinder")]) +
               "<p><strong>Für Anfängerinnen und Anfänger:</strong> Vom ersten Zug bis zum ersten Schachmatt, mit interaktiven Spielen, Herausforderungen und eigenen Lernmaterialien.</p>"
               "<p><strong>Für Fortgeschrittene:</strong> Taktik und Entscheidungsfindung schärfen und das Gelernte dann in einem freundschaftlichen, nicht gewerteten Turnier anwenden.</p>" +
               panel("<strong>Inbegriffen:</strong> eigene Lernmaterialien, ein persönliches Arbeitsheft «Schachpass», gesunde Snacks, das Abschlussturnier und eine Teilnahmebestätigung.<br>"
                     "<strong>Sprache:</strong> Deutsch, bei Bedarf auch Englisch.<br>"
                     "<strong>Anmeldeschluss:</strong> Freitag, 23. Oktober, oder sobald alle Plätze vergeben sind.<br>"
                     "Die Plätze sind beschränkt. Eltern sind am 31. Oktober ab 11:30 herzlich zur Preisverleihung eingeladen."))
    en = (eyebrow("In English") +
          f'<h3 style="margin:0 0 10px 0;font:400 19px/24px {DISPLAY};color:{C["ink"]};">Zollikon Kids Chess Workshop</h3>' +
          "<p>Three mornings of chess for children aged 5–13 at Combi Face, Zollikon: Sat 24 Oct (09:30–11:30, Learn &amp; Discover), Sun 25 Oct (09:30–11:30, Practice &amp; Challenge) and Sat 31 Oct (09:00–12:00, Tournament &amp; Awards). Maximum 18 children; beginners and intermediate players are welcome.</p>"
          "<p>Included: original learning materials, a personal Chess Passport workbook, healthy snacks, the final tournament and a certificate of participation. Taught in German, with English where needed. Registration closes on Friday, 23 October, or when all places are taken. Parents are welcome to join from 11:30 on 31 October for the award ceremony.</p>")
    parts = [head("Zollikon Kids Chess", "Drei Schachvormittage für Kinder von 5 bis 13 Jahren · 24., 25. & 31. Oktober in Zollikon"),
             header(),
             hero("Kids Chess · Workshop", "Zollikon Kids Chess", "Drei Schachvormittage für Kinder von 5 bis 13 Jahren.<br>24., 25. &amp; 31. Oktober 2026 · Combi Face, Zollikon"),
             image(f"{SITE}/assets/photos/kids-chess-illustration.jpg", "Illustration von vier Kindern, die gemeinsam Schach spielen"),
             body_block("intro", de),
             body_block("details", details, top_rule=True),
             button("cta", "Jetzt anmelden", REG_URL),
             closing("Jeder Weg zählt.", "«Ob ein Kind davon träumt, Champion zu werden, oder einfach gerne Schach spielt: Wir sind überzeugt, dass jeder Weg Ermutigung, Anerkennung und die Chance verdient, zu wachsen.»"),
             body_block("english", en),
             button("cta_en", "Register now", REG_URL),
             footer(),
             foot()]
    return "".join(parts)


if __name__ == "__main__":
    (OUT / "qgz-master-template.html").write_text(master(), encoding="utf-8")
    (OUT / "zollikon-kids-chess-campaign.html").write_text(zollikon(), encoding="utf-8")
    print("written")


# --------------------------------------------------------------------------
# 3. Zollikon content per template region (for the campaign built from the
#    saved "QGZ Master Template" in Mailchimp; 11 regions)
# --------------------------------------------------------------------------
def simple_button(label, href):
    return (f'<a href="{href}" target="_blank" style="display:inline-block;background:{C["blue"]};'
            f'background-image:linear-gradient(135deg,{C["blue"]} 0%,{C["indigo"]} 100%);color:#FFFFFF;'
            f'font:600 16px/20px {BODY};text-decoration:none;padding:15px 30px;border-radius:999px;">{label}</a>')


def zollikon_regions():
    import json, re
    full = zollikon()
    def region(name):
        m = re.search(r'mc:edit="%s"[^>]*>(.*?)</(td|div|h1)>\n?' % name, full, re.S)
        return m.group(1).strip() if m else None
    intro = re.search(r'mc:edit="intro">\n(.*?)\n</td></tr>', full, re.S).group(1)
    details_de = re.search(r'mc:edit="details">\n(.*?)\n</td></tr>', full, re.S).group(1)
    english = re.search(r'mc:edit="english">\n(.*?)\n</td></tr>', full, re.S).group(1)
    regions = {
        "preheader": "Drei Schachvormittage für Kinder von 5 bis 13 Jahren · 24., 25. &amp; 31. Oktober in Zollikon",
        "header_label": "Kids Chess",
        "hero_badge": "Kids Chess · Workshop",
        "hero_title": "Zollikon Kids Chess",
        "hero_subtitle": "Drei Schachvormittage für Kinder von 5 bis 13 Jahren.<br>24., 25. &amp; 31. Oktober 2026 · Combi Face, Zollikon",
        "hero_image": f'<img src="{SITE}/assets/photos/kids-chess-illustration.jpg" width="600" alt="Illustration von vier Kindern, die gemeinsam Schach spielen" style="width:100%;max-width:600px;display:block;height:auto;">',
        "intro": intro,
        "details": details_de + f'<div style="height:26px;line-height:26px;font-size:1px;">&nbsp;</div><div style="border-top:1px solid {C["rule"]};height:26px;line-height:26px;font-size:1px;">&nbsp;</div>' + english +
                   f'<div style="padding-top:18px;">{simple_button("Register now", REG_URL)}</div>',
        "cta": simple_button("Jetzt anmelden", REG_URL),
        "closing": f'<div style="font:400 20px/26px {DISPLAY};color:{C["indigo"]};">Jeder Weg zählt.</div>'
                   f'<div style="font:italic 400 16px/24px {BODY};color:{C["ink"]};padding-top:8px;">«Ob ein Kind davon träumt, Champion zu werden, oder einfach gerne Schach spielt: Wir sind überzeugt, dass jeder Weg Ermutigung, Anerkennung und die Chance verdient, zu wachsen.»</div>',
    }
    return regions


if __name__ == "__main__":
    import json
    r = zollikon_regions()
    assert all(r.values()), [k for k, v in r.items() if not v]
    (OUT / "zollikon-regions.json").write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding="utf-8")
    print("regions:", list(r))
