#!/usr/bin/env python3
"""sitekit.py: the static site generator the send.sgit.ai sites share, standard library only.

Content lives in website/pages/ as markdown (or an HTML fragment) with front matter; the build writes www/: a full
page per source with the family chrome (header, nav, footer) injected so it cannot drift, a markdown twin beside every
page, llms.txt and llms-full.txt, sitemap.xml and robots.txt. website/site.json holds the site's name, host, nav and
footer; tools/version.json the version every page shows. Nothing is fetched at build time.
"""
import datetime
import html
import json
import re
import shutil

from pathlib import Path


ROOT  = Path(__file__).resolve().parents[1]
PAGES = ROOT / 'website' / 'pages'
WWW   = ROOT / 'www'


# --- front matter and markdown ---------------------------------------------------------------------------------------

def parse_front_matter(text):
    meta = {}
    if text.startswith('---\n'):
        end = text.find('\n---', 4)
        if end > 0:
            for line in text[4:end].splitlines():
                m = re.match(r'^([a-zA-Z_][\w-]*):\s*(.*)$', line)
                if m:
                    v = m.group(2).strip()
                    if v.startswith('[') and v.endswith(']'):
                        v = [x.strip().strip('"\'') for x in v[1:-1].split(',') if x.strip()]
                    elif len(v) >= 2 and v[0] == v[-1] and v[0] in '"\'':
                        v = v[1:-1]
                    meta[m.group(1)] = v
            text = text[end + 4:].lstrip('\n')
    return meta, text


RE_INLINE = re.compile(r'(`[^`]+`)|(!\[([^\]]*)\]\(([^)\s]+)\))|(\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\))|(\*\*(.+?)\*\*)|(\*(?!\s)(.+?)(?<!\s)\*)|(<(https?://[^>\s]+)>)')
RE_HEADING = re.compile(r'^(#{1,6})\s+(.+?)\s*(?:\{#([\w-]+)\})?\s*$')
RE_FENCE   = re.compile(r'^(`{3,})\s*(\w+)?\s*$')
RE_LIST    = re.compile(r'^(\s*)([-*]|\d+[.)])\s+(.*)$')
RE_TABLE_SEP = re.compile(r'^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$')
RE_SHOT    = re.compile(r'^!shot\s+(\S+)\s*\|\s*(\S*)\s*\|\s*(.*?)\s*(?:\|\s*(\w+))?\s*$')


def inline(text):
    out, pos = [], 0
    for m in RE_INLINE.finditer(text):
        out.append(html.escape(text[pos:m.start()], quote=False))
        if m.group(1):   out.append('<code>' + html.escape(m.group(1)[1:-1], quote=False) + '</code>')
        elif m.group(2): out.append(f'<img src="{html.escape(m.group(4))}" alt="{html.escape(m.group(3))}" loading="lazy">')
        elif m.group(5): out.append(f'<a href="{html.escape(m.group(7))}">{inline(m.group(6))}</a>')
        elif m.group(8): out.append('<strong>' + inline(m.group(9)) + '</strong>')
        elif m.group(10): out.append('<em>' + inline(m.group(11)) + '</em>')
        elif m.group(12): out.append(f'<a href="{html.escape(m.group(13))}">{html.escape(m.group(13))}</a>')
        pos = m.end()
    out.append(html.escape(text[pos:], quote=False))
    return ''.join(out)


def slug(text):
    s = re.sub(r'<[^>]+>', '', text).lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s or 'section'


