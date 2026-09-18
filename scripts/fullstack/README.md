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
classes. ⛓️ **18 Sep — that scoping is history: this is now the COMPLETE run**, walking all 26
journeys and all 14 failure classes, with `coverage.mjs` enforcing the table rather than
printing it.

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
| GoTrue | **absent** — three read-only Auth endpoints only (below); no login, no token issuance |

### The gateway is a path rewrite, not a PostgREST substitute

`supabase-js` addresses tables at `/rest/v1/<table>`; PostgREST serves them at `/<table>` and
has **no base-path option** (`postgrest --dump-config` offers `db-root-spec` and
`db-extra-search-path`, nothing that mounts the API under a prefix). Production Supabase
resolves this with Kong in front doing exactly this rewrite. `gateway.mjs` strips a leading
`/rest/v1`, forwards everything else **verbatim** — including `Authorization`, `apikey`,
`Prefer` and `Accept`, several of which *are* the semantics under test — and counts requests.

It also answers **exactly three read-only Auth endpoints itself** — authorised by Fable's
C-8/C-10 ruling of 17 Sep — straight out of `auth.users`:

| Endpoint | Product caller | Why PostgREST can't serve it |
|---|---|---|
| `GET /auth/v1/admin/users` | `resolveHouseUserIds` → `listUsers()` | Auth admin API |
| `GET /auth/v1/admin/users/<id>` | `audienceForClientStrict` → `getUserById()` | Auth admin API |
| `GET /auth/v1/user` | the admin middleware → `getUser()` | Auth session API |

The first two decide *which provider a run is allowed to use*, and `audienceForClientStrict`
**throws** when it cannot resolve an identity — so without them the whole MVP1 sourcing path is
unreachable and checks 4, 5 and 7 cannot run. The third lets check 3's timeout half cross the
**real** admin middleware and the **real** proxy.

🛑 **`/auth/v1/user` VERIFIES, it does not trust.** It recomputes HMAC-SHA256 over
`header.payload` with the same secret PostgREST was started with, compares in constant time,
checks `exp`, requires a `sub`, and looks that subject up in `auth.users` — a signed token for
a deleted user is still 401. A gateway that decoded the payload and believed it would be a
bypass wearing an endpoint's clothes: any caller could assert any email and walk straight
through #308's allowlist.

🛑 **Every other `/auth/v1/**` path answers 501** — including `/token`, `/signup`, `/logout` and
`/recover`, the four that would make this GoTrue. Check 0 asserts all four, plus that a forged
and an absent session token are both refused with 401. No password exists anywhere in the
harness, nothing is issued or refreshed, and `middleware.ts` is not modified.

⚠️ **These three reads are beyond Batch 1b's original component list and were reported as such
before being ruled on.** The alternative was mocking the answer to the one question that
selects the provider — not acceptable evidence for FD-6 — or leaving check 3 permanently
NOT-RUN.

⚠️ **The session is used by check 3 only.** Check 1 reads all three health endpoints with plain
unauthenticated HTTP, exactly as `ship.sh` does, so the harness session cannot paper over the
admin `/api/health` 401 defect.

**The cookie name and encoding are read out of the installed package, never recalled.**
`@supabase/ssr@0.4.1`'s `createServerClient` only sets `storageKey` when `cookieOptions.name`
is given, which `middleware.ts` does not — so `@supabase/supabase-js@2.105.4`'s default applies:
``sb-${baseUrl.hostname.split(".")[0]}-auth-token``, i.e. `sb-127-auth-token` against the
gateway. `cookieEncoding` defaults to `"base64url"` and `cookies.js` writes
`"base64-" + stringToBase64URL(value)`. `checks.mjs` derives the name from `ENV` and **imports
that same encoder from the package**, so the harness cannot disagree with the reader about the
format.

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

- ✅ **It IS the 26-journey run.** All 26 journeys and all 14 failure classes, enforced by
  `coverage.mjs`: every row names the check(s) that prove it and resolves against checks that
  actually ran AND passed, so an unproven row fails the run.
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

🛑 **The schema comes from the SAME tree as the product** (`REALDB_SCHEMA_TREE`, which
`fullstack.sh` sets from `FULLSTACK_TREE`). This was Fable's C-12 ruling and it corrected a
real defect in the first RED run: those two paths were bare and relative, so the pre-Batch-1
product was booted against the **current** schema and check 6 PASSED at a commit that does not
contain the fence — a green light earned entirely by the harness. That RED was rejected.

With the seam in place, `4357bc7f` replays its own 184 migrations (166 applied · 17
superseded-by-baseline · 1 declared-known-broken · **0 failed**, versus 168 on this tree —
exactly the two migrations Batch 1 added) and check 6 fails by name:

```
❌ CHECK 6 — THE RECORD FENCE IS NOT IN THIS SCHEMA — absent: column
   public.money_settings.proof_monthly_cap_records (the RECORDS unit — the fence here is
   still dollar-based)
```

⚠️ **The artifact to ask for is the records COLUMN, not the function.**
`try_reserve_proof_records` already exists at `4357bc7f` in its dollar-based form (from
`20260822_free_proof_acquisition.sql`) — which is the same fact check 10 exploits, since
J5-C9's migration is a `CREATE OR REPLACE`. Asking whether the function existed let the check
through, and it then threw on the missing column three frames deep.

⚠️ **A replay failure would be evidence, not an abort to tidy away.** If an older tree's
migration set cannot replay, `fullstack.sh` fails with the log and says the log *is* the
finding; check 6 must then FAIL loudly, never be skipped or called passed.

**Check 6's teeth, on the GREEN tree** (`FULLSTACK_ONLY=6`): good state PASS → replace
`try_reserve_proof_records` with an always-grant body → FAIL (`booked NO proof_ledger row`) →
restore by re-running `supabase/migrations/20260917_proof_fence_in_records.sql` → PASS.

## Adding a check

`scripts/fullstack/checks.mjs`. Return `ok(n, detail)` or `bad(n, detail)`; use `note(text)`
for something found but out of scope. State is read with `pg` directly, exactly as the real-DB
suite does, because reading it back through the product would be asserting the product against
itself.

**A check that cannot establish its fact reports FAIL with the reason** — never "probably
fine". Two checks found real defects on their first run and say so in their own output.
