"""Parse the Supabase SQL with the real PostgreSQL grammar before pasting it into the editor.

    python tools/sqlcheck.py            # checks supabase/*.sql
    python tools/sqlcheck.py foo.sql

Uses pglast (libpg_query, the actual server parser), so a syntax error here is a syntax
error in Supabase. It also runs every plpgsql function body through the plpgsql parser.
It cannot check that columns or functions exist; that is what running it once tells you.
Install with:  pip install pglast
"""
import os, sys, glob

try:
    from pglast import parse_sql
    from pglast import parse_plpgsql
    from pglast.parser import ParseError
except ImportError:
    print('pglast is not installed. Run: pip install pglast')
    sys.exit(0)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def check(path):
    sql = open(path, encoding='utf-8').read()
    name = os.path.relpath(path, ROOT)
    try:
        stmts = parse_sql(sql)
    except ParseError as e:
        print(f'FAIL {name}: {e}')
        return 1
    fns = 0
    # Function bodies are opaque strings to the SQL grammar; parse the plpgsql ones too.
    for raw in split_statements(sql):
        body = strip_leading_comments(raw)
        low = body.lower()
        if 'language plpgsql' in low and low.startswith(('create or replace function', 'create function', 'do ')):
            try:
                parse_plpgsql(body)
                fns += 1
            except ParseError as e:
                head = body.splitlines()[0][:70]
                print(f'FAIL {name}: plpgsql body after "{head}": {e}')
                return 1
    print(f'ok   {name}: {len(stmts)} statements, {fns} plpgsql bodies')
    return 0

def strip_leading_comments(stmt):
    """Drop blank and -- comment lines so the statement keyword is first."""
    lines = stmt.splitlines()
    while lines and (not lines[0].strip() or lines[0].lstrip().startswith('--')):
        lines.pop(0)
    return chr(10).join(lines).strip()

def split_statements(sql):
    """Split on semicolons that are not inside a dollar-quoted block."""
    out, buf, tag, i = [], [], None, 0
    while i < len(sql):
        if tag is None and sql[i] == '$':
            j = sql.find('$', i + 1)
            if j != -1 and sql[i + 1:j].replace('_', '').isalnum() or (j != -1 and j == i + 1):
                tag = sql[i:j + 1]
                buf.append(tag); i = j + 1; continue
        elif tag is not None and sql.startswith(tag, i):
            buf.append(tag); i += len(tag); tag = None; continue
        if tag is None and sql[i] == ';':
            out.append(''.join(buf) + ';'); buf = []; i += 1; continue
        buf.append(sql[i]); i += 1
    if ''.join(buf).strip():
        out.append(''.join(buf))
    return out

files = sys.argv[1:] or sorted(glob.glob(os.path.join(ROOT, 'supabase', '*.sql')))
bad = sum(check(f) for f in files)
sys.exit(1 if bad else 0)
