# -*- coding: utf-8 -*-
"""Build-time comment removal (used by tools/build.py; sources keep every comment).

  strip_css_comments(text)    /*…*/ out of CSS text — the shell's inline CSS (CORE-01 · step 0) and the pages' <style> elements.
  strip_page_comments(text)   <!--…--> out of a page document (src/pages/<Name>.dc.html) and /*…*/ out of its <style> elements.

Pages lose their comments and nothing else: every other byte, whitespace and indentation included, stays where it was (the line a
comment stood on stays, empty). The shell keeps its earlier rule (_cut): a comment alone on its line(s) takes that line with it.

  python3 tools/strip_comments.py page|css < input > output      (the unit tests drive the functions through this)"""
import re, sys

_NAME = re.compile(r'[A-Za-z0-9_%\\-]|[^\x00-\x7f]')
def _cut(t, s, e, out):
    """Drop t[s:e]. A comment alone on its lines takes its line with it; otherwise the text around it stays as it is, and a single
    space is put back only where removal would fuse two name characters into one token (1px/**/solid)."""
    ls = t.rfind('\n', 0, s) + 1; le = t.find('\n', e); le = len(t) if le < 0 else le
    if t[ls:s].strip() == '' and t[e:le].strip() == '':
        while out:
            last = out[-1].rstrip(' \t')
            if last: out[-1] = last; break
            out.pop()
        return le + 1 if le < len(t) else le
    if s > 0 and e < len(t) and _NAME.match(t[s - 1]) and _NAME.match(t[e]): out.append(' ')
    return e
def _drop(t, s, e, out):
    """Drop t[s:e] and nothing around it; the same single space where two name characters would otherwise fuse into one token."""
    if s > 0 and e < len(t) and _NAME.match(t[s - 1]) and _NAME.match(t[e]): out.append(' ')
    return e
def strip_css_comments(t, strict=True):
    """/*…*/ out of CSS text, string-aware: quoted strings and unquoted url(…) are copied untouched. strict (the shell's own CSS):
    an unterminated comment stops the build, and a comment alone on its line takes the line with it. strict=False (pages): an
    unterminated comment is left exactly as it is with everything after it, and only the comment's own characters go."""
    out, i, n = [], 0, len(t)
    while i < n:
        c = t[i]
        if c in '"\'':
            j = i + 1
            while j < n and t[j] != c and t[j] != '\n': j += 2 if t[j] == '\\' else 1
            out.append(t[i:j + 1]); i = j + 1
        elif c == '/' and t.startswith('/*', i):
            e = t.find('*/', i + 2)
            if e < 0:
                assert not strict, 'unterminated CSS comment'
                out.append(t[i:]); break
            i = (_cut if strict else _drop)(t, i, e + 2, out)
        elif t[i:i + 4].lower() == 'url(' and (i == 0 or not _NAME.match(t[i - 1])):
            k = i + 4
            while k < n and t[k] in ' \t\n': k += 1
            if k < n and t[k] in '"\'': out.append(t[i:k]); i = k
            else: e = t.find(')', k); e = n if e < 0 else e + 1; out.append(t[i:e]); i = e
        else: out.append(c); i += 1
    return ''.join(out)

