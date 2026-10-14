#!/usr/bin/env python3
"""Zollikon Kids Chess campaign, v4 (targeted corrections to v3).

Structure: QGZ header → German box + button → illustration → English box +
button → light QGZ footer. Both language boxes share one layout (the compact
v2 English box). Sender voice: Queen's Gambit Zürich. No prices.
"""
import pathlib, re
import importlib.util

HERE = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location("v2", HERE / "build_zollikon_v2.py")
v2 = importlib.util.module_from_spec(spec); spec.loader.exec_module(v2)
from types import SimpleNamespace
K = SimpleNamespace(**{k: getattr(v2, k) for k in dir(v2) if k.isupper()})

SITE, REG = K.SITE, K.REG
INK, MUTED, BLUE, ELECTRIC, INDIGO = K.INK, K.MUTED, K.BLUE, K.ELECTRIC, K.INDIGO
ICE, ICE2, LINE, YELLOW = K.ICE, K.ICE2, K.LINE, K.YELLOW
DISPLAY, BODY = K.DISPLAY, K.BODY


def lang_box(d):
    rows = "".join(
        f'<tr><td style="padding:8px 0;border-bottom:1px solid {LINE};font:700 14px/20px {BODY};color:{BLUE};width:64px;white-space:nowrap;">{day}</td>'
        f'<td style="padding:8px 8px 8px 0;border-bottom:1px solid {LINE};font:600 14px/20px {BODY};color:{INK};">{name}</td>'
        f'<td align="right" style="padding:8px 0;border-bottom:1px solid {LINE};font:400 14px/20px {BODY};color:{MUTED};white-space:nowrap;">{time}</td></tr>'
        for day, name, time in d["sessions"])
    p = f"margin:0 0 8px 0;font:400 14px/21px {BODY};color:{INK};"
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="box" bgcolor="{ICE2}" style="background:{ICE2};border:1px solid {LINE};border-radius:20px;padding:26px 24px 26px 24px;">
{v2.eyebrow(d["label"])}
<h2 style="margin:12px 0 8px 0;font:400 22px/28px {DISPLAY};color:{INK};">{d["headline"]}</h2>
<p style="margin:0 0 16px 0;font:400 15px/23px {BODY};color:{MUTED};">{d["intro"]}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">{rows}</table>
<p style="{p}"><strong>{d["where"]}</strong></p>
<p style="{p}">{d["levels"]}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;"><tr><td bgcolor="{K.YELLOW_SOFT}" style="background:{K.YELLOW_SOFT};border:1px solid #F6E3A8;border-radius:14px;padding:14px 16px;">
<div style="font:700 12px/16px {BODY};letter-spacing:1.4px;text-transform:uppercase;color:{INDIGO};padding-bottom:4px;">{d["included_label"]}</div>
<div style="font:400 14px/21px {BODY};color:{INK};">{d["included"]}</div>
</td></tr></table>
{v2.button(d["cta"], REG)}
<p style="margin:12px 0 0 0;font:400 13px/20px {BODY};color:{MUTED};">{d["note"]}</p>
</td></tr></table>"""


DE = dict(
    label="Deutsch",
    headline="Vom ersten Zug bis zum ersten Turnier!",
    intro="Queen's Gambit Zürich lädt Kinder zu einem besonderen Schach-Workshop in Zollikon ein: drei Vormittage für Anfängerinnen und Anfänger und für junge Spielerinnen und Spieler mit Erfahrung.",
    sessions=[("Sa 24.", "Lernen &amp; Entdecken", "09:30–11:30"),
              ("So 25.", "Üben &amp; Herausfordern", "09:30–11:30"),
              ("Sa 31.", "Turnier &amp; Preisverleihung", "09:00–12:00")],
    where="Combi Face, Oberdorfstrasse 37, Zollikon · 5–13 Jahre · max. 18 Kinder",
    levels="<strong>Anfänger:</strong> vom ersten Zug bis zum ersten Schachmatt, mit Spielen. <strong>Fortgeschrittene:</strong> Taktik schärfen und ein freundliches, nicht gewertetes Turnier.",
    included_label="Inklusive",
    included="Lernmaterialien, persönlicher Schach-Pass, <strong>gesunde Snacks</strong>, Abschlussturnier und Teilnahmeurkunde. Unterricht auf Deutsch, bei Bedarf auf Englisch.",
    cta="Jetzt anmelden",
    note="Die Plätze sind beschränkt. Eltern sind am 31. Oktober ab 11:30 zur Preisverleihung eingeladen.",
)

EN = dict(
    label="English",
    headline="From the first move to the first tournament!",
    intro="Queen's Gambit Zürich invites young chess enthusiasts to a special workshop in Zollikon: three mornings for beginners and for young players with experience.",
    sessions=[("Sat 24", "Learn &amp; Discover", "09:30–11:30"),
              ("Sun 25", "Practice &amp; Challenge", "09:30–11:30"),
              ("Sat 31", "Tournament &amp; Awards", "09:00–12:00")],
    where="Combi Face, Oberdorfstrasse 37, Zollikon · ages 5–13 · max. 18 children",
    levels="<strong>Beginners:</strong> from the first move to the first checkmate, through games. <strong>Intermediate:</strong> sharpen tactics and play a friendly, unrated tournament.",
    included_label="Included",
    included="Learning materials, a personal Chess Passport, <strong>healthy snacks</strong>, the final tournament and a certificate. Taught in German, with English when needed.",
    cta="Register now",
    note="Places are limited. Parents are welcome from 11:30 on 31 October for the award ceremony.",
)


def sp(h):
    return f'<tr><td style="height:{h}px;line-height:{h}px;font-size:1px;">&nbsp;</td></tr>'


def row(inner, pad="0 28px"):
    return f'<tr><td class="pad" style="padding:{pad};">{inner}</td></tr>'


def build():
    head = v2.build().split('<body')[0]          # same <head> (styles, Outlook settings)
    head = head.replace(".stack .col", ".box{{padding:22px 18px !important;}}\n    .stack .col".replace("{{", "{").replace("}}", "}"))
    return head + f"""<body style="margin:0;padding:0;background:{ICE};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:{ICE};">Schach-Workshop für Kinder (5–13) in Zollikon · 24., 25. &amp; 31. Oktober · English below&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{ICE}" style="background:{ICE};">
