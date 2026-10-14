#!/usr/bin/env python3
"""Zollikon Kids Chess campaign, v2 (light Kids Chess look).

Campaign-only layout: the reusable "QGZ Master Template" stays unchanged.
Visual reference: the Kids Chess section of queensgambitzurich.ch
(white / ice backgrounds, soft blue accents, touches of yellow, rounded
cards). Content reference: the 4 Oct 2026 parent email + website.
Pricing is deliberately left out (still under review).
Email-safe: tables, inline styles, 600px, VML buttons for Outlook,
system font fallbacks, no remote fonts.
"""
import pathlib

OUT = pathlib.Path(__file__).parent
SITE = "https://queensgambitzurich.ch"
REG = "https://forms.gle/7hB3VTcpPQPC6QsGA"     # Zollikon registration form (from the 4 Oct email)

INK, MUTED = "#202334", "#4E5470"
BLUE, ELECTRIC, INDIGO = "#0070B4", "#1479FF", "#3949AB"
ICE, ICE2, LINE = "#EAF3FF", "#F5F8FF", "#DCE6F7"
YELLOW, YELLOW_SOFT = "#F5B82E", "#FFF4D6"
DISPLAY = "'Archivo Black','Arial Black',Arial,Helvetica,sans-serif"
BODY = "Inter,'Segoe UI',Helvetica,Arial,sans-serif"


def button(label, href):
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn-wrap"><tr><td align="center" bgcolor="{BLUE}" style="border-radius:999px;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{href}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" stroke="f" fillcolor="{BLUE}"><center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">{label}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="{href}" target="_blank" style="display:inline-block;background:{BLUE};background-image:linear-gradient(135deg,{BLUE} 0%,{ELECTRIC} 100%);color:#FFFFFF;font:700 17px/22px {BODY};text-decoration:none;padding:15px 38px;border-radius:999px;mso-hide:all;">{label}&nbsp;&rarr;</a><!--<![endif]-->
</td></tr></table>"""


def eyebrow(text, color=INDIGO):
    return (f'<div style="font:700 12px/16px {BODY};letter-spacing:1.6px;text-transform:uppercase;color:{color};">'
            f'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:{ELECTRIC};margin-right:8px;vertical-align:1px;"></span>{text}</div>')


def schedule(rows, label_date):
    """Three rounded rows: blue date chip + time + session name."""
    out = []
    for day, date, time, name in rows:
        out.append(f"""<tr><td style="padding:0 0 10px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="{ICE2}" style="background:{ICE2};border:1px solid {LINE};border-radius:16px;padding:12px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="64" valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid {LINE};border-radius:12px;width:56px;padding:6px 0;">
