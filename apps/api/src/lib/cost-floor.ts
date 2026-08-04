// #614 — the cost floor lives in `@kind/shared` because the ADMIN app needs it too, and the
// admin app cannot import from `apps/api` (separate package). Same reason the money constants
// moved there in #563: a number the client-facing side hand-types is a number that becomes a
// lie the moment the model changes.
//
// This re-export exists so API-side code and the drift test keep a local path.
export * from '@kind/shared'