# ── pages ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
# The scanner follows the HTML tokenizer closely enough to know where it is: text, a tag (with the attribute-value states, so a
# quoted or unquoted value is never read as markup), an element whose content is not markup (<script>, <style>, <textarea>, <title>
# …; <pre> is kept whole as well), or a {{ … }} template expression in text. It removes a comment only from text, and CSS comments
# only from the body of an HTML <style>. Wherever the reading would be uncertain (an unterminated comment, tag or raw element; a
# comment-like sequence inside a <script>; CDATA; <plaintext>; a {{ … }} that holds a comment opener) it stops and copies the rest
# of the document unchanged — leaving a comment in is always safe, taking a non-comment out never is.
_WS = ' \t\n\r\f'
_KEEP_PAGE_COMMENT = re.compile(r'<!--(?:BS_BOOT--|\[if|<!\[endif|\s*(?:sc-|dc-)|/?\$|\s*react-)')   # markers a runtime could read (none does today)
_VERBATIM = {'script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript', 'pre'}
_OPENER = re.compile(r'<|\{\{')
_MARKUP_START = re.compile(r'<[A-Za-z/!?]')
_TAG_NAME = re.compile(r'[^\s/>]*')
def _tag_end(t, i):
    """t[i:] continues a tag just after its name; the index just past its closing '>' (HTML attribute states), or -1."""
    n, st = len(t), 'b'
    while i < n:
        c = t[i]
        if st == 'v':                                   # before an attribute value
            if c in _WS: i += 1
            elif c in '"\'':
                e = t.find(c, i + 1)
                if e < 0: return -1
                i = e + 1; st = 'b'
            elif c == '>': return i + 1
            else: st = 'u'; i += 1
        elif st == 'u':                                 # unquoted value (quotes inside it are plain characters)
            if c == '>': return i + 1
            if c in _WS: st = 'b'
            i += 1
        elif c == '>': return i + 1
        elif st == 'b':                                 # before an attribute name
            if c not in _WS and c != '/': st = 'n'
            i += 1
        elif st == 'n':                                 # attribute name
            st = 'v' if c == '=' else 'b' if c == '/' else 'a' if c in _WS else 'n'; i += 1
        else:                                           # after an attribute name
            st = 'a' if c in _WS else 'v' if c == '=' else 'b' if c == '/' else 'n'; i += 1
    return -1
def strip_page_comments(t):
    out, i, n, foreign = [], 0, len(t), 0
    def rest(): out.append(t[i:]); return ''.join(out)
    while i < n:
        m = _OPENER.search(t, i)
        if not m: out.append(t[i:]); break
        out.append(t[i:m.start()]); i = m.start()
        if t[i] == '{':                                 # {{ … }} in text
            e = t.find('}}', i + 2)
            seg = t[i:e + 2] if e >= 0 else ''
            if '<!--' in seg: return rest()
            if not seg or _MARKUP_START.search(seg): out.append('{{'); i += 2      # not one expression for the runtime: read on as text
            else: out.append(seg); i = e + 2
        elif t.startswith('<!--', i):
            if t.startswith('>', i + 4) or t.startswith('->', i + 4): return rest()   # <!--> · <!---> (abruptly closed)
            e = t.find('-->', i + 4)
            if e < 0 or '--!>' in t[i + 4:e]: return rest()
            if _KEEP_PAGE_COMMENT.match(t, i): out.append(t[i:e + 3]); i = e + 3
            else: i = e + 3
        elif t.startswith('<!', i) or t.startswith('<?', i):   # doctype · bogus comment — kept
            e = t.find('>', i)
            if e < 0 or t.startswith('<![CDATA[', i): return rest()
            out.append(t[i:e + 1]); i = e + 1
        else:
            closing = t.startswith('</', i); k = i + (2 if closing else 1)
            if not (k < n and t[k].isascii() and t[k].isalpha()):
                if closing and k < n and t[k] != '>': return rest()               # </ + other: a bogus comment
                out.append(t[i:k]); i = k; continue                              # a lone '<' (or '</>') is text
            name_end = _TAG_NAME.match(t, k).end(); name = t[k:name_end].lower()
            e = _tag_end(t, name_end)
            if e < 0: return rest()
            out.append(t[i:e]); i = e
            self_closed = t[e - 2] == '/'
            if name in ('svg', 'math'):
                if closing: foreign = max(0, foreign - 1)
                elif not self_closed: foreign += 1
            elif closing or (foreign and self_closed): pass
            elif name == 'plaintext': return rest()
            elif name in _VERBATIM:
                c = re.compile('</' + name + r'(?=[\s/>])', re.I).search(t, i)
                if not c: return rest()
                body = t[i:c.start()]
                if name == 'script' and '<!--' in body: return rest()
                out.append(strip_css_comments(body, strict=False) if name == 'style' and not foreign else body); i = c.start()
    return ''.join(out)

if __name__ == '__main__':
    kind = sys.argv[1] if len(sys.argv) > 1 else ''
    assert kind in ('page', 'css'), __doc__
    src = sys.stdin.buffer.read().decode('utf-8')
    sys.stdout.buffer.write((strip_page_comments(src) if kind == 'page' else strip_css_comments(src, strict=False)).encode('utf-8'))