<div style="font:700 11px/14px {BODY};letter-spacing:1px;text-transform:uppercase;color:{BLUE};">{day}</div>
<div style="font:400 20px/24px {DISPLAY};color:{INK};">{date}</div></td></tr></table></td>
<td valign="middle" style="padding-left:14px;">
<div style="font:700 16px/22px {BODY};color:{INK};">{name}</div>
<div style="font:400 14px/20px {BODY};color:{MUTED};">{time}</div></td>
</tr></table></td></tr></table></td></tr>""")
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{"".join(out)}</table>'


def facts(items):
    cells = "".join(
        f'<td class="col" width="{100 // len(items)}%" valign="top" style="padding:0 10px 0 0;">'
        f'<div style="font:700 11px/16px {BODY};letter-spacing:1.2px;text-transform:uppercase;color:{BLUE};">{k}</div>'
        f'<div style="font:600 15px/21px {BODY};color:{INK};padding-top:3px;">{v}</div></td>' for k, v in items)
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{cells}</tr></table>'


def levels(items):
    cells = "".join(
        f'<td class="col" width="50%" valign="top" style="padding:0 {6 if i == 0 else 0}px 0 {0 if i == 0 else 6}px;">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border:1px solid {LINE};border-radius:16px;padding:16px;">'
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" bgcolor="{YELLOW_SOFT}" style="background:{YELLOW_SOFT};width:40px;height:40px;border-radius:50%;font:400 22px/40px Arial,sans-serif;color:{INDIGO};">{icon}</td></tr></table>'
        f'<div style="font:700 15px/21px {BODY};color:{INK};padding-top:10px;">{t}</div>'
        f'<div style="font:400 14px/21px {BODY};color:{MUTED};padding-top:4px;">{d}</div></td></tr></table></td>'
        for i, (icon, t, d) in enumerate(items))
    return f'<table role="presentation" class="stack" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{cells}</tr></table>'


def included(text):
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="{YELLOW_SOFT}" style="background:{YELLOW_SOFT};border-radius:16px;padding:14px 16px;font:400 14px/21px {BODY};color:{INK};">'
            f'<span style="color:{YELLOW};font-size:16px;">&#9733;</span>&nbsp; {text}</td></tr></table>')


def spacer(h):
    return f'<tr><td style="height:{h}px;line-height:{h}px;font-size:1px;">&nbsp;</td></tr>'


def section(inner, pad="0 32px"):
    return f'<tr><td class="pad" style="padding:{pad};">{inner}</td></tr>'


def lang_block(lang, d):
    rows = [
        section(f'<a name="{lang}" id="{lang}"></a>' + eyebrow(d["eyebrow"])),
        spacer(10),
        section(f'<h2 style="margin:0;font:400 24px/30px {DISPLAY};color:{INK};">{d["headline"]}</h2>'),
        spacer(10),
        section(f'<p style="margin:0;font:400 16px/25px {BODY};color:{MUTED};">{d["intro"]}</p>'),
        spacer(22),
        section(schedule(d["sessions"], d["date_label"])),
        spacer(12),
        section(facts(d["facts"])),
        spacer(22),
        section(levels(d["levels"])),
        spacer(14),
        section(included(d["included"])),
        spacer(26),
        section(button(d["cta"], REG)),
        spacer(10),
        section(f'<p style="margin:0;font:400 13px/20px {BODY};color:{MUTED};">{d["cta_note"]}</p>'),
        spacer(22),
        section(f'<p style="margin:0;font:400 15px/23px {BODY};color:{INK};">{d["signoff"]}<br><strong>Adela &amp; Noe</strong> · Queen\'s Gambit Zürich</p>'),
    ]
    return "".join(rows)


def compact_block(lang, d):
    """Second language: same facts, compact (no repeated cards)."""
    rows = "".join(
        f'<tr><td style="padding:7px 0;border-bottom:1px solid {LINE};font:700 14px/20px {BODY};color:{BLUE};width:70px;">{day} {date}</td>'
        f'<td style="padding:7px 0;border-bottom:1px solid {LINE};font:600 14px/20px {BODY};color:{INK};">{name}</td>'
        f'<td align="right" style="padding:7px 0;border-bottom:1px solid {LINE};font:400 14px/20px {BODY};color:{MUTED};white-space:nowrap;">{time}</td></tr>'
        for day, date, time, name in d["sessions"])
    body = (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="{ICE2}" style="background:{ICE2};border:1px solid {LINE};border-radius:20px;padding:22px 22px 24px 22px;">'
            f'<a name="{lang}" id="{lang}"></a>' + eyebrow(d["eyebrow"]) +
            f'<h2 style="margin:10px 0 8px 0;font:400 21px/27px {DISPLAY};color:{INK};">{d["headline"]}</h2>'
            f'<p style="margin:0 0 14px 0;font:400 15px/23px {BODY};color:{MUTED};">{d["intro"]}</p>'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">{rows}</table>'
            f'<p style="margin:0 0 6px 0;font:400 14px/21px {BODY};color:{INK};"><strong>{d["where_line"]}</strong></p>'
            f'<p style="margin:0 0 6px 0;font:400 14px/21px {BODY};color:{INK};">{d["levels_line"]}</p>'
            f'<p style="margin:0 0 18px 0;font:400 14px/21px {BODY};color:{INK};"><span style="color:{YELLOW};">&#9733;</span> {d["included"]}</p>'
            + button(d["cta"], REG) +
            f'<p style="margin:12px 0 0 0;font:400 13px/20px {BODY};color:{MUTED};">{d["cta_note"]}<br>{d["signoff"]} <strong style="color:{INK};">Adela &amp; Noe</strong></p>'
            '</td></tr></table>')
    return section(body)


DE = dict(
    eyebrow="Deutsch",
    headline="Vom ersten Zug bis zum ersten Turnier!",
    intro="Liebe Eltern, im Oktober gibt es drei Schachvormittage in Zollikon: für Kinder, die gerade ihre ersten Züge machen, und für junge Spielerinnen und Spieler, die bereit für die nächste Herausforderung sind.",
    date_label="Datum",
    sessions=[("Sa", "24", "09:30–11:30", "Lernen &amp; Entdecken"),
              ("So", "25", "09:30–11:30", "Üben &amp; Herausfordern"),
              ("Sa", "31", "09:00–12:00", "Turnier &amp; Preisverleihung")],
    facts=[("Ort", "Combi Face<br>Oberdorfstrasse 37, Zollikon"), ("Alter", "5–13 Jahre"), ("Gruppe", "max. 18 Kinder")],
    levels=[("&#9823;", "Für Anfänger", "Vom ersten Zug bis zum ersten Schachmatt, mit interaktiven Spielen."),
            ("&#9822;", "Für Fortgeschrittene", "Taktik schärfen und zum Abschluss ein freundliches Turnier.")],
    included="<strong>Inklusive:</strong> Lernmaterialien, persönlicher Schach-Pass, gesunde Snacks, Abschlussturnier und Teilnahmeurkunde. Unterricht auf Deutsch, bei Bedarf auch auf Englisch.",
    cta="Jetzt anmelden",
    cta_note="Die Plätze sind beschränkt. Eltern sind am 31. Oktober ab 11:30 zur Preisverleihung eingeladen.",
    signoff="Wir freuen uns auf drei spannende Schachvormittage!",
)

EN = dict(
    eyebrow="English",
    headline="From the first move to the first tournament!",
    intro="Dear parents, three chess mornings in Zollikon this October, for beginners and for young players ready for their next challenge.",
    sessions=[("Sat", "24", "09:30–11:30", "Learn &amp; Discover"),
              ("Sun", "25", "09:30–11:30", "Practice &amp; Challenge"),
              ("Sat", "31", "09:00–12:00", "Tournament &amp; Awards")],
    where_line="Combi Face, Oberdorfstrasse 37, Zollikon · ages 5–13 · max. 18 children",
    levels_line="<strong>Beginners:</strong> first move to first checkmate, through games. <strong>Intermediate:</strong> sharper tactics and a friendly, unrated tournament.",
    included="Included: learning materials, a personal Chess Passport, healthy snacks, the final tournament and a certificate. Taught in German, English when needed.",
    cta="Register now",
    cta_note="Places are limited. Parents are welcome from 11:30 on 31 October for the award ceremony.",
    signoff="See you at the chessboard!",
)


def build():
    return f"""<!doctype html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>*|MC:SUBJECT|*</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table,td,div,p,a,h1,h2{{font-family:Arial,Helvetica,sans-serif !important;}}</style><![endif]-->