<tr><td align="center" style="padding:20px 10px 28px 10px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

<!-- 1. Header -->
{sp(28)}
{row(f'''<a href="{SITE}/" target="_blank"><img src="{SITE}/assets/brand/qgz-logo.png" width="40" alt="Queen's Gambit Zürich" style="width:40px;display:inline-block;vertical-align:middle;"></a><a href="{SITE}/" target="_blank"><img src="{SITE}/assets/brand/qgz-wordmark-line.png" width="160" alt="QUEEN'S GAMBIT ZÜRICH" style="width:160px;display:inline-block;vertical-align:middle;margin-left:12px;"></a>''')}
{sp(26)}
{row(f'<h1 class="hero-title" style="margin:0;font:400 36px/40px {DISPLAY};color:{INK};letter-spacing:-.3px;">ZOLLIKON KIDS CHESS&nbsp;<img src="{SITE}/assets/brand/qgz-crown.png" width="44" height="34" alt="" style="display:inline-block;width:44px;height:34px;vertical-align:-2px;border:0;"></h1>')}
{sp(26)}

<!-- 2. Deutsch -->
{row(lang_box(DE))}
{sp(26)}

<!-- 3. Illustration -->
{row(f'<img src="{SITE}/assets/photos/kids-chess-illustration.jpg" width="544" alt="Illustration: Kinder spielen gemeinsam Schach · children playing chess together" style="width:100%;max-width:544px;border-radius:18px;">')}
{sp(26)}

<!-- 4. English -->
{row(lang_box(EN))}
{sp(28)}

</table>
</td></tr>

<!-- 5. Footer (light) -->
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


def finalize(html):
    def sep(m):
        tag = m.group(0)
        if 'style="' in tag:
            return tag.replace('style="', 'style="border-collapse:separate;', 1)
        return tag[:-1] + ' style="border-collapse:separate;">'
    return re.sub(r'<table role="presentation"[^>]*>', sep, html)


if __name__ == "__main__":
    html = finalize(build())
    for bad in ("CHF", "ß", "Adela", "Noe", 'href="#de"', 'href="#en"', "&#9733;", "Kids Chess · Workshop", "Oktober 2026<br>", "etwas Erfahrung", "some experience"):
        assert bad not in html, bad
    assert html.count(REG) == 4          # 2 buttons x (VML + link)
    assert "*|UNSUB|*" in html and "*|UPDATE_PROFILE|*" in html
    (HERE / "zollikon-kids-chess-v4.html").write_text(html, encoding="utf-8")
    print(len(html))
