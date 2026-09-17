# The full-stack pre-production harness (`scripts/fullstack.sh`)

**What it is.** The real API, the real portal and the real admin console, as separate
processes, against a disposable PostgreSQL reached through **real PostgREST**, with every
provider replaced by a recording fake. One command brings it up, runs the Batch 1b checks,
prints a per-check verdict plus `PDL_CALLS` / `HUNTER_CALLS`, and tears everything down.

```bash
bash scripts/fullstack.sh              # up → the ten checks → teardown   ← the usual one
bash scripts/fullstack.sh up           # up and leave it running
bash scripts/fullstack.sh checks       # checks against something already up
bash scripts/fullstack.sh down         # tear it down
FULLSTACK_KEEP=1 bash scripts/fullstack.sh      # run, then leave it up to inspect
FULLSTACK_TREE=<path> bash scripts/fullstack.sh # boot a DIFFERENT checkout (the RED run)
FULLSTACK_TESTS=1 bash scripts/check.sh         # as an opt-in gate stage
```

## Why it exists

`npx vitest run` proves logic against a mocked `supabase-js` and a mocked `fetch`. It cannot
prove a **seam**: a base URL, an HTTP status code, PostgREST's own error codes, a middleware
redirect, a process that refuses to boot. Contract §9.1 requires a cumulative full-stack run
after every batch; Fable's 18 Sep ruling scoped this one to Batch 1's items and failure
classes, with the complete 26-journey run remaining Batch 6's exit condition.

**The headline evidence is a pair of zeroes.** PDL and Hunter run with their **keys SET** and
their fakes **listening and answering 200**. If FD-6's code lock regressed, a call would
*succeed* and the product would carry on — only the counters would notice. A test that omits
the key proves nothing about a pasted key.

## It cannot touch production

Not as a promise — as a property:

- it never reads `DATABASE_URL`, `SUPABASE_DB_URL` or any `PG*` variable, and unsets them;
- the database is one `realdb.sh` created seconds earlier on loopback, and the script refuses
  to continue unless the URL is `127.0.0.1 … kind_test`;
- every provider base URL is `http://127.0.0.1:585xx`, asserted by check 0;
- every key it exports is an obvious fake, and every address is under `.invalid`
  (RFC 6761 — a reserved TLD that cannot resolve), so even a bug that bypassed a base URL
  could not reach a real recipient;
- teardown runs from a single `trap … EXIT`, so a failed check still stops eight listeners,
  four Node processes and the database.

## What is real, and what is a stand-in

| Component | What it is |
|---|---|
| API | **real** — compiled with `tsc` and run as `node dist/index.js`, the same command Railway runs |
| Portal / Admin | **real** — `next start` against the committed build |
| Database | **real PostgreSQL**, disposable (`scripts/realdb.sh`) |
| PostgREST | **real PostgREST 13.0.4**, pinned with a sha256 by `fetch-postgrest.sh` |
| Supabase gateway | a **path rewrite only** — see below |
| Apollo / PDL / Hunter / Stripe / Google / Resend / Anthropic | recording fakes on loopback |
| SMTP | a sink that completes the protocol and delivers nothing |
| GoTrue | **absent** — no Batch 1b check needs a browser session |

### The gateway is a path rewrite, not a PostgREST substitute

`supabase-js` addresses tables at `/rest/v1/<table>`; PostgREST serves them at `/<table>` and
has **no base-path option** (`postgrest --dump-config` offers `db-root-spec` and
`db-extra-search-path`, nothing that mounts the API under a prefix). Production Supabase
resolves this with Kong in front doing exactly this rewrite. `gateway.mjs` strips a leading
`/rest/v1`, forwards everything else **verbatim** — including `Authorization`, `apikey`,
`Prefer` and `Accept`, several of which *are* the semantics under test — and counts requests.

🛑 **It must never learn a PostgREST concept.** Fable's P1 ruling forbids a shim; if a future
edit makes this file parse a filter, translate an error or answer a request itself, the run's
evidence stops being about PostgREST.

### Authentication without GoTrue

PostgREST authorises by validating a JWT against its own secret and reading the `role` claim.
`mint-jwt.mjs` issues `service_role` and `anon` tokens from the harness secret, which is why
no GoTrue is needed. The secret is a literal in `fullstack.sh` and that is correct: it
authorises nothing but a database created seconds earlier and destroyed at teardown.

## Two things the harness needed that the repo did not have

1. **Supabase's table grants.** `bootstrap.sql` created the API roles but granted nothing on
   the tables, so every PostgREST request answered `permission denied for table clients`. In a
   real project `service_role` holds full table privileges. Added to `bootstrap.sql`, and
   re-applied by `realdb.sh` after the migration replay — default privileges do not cover
   tables the replay creates.
2. **`x-forwarded-proto: https` on every portal/admin request.** Both Next middlewares bump
   http → https at the entry point, honouring the header Railway's TLS terminator sets. Without
   it every request 308s to `https://localhost:<port>`. Sending it is what the production edge
   does; not sending it would test a configuration that never exists.

## What this run does NOT establish

- ⚠️ **Not the 26-journey run.** Batch 6's exit condition. This is the Batch-1-scoped run.
- ⚠️ **Not production-schema fidelity** — `scripts/realdb/README.md` § SCHEMA FIDELITY.
- ⚠️ **Not a browser test.** No GoTrue, no login, no browser-loss journeys (Batch 2).
- ⚠️ **Not RLS.** PostgREST connects as a superuser-owned pool and `service_role` is
  `bypassrls`, here and in Supabase. "An anonymous caller is refused" is not provable here.
- ⚠️ **Google Calendar is not redirected.** Its runtime path is the `googleapis` SDK, which
  takes endpoints from its own client options; the Google fake covers the probe surface only.
- ⚠️ **No PDL/Hunter *code path* is exercised, by design.** The counters prove absence, which
  is the contract's requirement; they do not test what those providers would have returned.

## Ports

All derived from `FULLSTACK_PORT_BASE` (default `58500`), so a stale process is a loud bind
failure rather than silent cross-talk:

```
+1 apollo   +2 pdl      +3 hunter    +10 stripe  +11 google  +12 resend
+13 anthropic  +14 smtp  +15 hang    +20 api     +21 portal  +22 admin
+23 admin-slow (ADMIN_API_UPSTREAM → the hang fake, for the 504 sub-case)
+98 gateway    +99 postgrest
```

## Adding a check

`scripts/fullstack/checks.mjs`. Return `ok(n, detail)` or `bad(n, detail)`; use `note(text)`
for something found but out of scope. State is read with `pg` directly, exactly as the real-DB
suite does, because reading it back through the product would be asserting the product against
itself.

**A check that cannot establish its fact reports FAIL with the reason** — never "probably
fine". Two checks found real defects on their first run and say so in their own output.