<style>
  body{{margin:0;padding:0;width:100% !important;background:{ICE};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}}
  table{{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}}
  img{{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;display:block;height:auto;}}
  a{{color:{BLUE};}}
  @media screen and (max-width:620px){{
    .wrap{{width:100% !important;}}
    .pad{{padding-left:20px !important;padding-right:20px !important;}}
    .hero-title{{font-size:30px !important;line-height:34px !important;}}
    .col{{display:block !important;width:100% !important;padding:0 0 12px 0 !important;}}
    .stack .col{{padding:0 0 10px 0 !important;}}
    .btn-wrap{{width:100% !important;}}
    .btn-wrap a{{display:block !important;text-align:center !important;}}
  }}
</style>
</head>
<body style="margin:0;padding:0;background:{ICE};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:{ICE};">Drei Schachvormittage für Kinder (5–13) in Zollikon · 24., 25. &amp; 31. Oktober · English below&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{ICE}" style="background:{ICE};">
<tr><td align="center" style="padding:20px 10px 28px 10px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

<!-- Brand bar -->
<tr><td class="pad" style="padding:4px 12px 16px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="middle"><a href="{SITE}/" target="_blank"><img src="{SITE}/assets/brand/qgz-logo.png" width="38" alt="Queen's Gambit Zürich" style="width:38px;display:inline-block;vertical-align:middle;"></a>
      <a href="{SITE}/" target="_blank"><img src="{SITE}/assets/brand/qgz-wordmark-line.png" width="150" alt="QUEEN'S GAMBIT ZÜRICH" style="width:150px;display:inline-block;vertical-align:middle;margin-left:10px;"></a></td>
    <td align="right" valign="middle" style="font:600 13px/18px {BODY};color:{MUTED};white-space:nowrap;"><a href="#de" style="color:{BLUE};text-decoration:none;">DE</a> &nbsp;·&nbsp; <a href="#en" style="color:{BLUE};text-decoration:none;">EN</a></td>
  </tr></table>
