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
FULLSTACK_ONLY=5 bash scripts/fullstack.sh checks # one check, for iterating / proving teeth
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

### 🛑 The zero-spend guard is OFF in this harness, and that is what makes the zeroes mean anything

R66's guard throws at the `fetch` boundary. An earlier version of this script set
`SAFE_TEST_MODE=1` as an obvious belt, and the real API did exactly what it should:

```
[icp] stage=provider_blocked — paid sourcing required (20 record(s)) but the zero-spend
      guard refused it; pool served 0.
```

Apollo was never called, so checks 4, 5 and 7 — all three of them checks *about* provider
calls — were unobtainable. Worse, `PDL_CALLS=0` and `HUNTER_CALLS=0` were zero because the
guard refuses **every** paid provider, Apollo included. A zero produced by a blanket refusal
says nothing whatsoever about FD-6, and it would have read on the page as though it did.

With the guard off, Apollo **is** called — repeatedly, through the same code path and the same
boundary — so PDL and Hunter staying at zero is a real, discriminating absence.

It cannot spend money, as a property rather than a promise: `assert_providers_are_loopback`
refuses the whole run unless all five provider base URLs are `127.0.0.1` **and** the
apollo/pdl/hunter fakes are answering there. Money leaves at the HTTP call; the HTTP call
cannot leave the machine, and every key is an obvious fake.

**The RED run is the one exception.** `FULLSTACK_RED=1` puts the guard back on, because a
pre-Batch-1 tree has no base-URL seam to redirect — its `apollo.ts` reads a hardcoded
`https://api.apollo.io/api/v1`, so the loopback variables would be ignored and a real call
would leave the box. RED's checks 4/5/7 therefore fail for two reasons at once — no seam *and*
a guard refusing paid calls — which is a weaker demonstration than a redirected one and the
correct trade.

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

It also answers **two Auth admin reads itself**, `GET /auth/v1/admin/users` and
`GET /auth/v1/admin/users/<id>`, straight out of `auth.users`. PostgREST cannot serve either,
and `audienceForClientStrict` — which decides *which provider a run is allowed to use* — asks
`getUserById` and **throws** when it cannot resolve an identity. Without them the entire MVP1
sourcing path is unreachable and checks 4, 5 and 7 cannot run at all. There is no login, no
password, no token, no session, no GoTrue. ⚠️ **This is beyond Batch 1b's literally permitted
component list and is reported as such** — the alternative was mocking the answer to the one
question that selects the provider, which is not acceptable evidence for FD-6.

⚠️ **The two shapes are not interchangeable.** `gotrue-js` passes the single-user body through
as `data.user`, so answering `/users/<id>` with the collection's `{users:[…]}` yields an object
with no `email` — and the product correctly refused to guess an audience and stopped the run.
The harness looked like a product bug for a whole run. The single-user route is matched first,
and any other `/auth/v1/**` path is refused with a loud 501 rather than forwarded.

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

## Reproducing the RED run

`FULLSTACK_TREE` boots a different checkout's **product** while the **harness** still comes
from this repo (`$REPO` for the scripts, `$TREE` for the API/portal/admin) — otherwise a RED
run would need a harness that does not exist at that commit. A fresh `git worktree` has no
`node_modules` and no builds, so four things have to exist first:

```bash
git worktree add /tmp/kind-red <pre-batch-1-sha>
cp -al node_modules /tmp/kind-red/node_modules          # hardlinks: ~0 extra disk
for d in apps/api apps/portal apps/admin packages/db packages/shared; do
  cp -al "$d/node_modules" "/tmp/kind-red/$d/node_modules"
done
( cd /tmp/kind-red/packages/shared && npx tsc )         # @kind/shared's .d.ts
( cd /tmp/kind-red/packages/db     && npx tsc )         # @kind/db's .d.ts
( cd /tmp/kind-red/apps/portal && npx next build )
( cd /tmp/kind-red/apps/admin  && npx next build )
FULLSTACK_RED=1 FULLSTACK_TREE=/tmp/kind-red bash scripts/fullstack.sh
```

⚠️ **`cp -al` is load-bearing, not an optimisation.** The `@kind/*` entries in `node_modules`
are *relative* symlinks (`@kind/shared -> ../../packages/shared`), so a hardlink copy makes
them resolve into the RED tree's own packages. Symlinking the directory instead would point
every workspace import back at *this* repo's code — and since Batch 1 changed
`packages/shared`, the RED run would have been silently running Batch 1 code.

⚠️ **The database is seeded by this repo's `realdb.sh` and migrations**, so the RED product
runs against the post-Batch-1 *schema*. That is deliberate — it isolates the RED result to
missing PRODUCT behaviour rather than a missing table — but it means a RED run is not a
statement about that commit's schema.

⚠️ **And it is why check 6 PASSES at RED.** The free-Proof record ceiling held at the
pre-Batch-1 commit only because `try_reserve_proof_records` was already in the database the
harness had seeded — the same run's check 10 proves that commit has no
`20260917_proof_fence_in_records.sql` at all. A RED pass here is a fact about the seeded
schema, not evidence that the old product had the fence. Read it that way.

## Adding a check

`scripts/fullstack/checks.mjs`. Return `ok(n, detail)` or `bad(n, detail)`; use `note(text)`
for something found but out of scope. State is read with `pg` directly, exactly as the real-DB
suite does, because reading it back through the product would be asserting the product against
itself.

**A check that cannot establish its fact reports FAIL with the reason** — never "probably
fine". Two checks found real defects on their first run and say so in their own output.