def md_to_html(text, ctx=None):
    """A small, predictable markdown: headings (with {#anchor}), paragraphs, lists, fences, tables, quotes, rules,
    images, !shot figures, and raw HTML blocks (a line starting with <). Returns (html, headings)."""
    lines = text.split('\n')
    out, headings, i, n = [], [], 0, len(lines)
    para = []

    def flush():
        if para:
            out.append('<p>' + inline(' '.join(s.strip() for s in para)) + '</p>')
            para.clear()

    while i < n:
        line = lines[i]
        f = RE_FENCE.match(line)
        if f:
            flush(); fence, lang = f.group(1), f.group(2) or ''
            buf = []; i += 1
            while i < n and not lines[i].startswith(fence):
                buf.append(lines[i]); i += 1
            cls = f' class="language-{html.escape(lang)}"' if lang else ''
            out.append(f'<pre><code{cls}>' + html.escape('\n'.join(buf)) + '</code></pre>'); i += 1; continue
        if not line.strip():
            flush(); i += 1; continue
        h = RE_HEADING.match(line)
        if h:
            flush(); level = len(h.group(1)); body = inline(h.group(2)); anchor = h.group(3) or slug(h.group(2))
            headings.append((level, anchor, re.sub(r'<[^>]+>', '', body)))
            out.append(f'<h{level} id="{anchor}">{body}</h{level}>'); i += 1; continue
        s = RE_SHOT.match(line)
        if s:
            flush(); src = (s.group(2) or '') + s.group(1); cap = s.group(3)
            out.append(f'<figure class="shot"><img src="{html.escape(src)}" alt="{html.escape(cap)}" loading="lazy"><figcaption>{inline(cap)}</figcaption></figure>'); i += 1; continue
        if re.match(r'^(-{3,}|\*{3,})\s*$', line):
            flush(); out.append('<hr>'); i += 1; continue
        if line.startswith('>'):
            flush(); buf = []
            while i < n and lines[i].startswith('>'):
                buf.append(lines[i][1:].lstrip()); i += 1
            inner, _ = md_to_html('\n'.join(buf), ctx)
            out.append('<blockquote>' + inner + '</blockquote>'); continue
        if line.lstrip().startswith('<') and not line.lstrip().startswith('<http'):
            flush(); buf = []
            while i < n and lines[i].strip():
                buf.append(lines[i]); i += 1
            out.append('\n'.join(buf)); continue
        if '|' in line and i + 1 < n and RE_TABLE_SEP.match(lines[i + 1]):
            flush()
            cells = lambda r: [c.strip() for c in r.strip().strip('|').split('|')]
            head = cells(line); i += 2; rows = []
            while i < n and lines[i].strip().startswith('|') or (i < n and '|' in lines[i] and lines[i].strip()):
                rows.append(cells(lines[i])); i += 1
            t = ['<table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in head) + '</tr></thead><tbody>']
            for r in rows: t.append('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>')
            t.append('</tbody></table>'); out.append(''.join(t)); continue
        l = RE_LIST.match(line)
        if l:
            flush(); out.append(render_list(lines, i, len(l.group(1)))[0]); i = render_list(lines, i, len(l.group(1)))[1]; continue
        para.append(line); i += 1
    flush()
    return '\n'.join(out), headings


def render_list(lines, i, indent):
    n = len(lines); items = []; ordered = None
    while i < n:
        l = RE_LIST.match(lines[i])
        if not l or len(l.group(1)) < indent: break
        if len(l.group(1)) > indent:
            sub, i = render_list(lines, i, len(l.group(1)))
            if items: items[-1] += sub
            continue
        if ordered is None: ordered = l.group(2)[0].isdigit()
        text = l.group(3); i += 1
        while i < n and lines[i].strip() and not RE_LIST.match(lines[i]) and lines[i].startswith(' ' * (indent + 2)):
            text += ' ' + lines[i].strip(); i += 1
        items.append(inline(text))
    tag = 'ol' if ordered else 'ul'
    return f'<{tag}>' + ''.join(f'<li>{it}</li>' for it in items) + f'</{tag}>', i


def html_to_md(fragment):
    """A plain markdown reading of an HTML fragment, for the twin of a page authored as HTML."""
    s = fragment
    s = re.sub(r'<script\b.*?</script>', '', s, flags=re.S)
    s = re.sub(r'<style\b.*?</style>', '', s, flags=re.S)
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    for k in range(6, 0, -1):
        s = re.sub(rf'<h{k}[^>]*>(.*?)</h{k}>', lambda m: '\n' + '#' * k + ' ' + m.group(1).strip() + '\n', s, flags=re.S)
    s = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: f'[{m.group(2).strip()}]({m.group(1)})', s, flags=re.S)
    s = re.sub(r'<(strong|b)>(.*?)</\1>', r'**\2**', s, flags=re.S)
    s = re.sub(r'<(em|i)>(.*?)</\1>', r'*\2*', s, flags=re.S)
    s = re.sub(r'<code>(.*?)</code>', r'`\1`', s, flags=re.S)
    s = re.sub(r'<li[^>]*>(.*?)</li>', lambda m: '- ' + m.group(1).strip() + '\n', s, flags=re.S)
    s = re.sub(r'<(p|div|section|article|figure|figcaption|tr|table|ul|ol|blockquote|pre|header|footer|form|label)[^>]*>', '\n', s)
    s = re.sub(r'</(p|div|section|article|figure|figcaption|tr|table|ul|ol|blockquote|pre|header|footer|form|label)>', '\n', s)
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)
    s = re.sub(r'[ \t]+\n', '\n', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip() + '\n'


# --- the site --------------------------------------------------------------------------------------------------------

class Site:

    def __init__(self, root=ROOT):
        self.root    = root
        self.cfg     = json.loads((root / 'website' / 'site.json').read_text(encoding='utf-8'))
        self.version = json.loads((root / 'tools' / 'version.json').read_text(encoding='utf-8'))
        self.pages   = []

    # --- discovery

    def collect(self):
        self.pages = []
        for p in sorted((self.root / 'website' / 'pages').rglob('*')):
            if p.suffix not in ('.md', '.html') or p.name.startswith('_'): continue
            raw = p.read_text(encoding='utf-8')
            meta, body = parse_front_matter(raw)
            rel = p.relative_to(self.root / 'website' / 'pages').with_suffix('')
            if rel.name == 'index':
                parent = rel.parent.as_posix()
                url = '/' if parent == '.' else '/' + parent + '/'
            else:
                url = '/' + rel.as_posix() + '.html'
            out_html = rel.as_posix() + '.html'
            self.pages.append({'src': p, 'kind': p.suffix[1:], 'meta': meta, 'body': body, 'url': url, 'out': out_html, 'twin': rel.as_posix() + '.md',
                               'title': meta.get('title', rel.name), 'description': meta.get('description', meta.get('summary', '')), 'section': rel.parts[0] if len(rel.parts) > 1 else ''})
        self.pages.sort(key=lambda p: p['url'])
        return self.pages

    def articles(self):
        arts = [p for p in self.pages if p['url'].startswith('/articles/') and p['url'] != '/articles/' and p['kind'] == 'md' and p['meta'].get('date')]
        return sorted(arts, key=lambda p: (p['meta'].get('date', ''), p['meta'].get('time', '')), reverse=True)

    # --- rendering

    def render_body(self, page):
        if page['kind'] == 'html':
            return page['body'], []
        body = self.expand(page['body'])
        h, headings = md_to_html(body)
        if page['url'].startswith('/articles/') and page['meta'].get('date'):
            h = self.byline(page) + h
        return h, headings

    def expand(self, body):
        if '<!-- articles -->' in body: body = body.replace('<!-- articles -->', self.articles_index_md())
        if '<!-- versions -->' in body: body = body.replace('<!-- versions -->', self.versions_md())
        if '<!-- reality -->'  in body: body = body.replace('<!-- reality -->',  self.reality_md())
        if '<!-- releases -->' in body: body = body.replace('<!-- releases -->', self.releases_md())
        return body

    def versions_md(self):
        data = json.loads((self.root / 'website' / 'data' / 'versions.json').read_text(encoding='utf-8'))
        rows = ['| Version | Date | Kind | What changed, and why |', '|---|---|---|---|']
        for v in data['versions']:
            rows.append(f"| **{v['version']}** | {v['date']} | {v.get('kind', '')} | **{v['title']}.** {v['notes']} |")
        return '\n'.join(rows)

    def reality_md(self):
        f = self.root / 'website' / 'data' / 'features.json'
        if not f.exists(): return '*No features file.*'
        data = json.loads(f.read_text(encoding='utf-8'))
        out = [f"Generated from `website/data/features.json` on every build; audited {data.get('audited', '')} against the code. "
               "**If it is not listed here, it does not exist.** Status words: *shipped* (code, tests, served), *proposed* (described in a brief, no code), *absent* (asked about, not built, not planned yet)."]
        for section in data['sections']:
            out.append(f"\n## {section['title']}\n")
            out.append('| Feature | Status | Since | Evidence |')
            out.append('|---|---|---|---|')
            for ft in section['features']:
                out.append(f"| {ft['feature']} | <span class=\"sg-status sg-status-{ft['status']}\">{ft['status']}</span> | {ft.get('since', '')} | {ft.get('evidence', '')} |")
        counts = {}
        for section in data['sections']:
            for ft in section['features']: counts[ft['status']] = counts.get(ft['status'], 0) + 1
        out.append('\n**Counted, not remembered:** ' + ', '.join(f"{n} {k}" for k, n in sorted(counts.items())) + '.')
        return '\n'.join(out)

    def releases_md(self):
        rel = self.root / 'releases'
        if not rel.exists(): return ''
        import re as _re
        names = sorted((d.name for d in rel.iterdir() if d.is_dir() and _re.match(r'^v\d+\.\d+\.\d+$', d.name)), key=lambda v: tuple(int(x) for x in v[1:].split('.')), reverse=True)
        rows = ['| Release | Date | Files | Bytes | Manifest | README |', '|---|---|---|---|---|---|']
        for n in names:
            m = json.loads((rel / n / 'manifest.json').read_text(encoding='utf-8'))
            rows.append(f"| **{n}** | {m['date']} | {m['files']} | {m['bytes']:,} | [manifest.json](/{n}/manifest.json) | [README](/{n}/README.md) |")
        return '\n'.join(rows)

    def articles_index_md(self):
        rows = []
        for a in self.articles():
            m = a['meta']
            rows.append(f"- **[{m['title']}]({a['url']})**, {m.get('date', '')}, by {m.get('author', '')}. {m.get('summary', '')[:220].rsplit(' ', 1)[0]}…")
        return '\n'.join(rows) if rows else '*No articles yet.*'

    def byline(self, page):
        m = page['meta']
        author = f'<a href="{html.escape(m["author_url"])}">{html.escape(m["author"])}</a>' if m.get('author_url') else html.escape(m.get('author', ''))
        tags = ' '.join(f'<span class="tag">{html.escape(t)}</span>' for t in (m.get('tags') or []))
        summary = f'<p class="summary"><em><strong>Summary:</strong> {inline(m["summary"])}</em></p>' if m.get('summary') else ''
        return (f'<p class="byline">By {author} · {html.escape(m.get("date", ""))} · published with {html.escape(self.cfg["name"])} {html.escape(m.get("version", self.version["version"]))}'
                f' · <span class="status">{html.escape(m.get("status", "draft"))}</span></p><p class="tags">{tags}</p>{summary}')

    def nav_html(self, page):
        items = []
        for group in self.cfg['nav']:
            here = ' here' if page['url'].startswith(group['href']) and group['href'] != '/' else ''
            subs = ''.join(f'<a class="sl{" here" if page["url"] == s["href"] else ""}" href="{html.escape(s["href"])}">{html.escape(s["title"])}</a>' for s in group.get('items', []))
            if subs:
                items.append(f'<div class="ni ni-has"><a class="nl{here}" href="{html.escape(group["href"])}">{html.escape(group["title"])}<span class="caret">&#9662;</span></a><div class="sub">{subs}</div></div>')
            else:
                items.append(f'<div class="ni"><a class="nl{here}" href="{html.escape(group["href"])}">{html.escape(group["title"])}</a></div>')
        theme = ('<div class="ni ni-has ni-theme"><button class="nl" type="button" aria-haspopup="true">Theme<span class="caret">&#9662;</span></button><div class="sub" role="group" aria-label="Theme">'
                 '<button class="sl" type="button" data-theme-pick="night" aria-pressed="false"><b>Night</b><small>Dark, teal</small></button>'
                 '<button class="sl" type="button" data-theme-pick="day" aria-pressed="false"><b>Day</b><small>Light, teal</small></button>'
                 f'<small class="sub-note">Kept in this browser only, as <code>{html.escape(self.cfg["theme_key"])}</code>; nothing else is stored.</small></div></div>')
        return ''.join(items) + theme

    def chrome(self, page, body_html, headings):
        c, v = self.cfg, self.version
        title = page['title'] if page['url'] == '/' else f'{page["title"]}, {c["name"]}'
        desc  = page['description'] or c['description']
        crumbs = ''
        if page['url'] != '/':
            parts = [x for x in page['url'].split('/') if x]
            trail, acc = ['<a href="/">Home</a>'], ''
            for i, part in enumerate(parts):
                last = i == len(parts) - 1
                if last:
                    trail.append(html.escape(page['title'])); break
                acc += '/' + part
                sec = next((q for q in self.pages if q['url'] == acc + '/'), None)
                trail.append(f'<a href="{acc}/">{html.escape(sec["title"])}</a>' if sec else html.escape(part))
            crumbs = '<nav class="sg-crumbs" aria-label="Breadcrumb">' + ' / '.join(trail) + '</nav>'
        toc = ''
        hs = [h for h in headings if h[0] == 2]
        if len(hs) >= 3 and page['url'] != '/':
            toc = '<nav class="sg-toc" aria-label="On this page"><p>On this page</p><ul>' + ''.join(f'<li><a href="#{a}">{html.escape(t)}</a></li>' for _, a, t in hs) + '</ul></nav>'
        twin = '/' + page['twin']
        ver_badge = f'<a class="sg-badge ver" href="/versions/" data-version="{html.escape(v["version"])}" title="released {html.escape(v["date"])}">{html.escape(v["version"])}</a>'
        return f'''<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{html.escape(c['host'] + page['url'])}">
<link rel="alternate" type="text/markdown" href="{twin}">
<link rel="license" href="https://creativecommons.org/licenses/by/4.0/">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{html.escape(c['name'])}">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{html.escape(c['host'] + page['url'])}">
<script src="/assets/theme.js"></script>
<link rel="stylesheet" href="/assets/themes.css">
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/nav.js" defer></script>
{page['meta'].get('head', '')}
</head>
<body data-page="{html.escape(page['url'])}">
<header class="sg-header">
<nav class="site" aria-label="Site">
<div class="row">
<a class="brand" href="/">{html.escape(c['brand'][0])}<span>{html.escape(c['brand'][1])}</span></a>
<a class="parent" href="{html.escape(c['parent']['href'])}" title="{html.escape(c['parent']['title'])}">&#8599; part of <b>{html.escape(c['parent']['name'])}</b></a>
<span class="stage-pill">{html.escape(c['stage'])}</span>
{ver_badge}
<button class="nav-toggle" type="button" aria-expanded="false" aria-label="Menu">Menu</button>
<div class="nav-items">{self.nav_html(page)}</div>
</div>
</nav>
</header>
{crumbs}
<div class="sg-page{' with-toc' if toc else ''}">
<main id="main">
{body_html}
</main>
{toc}
</div>
<footer class="sg-footer">
<p>{html.escape(c['name'])} · {ver_badge} · released {html.escape(v['date'])} · <a href="/versions/">releases</a> · <a href="{twin}">markdown twin of this page</a> · <a href="/llms.txt">llms.txt</a> · <a href="{html.escape(c['source'])}">source</a> · <a href="{html.escape(c['parent']['href'])}">part of {html.escape(c['parent']['name'])}</a> · <a href="/about/participant/">who publishes this</a></p>
<p>{c['footer']}</p>
<p class="network">{c['network']}</p>
</footer>
</body>
</html>
'''

    def twin_text(self, page, body_html):
        c, v = self.cfg, self.version
        head = (f"# {page['title']}\n\n"
                + (f"> {page['description']}\n\n" if page['description'] else '')
                + f"*Source: <{c['host']}{page['url']}> · {c['name']} {v['version']} · this file is generated from the same content as the page, "
                  f"so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*\n\n---\n\n")
        if page['kind'] == 'md':
            body = self.expand(page['body'])
            if page['meta'].get('date'):
                m = page['meta']
                body = f"By {m.get('author', '')} · {m.get('date', '')} · {m.get('status', '')}\n\n" + (f"**Summary:** {m['summary']}\n\n" if m.get('summary') else '') + body
            body = re.sub(r'^!shot\s+(\S+)\s*\|\s*(\S*)\s*\|\s*(.*?)\s*(?:\|\s*\w+)?\s*$', lambda mm: f'![{mm.group(3)}]({mm.group(2)}{mm.group(1)})\n\n*{mm.group(3)}*', body, flags=re.M)
            return head + body.strip() + '\n'
        return head + html_to_md(body_html)

    # --- build

    def build(self, out=WWW):
        self.collect()
        if out.exists(): shutil.rmtree(out)
        out.mkdir(parents=True)
        shutil.copytree(self.root / 'website' / 'assets', out / 'assets')
        static = self.root / 'website' / 'static'
        if static.exists(): shutil.copytree(static, out, dirs_exist_ok=True)
        full = []
        for page in self.pages:
            body, headings = self.render_body(page)
            (out / page['out']).parent.mkdir(parents=True, exist_ok=True)
            (out / page['out']).write_text(self.chrome(page, body, headings), encoding='utf-8')
            twin = self.twin_text(page, body)
            (out / page['twin']).write_text(twin, encoding='utf-8')
            full.append(twin)
        (out / 'version.json').write_text(json.dumps(self.version) + '\n', encoding='utf-8')
        (out / 'llms.txt').write_text(self.llms_txt(), encoding='utf-8')
        (out / 'llms-full.txt').write_text(self.llms_txt() + '\n\n' + ('\n\n' + '=' * 78 + '\n\n').join(full), encoding='utf-8')
        (out / 'sitemap.xml').write_text(self.sitemap(), encoding='utf-8')
        (out / 'robots.txt').write_text(f"User-agent: *\nAllow: /\nSitemap: {self.cfg['host']}/sitemap.xml\n", encoding='utf-8')
        (out / '.nojekyll').write_text('', encoding='utf-8')
        if self.cfg.get('cname'): (out / 'CNAME').write_text(self.cfg['cname'] + '\n', encoding='utf-8')
        return self.pages

    def llms_txt(self):
        c, v = self.cfg, self.version
        lines = [f"# {c['name']}", '', f"> {c['description']}", '', f"Site version: {v['version']} ({v['date']}). {c['llms_intro']}", '',
                 'Every HTML page has a markdown twin at the same path with the extension swapped; links inside the markdown point at pages. '
                 'If your tooling cannot follow links, fetch /llms-full.txt: every page in one request.', '', '## Pages', '']
        for p in self.pages:
            lines.append(f"- [{p['title']}]({'/' + p['twin']}): {p['description']}")
        for extra in c.get('llms_extra', []):
            lines.append(f"- {extra}")
        return '\n'.join(lines) + '\n'

    def sitemap(self):
        today = self.version['date']
        urls = ''.join(f"<url><loc>{html.escape(self.cfg['host'] + p['url'])}</loc><lastmod>{today}</lastmod></url>" for p in self.pages)
        return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>\n'


if __name__ == '__main__':
    import sys
    s = Site(); pages = s.build()
    print(f'built {len(pages)} pages into {WWW.relative_to(ROOT)}')
