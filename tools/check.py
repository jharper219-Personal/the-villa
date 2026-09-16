"""Static checks for the zero-build app. Run before every commit:  python tools/check.py

- every `import { a, b } from './x.js'` points at a file that exists and exports those names
- brackets, braces and parens balance in every module (template literals make this approximate,
  so it is a warning, not a failure)
- the service worker shell lists every module under src/ (qa.js is loaded on demand)
- no leftover references to the other game in user-facing strings
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
problems, warnings = [], []

def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

modules = {}
for dp, _, files in os.walk(SRC):
    for fn in files:
        if fn.endswith('.js'):
            p = os.path.join(dp, fn)
            modules[os.path.normpath(p)] = read(p)

EXPORT_RE = re.compile(r'^export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)', re.M)
EXPORT_LIST_RE = re.compile(r'^export\s*\{([^}]*)\}', re.M)
IMPORT_RE = re.compile(r'^import\s*(?:(\*\s+as\s+\w+)|\{([^}]*)\}|(\w+))?\s*(?:,\s*\{([^}]*)\})?\s*from\s*[\'"]([^\'"]+)[\'"]', re.M)

def exports_of(path):
    src = modules[path]
    names = set(EXPORT_RE.findall(src))
    for group in EXPORT_LIST_RE.findall(src):
        for part in group.split(','):
            part = part.strip()
            if part:
                names.add(part.split(' as ')[-1].strip())
    return names

for path, src in modules.items():
    rel = os.path.relpath(path, ROOT)
    for m in IMPORT_RE.finditer(src):
        star, named, default, named2, spec = m.groups()
        if not spec.startswith('.'):
            continue
        target = os.path.normpath(os.path.join(os.path.dirname(path), spec))
        if target not in modules:
            problems.append(f'{rel}: imports missing file {spec}')
            continue
        wanted = []
        for group in (named, named2):
            if group:
                wanted += [x.strip().split(' as ')[0].strip() for x in group.split(',') if x.strip()]
        have = exports_of(target)
        for name in wanted:
            if name not in have:
                problems.append(f'{rel}: `{name}` is not exported by {spec}')
    for a, b in (('{', '}'), ('(', ')'), ('[', ']')):
        if src.count(a) != src.count(b):
            warnings.append(f'{rel}: {a}{b} count differs by {src.count(a) - src.count(b)}')

sw = read(os.path.join(ROOT, 'sw.js'))
for path in modules:
    rel = './' + os.path.relpath(path, ROOT).replace('\\', '/')
    if rel == './src/qa.js':
        continue
    if f"'{rel}'" not in sw:
        problems.append(f'sw.js SHELL is missing {rel}')

for fn in ('index.html', 'manifest.webmanifest', 'README.md'):  # DEPLOY.md may name the other game on purpose
    p = os.path.join(ROOT, fn)
    if os.path.exists(p) and re.search(r'Gridiron|The Blitz', read(p)):
        problems.append(f'{fn}: mentions the other game')
for path, src in modules.items():
    for line in src.split('\n'):
        if re.search(r'gridiron|blitz', line, re.I) and 'window.villa' not in line:
            problems.append(f'{os.path.relpath(path, ROOT)}: leftover from the other game: {line.strip()[:80]}')

for w in warnings:
    print('warn ', w)
for p in problems:
    print('FAIL ', p)
print(f'{len(modules)} modules · {len(problems)} problems · {len(warnings)} warnings')
sys.exit(1 if problems else 0)