</td></tr>

<!-- Main card -->
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:24px;border:1px solid #FFFFFF;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

{spacer(30)}
{section(eyebrow("Kids Chess · Workshop"))}
{spacer(12)}
{section(f'<h1 class="hero-title" style="margin:0;font:400 36px/40px {DISPLAY};color:{INK};letter-spacing:-.3px;">ZOLLIKON KIDS CHESS <span style="color:{YELLOW};">&#9733;</span></h1>')}
{spacer(10)}
{section(f'<p style="margin:0;font:600 17px/25px {BODY};color:{BLUE};">24., 25. &amp; 31. Oktober 2026 · Combi Face, Zollikon<br><span style="font-weight:400;color:{MUTED};">24, 25 &amp; 31 October 2026 · for children aged 5–13</span></p>')}
{spacer(22)}
<tr><td class="pad" style="padding:0 32px;"><img src="{SITE}/assets/photos/kids-chess-illustration.jpg" width="536" alt="Illustration: Kinder spielen gemeinsam Schach · children playing chess together" style="width:100%;max-width:536px;border-radius:18px;"></td></tr>
{spacer(30)}

<!-- Deutsch -->
{lang_block("de", DE)}
{spacer(34)}

<!-- English (compact) -->
{compact_block("en", EN)}
{spacer(32)}

</table>
</td></tr>

<!-- Footer (light) -->
<tr><td class="pad" align="center" style="padding:26px 24px 8px 24px;font:400 12px/19px {BODY};color:{MUTED};">
  <a href="{SITE}/" target="_blank"><img src="{SITE}/assets/brand/qgz-logo.png" width="34" alt="QGZ" style="width:34px;margin:0 auto 10px auto;"></a>
  <a href="{SITE}/" target="_blank" style="color:{BLUE};font-weight:600;text-decoration:none;">queensgambitzurich.ch</a> &nbsp;·&nbsp;
  <a href="https://www.instagram.com/queensgambitzurich/" target="_blank" style="color:{BLUE};font-weight:600;text-decoration:none;">Instagram</a> &nbsp;·&nbsp;
  <a href="mailto:info@queensgambitzurich.ch" style="color:{BLUE};font-weight:600;text-decoration:none;">info@queensgambitzurich.ch</a><br><br>
  Du erhältst diese E-Mail, weil du den Newsletter von Queen's Gambit Zürich abonniert hast.<br>You are receiving this email because you subscribed to the Queen's Gambit Zürich newsletter.<br>
  <a href="*|UPDATE_PROFILE|*" style="color:{MUTED};">Themen ändern · Update topics</a> &nbsp;·&nbsp; <a href="*|UNSUB|*" style="color:{MUTED};">Abmelden · Unsubscribe</a> &nbsp;·&nbsp; <a href="{SITE}/datenschutz/" style="color:{MUTED};">Datenschutz · Privacy</a><br>
  *|LIST:ADDRESSLINE|*<br>© 2026 QGZ | Queen's Gambit Zürich
</td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
"""


if __name__ == "__main__":
    import re
    html = build()
    def sep(m):
        tag = m.group(0)
        if 'style="' in tag:
            return tag.replace('style="', 'style="border-collapse:separate;', 1)
        return tag[:-1] + ' style="border-collapse:separate;">'
    html = re.sub(r'<table role="presentation"[^>]*>', sep, html)
    assert "CHF" not in html and "ß" not in html
    (OUT / "zollikon-kids-chess-v2.html").write_text(html, encoding="utf-8")
    print(len(html))
