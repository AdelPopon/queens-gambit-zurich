"""Shared helpers: split HTML into translatable text and attribute values."""
import re

TOKEN = re.compile(r"(<!--.*?-->|<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)", re.S | re.I)
ATTRS = ("alt", "aria-label", "title", "placeholder", "data-fallback-label", "content")
ATTR_RE = re.compile(r'\b(' + "|".join(ATTRS) + r')="([^"]*)"')
TRANSLATABLE_META = ("description", "og:title", "og:description", "og:image:alt", "twitter:title", "twitter:description")

def norm(s):
    return re.sub(r"\s+", " ", s).strip()

def has_words(s):
    return bool(re.search(r"[A-Za-zÄÖÜäöü]{2,}", s))

def iter_segments(html):
    """Yield ('text', value) and ('attr', name, value, tag) for translatable content."""
    for part in TOKEN.split(html):
        if not part:
            continue
        if part.startswith("<!--") or part.lower().startswith(("<script", "<style")):
            continue
        if part.startswith("<"):
            for m in ATTR_RE.finditer(part):
                name, val = m.group(1), m.group(2)
                if name == "content":
                    meta = re.search(r'\b(?:name|property)="([^"]+)"', part)
                    if not meta or meta.group(1) not in TRANSLATABLE_META:
                        continue
                if has_words(val):
                    yield ("attr", name, val, part)
        elif has_words(part):
            yield ("text", norm(part))
