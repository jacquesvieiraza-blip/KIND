import os, re, sys, json
ROOT = '/home/user/KIND'
os.chdir(ROOT)

# Seeds = the real entry points a running system starts from.
seeds = []
seeds += ['apps/api/src/index.ts', 'apps/api/src/cron.ts']
for base, pat in [('apps/portal/src/app/(milla)', None), ('apps/admin/src/app/vida', None)]:
    for dp, dn, fn in os.walk(base):
        for f in fn:
            if f in ('page.tsx','layout.tsx','route.ts'):
                seeds.append(os.path.join(dp, f))
for extra in ['apps/portal/src/middleware.ts','apps/admin/src/middleware.ts',
              'apps/portal/middleware.ts','apps/admin/middleware.ts']:
    if os.path.exists(extra): seeds.append(extra)
# The proxy Vida talks to the API through
for dp, dn, fn in os.walk('apps/admin/src/app/api'):
    for f in fn:
        if f == 'route.ts': seeds.append(os.path.join(dp, f))
for dp, dn, fn in os.walk('apps/portal/src/app/api'):
    for f in fn:
        if f == 'route.ts': seeds.append(os.path.join(dp, f))

seeds = [s for s in seeds if os.path.exists(s)]

IMPORT_RE = re.compile(r"""(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]""")
EXTS = ['.ts', '.tsx', '.js', '.jsx']

def resolve(spec, fromfile):
    cands = []
    if spec.startswith('.'):
        base = os.path.normpath(os.path.join(os.path.dirname(fromfile), spec))
        cands.append(base)
    elif spec.startswith('@/'):
        # @/ maps to <app>/src/
        parts = fromfile.split(os.sep)
        if len(parts) >= 2 and parts[0] == 'apps':
            cands.append(os.path.join('apps', parts[1], 'src', spec[2:]))
    elif spec.startswith('@kind/'):
        pkg = spec.split('/')[1]
        rest = spec[len('@kind/'+pkg):].lstrip('/')
        cands.append(os.path.join('packages', pkg, 'src', rest or 'index'))
    else:
        return None
    for c in cands:
        for e in EXTS:
            if os.path.isfile(c + e): return c + e
        for e in EXTS:
            idx = os.path.join(c, 'index' + e)
            if os.path.isfile(idx): return idx
        if os.path.isfile(c): return c
    return None

seen, queue, unresolved = set(), list(seeds), set()
while queue:
    f = queue.pop()
    if f in seen or not os.path.isfile(f): continue
    seen.add(f)
    try: src = open(f, encoding='utf-8', errors='ignore').read()
    except Exception: continue
    for spec in IMPORT_RE.findall(src):
        r = resolve(spec, f)
        if r:
            if r not in seen: queue.append(r)
        elif spec.startswith('.') or spec.startswith('@/') or spec.startswith('@kind/'):
            unresolved.add((f, spec))

core = sorted(x for x in seen if not x.endswith('.test.ts') and not x.endswith('.test.tsx'))
tests = sorted(x for x in seen if x.endswith('.test.ts') or x.endswith('.test.tsx'))
def lines(fs):
    t = 0
    for f in fs:
        try: t += sum(1 for _ in open(f, encoding='utf-8', errors='ignore'))
        except Exception: pass
    return t
json.dump({'seeds': sorted(seeds), 'core': core, 'tests': tests,
           'unresolved': sorted(list(unresolved))[:40],
           'core_lines': lines(core)},
          open('/tmp/claude-0/-home-user-KIND/87788db2-1014-56fb-89e2-99fbb3121686/scratchpad/trace.json','w'), indent=1)
print('seeds:', len(seeds), '| core files:', len(core), '| core lines:', lines(core), '| unresolved specs:', len(unresolved))
