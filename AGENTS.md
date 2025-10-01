# AGENTS.md

This repo is a React Native app for a "podcast club": a player plus social features (comments, likes, follows, playlists). It is **local-first**: the device DB is the UI's source of truth; the cloud is a continuously-synced replica. Reads never block on network. Writes are optimistic with an outbox.

---

## Project overview
- **App**: React Native (TypeScript) with Expo Dev Client
- **State model**: local DB (WatermelonDB) + reactive queries; minimal in-memory UI state
- **Sync**: outbox for local mutations; delta pull + (WS/SSE) subscriptions; per-entity conflict rules
- **Media**: `react-native-track-player` for playback; OS download manager for audio files
- **Primary goals**: instant UI, robust offline, resumable downloads, background sync

---

## Setup & dev commands

- Install deps: `npm install`
- Start mobile app (Metro): `npm start`
- iOS run (sim): `npm run ios`
- Android run (emulator): `npm run android`
- Typecheck: `npm run typecheck`
- Lint & fix: `npm run lint && npm run lint:fix`
- Unit tests: `npm test`
- E2E (Detox): `npm run e2e:build:ios && npm run e2e:test:ios`

**Build variants**
- Release iOS: `expo run:ios --configuration Release`
- Release Android: `expo run:android --variant release`

---

## Code style
- TypeScript: `strict` true; no `any` (use discriminated unions where helpful)
- Imports: use path aliases from `tsconfig.json`
- React: function components + hooks; avoid global singletons for domain state
- Naming: snake_case DB columns; camelCase TS; uppercase ENV
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:` …)

---

## Architecture (what to preserve)
### Layers
1) **UI** (React): pure, subscribes to DB queries (live/observable).
2) **Domain**: services (playback, downloads, social actions) calling the repository layer.
3) **Repository**: reads/writes to local DB; never fetches network directly.
4) **Sync agent**: drains **Outbox** (push) and applies server **Changes** (pull).
5) **Networking**: REST/GraphQL client + WS/SSE for change feed.

### Local database (minimum tables)

```
Podcast(id, title, author, imageUrl, summary, updated_at, version)
Episode(id, podcast_id, title, audioUrl, duration, published_at, summary, updated_at, version)
PlaybackProgress(id, user_id, episode_id, position_ms, updated_at, source_device_id)
Playlist(id, user_id, name, created_at, updated_at, version)
PlaylistItem(id, playlist_id, episode_id, op('ADD'|'REMOVE'), op_id, op_at)
Reaction(id, user_id, target_type, target_id, op('ADD'|'REMOVE'), op_id, op_at)
Comment(id, user_id, episode_id, body, parent_id, created_at, edited_at, version, deleted_tombstone)
Download(id, episode_id, file_uri, bytes, status('queued'|'downloading'|'complete'|'error'), etag, last_verified_at)
Outbox(id, type, payload_json, op_id, created_at, retry_count, status)
SyncState(scope, lastSyncToken, updated_at)
```

### Conflict rules
- **Catalog (Podcast/Episode)**: server-authoritative; last-write-wins by `updated_at`.
- **PlaybackProgress**: keep **max(position_ms)** if timestamps close; otherwise latest `updated_at`.
- **Reactions/PlaylistItem**: operation sets (idempotent via `op_id`).
- **Comments**: append-only versions; deletes are tombstones.
- **Download status**: local only; not a server conflict.

### Networking
- **Push**: POST mutations with `op_id` (idempotency). On success, upsert server record + clear outbox item.
- **Pull**: `GET /changes?since=<token>` (batched). Apply in txn; store new token.
- **Realtime**: subscribe for change events; treat as hints (still run periodic delta to heal).

---

## What agents should do
- Prefer **local DB subscriptions** for screen data; do **not** fetch directly in components.
- When adding a mutation:
  1. Write local state in a DB txn.
  2. Append an **Outbox** item `{ type, payload_json, op_id: uuid }`.
  3. Ensure UI is optimistic and reversible.
- Whenever you touch playback:
  - Use the playback service API (don't call `TrackPlayer` directly from screens).
  - Throttle progress writes (every ~5–10s, on pause/seek/finish).

---

## Tests & quality gates
- Unit: domain + repository (DB) logic must have tests.
- E2E (Detox): happy path for play, like, comment, offline replay, resume downloads.
- Type & lint must be clean before merge.
- Add/update tests for any new or changed behavior.

Scripts:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run e2e:*`

---

## CI expectations
- On PR: install → typecheck → lint → unit tests → build (debug) → Detox on headless emulator
- Block merge if any step fails.
- Cache: node_modules, Gradle, Pods

---

## Security & privacy
- Store auth tokens in secure storage; never log tokens or full audio URLs.
- If DB contains PII, use encryption (SQLCipher/Realm encryption/Core Data protection).
- On sign-out: clear tokens + user-scoped tables; keep public catalog if desired.

---

## Environment
- Define in `.env` (and `.env.example` checked in):
  - `API_BASE_URL`
  - `WS_URL`
  - `SENTRY_DSN` (optional)
  - `DOWNLOAD_DIR` (platform-specific)
- Feature flags via `APP_FEATURE_*` env or remote config.

---

## Project structure

```
/app
  /components
  /screens
  /navigation
  /hooks
  /services      # playback, downloads, sync
  /data          # repositories, mappers
  /db            # schema, migrations, adapters
  /state         # light UI stores only
  /workers
  /utils
/assets
/e2e
/scripts
```

---

## Background work
- Schedule background tasks for: outbox drain, delta pulls, resume downloads, progress flush.
- Respect battery/data saver; backoff with jitter; mark "needs attention" after N failures but keep app usable.

---

## Common tasks (recipes)
- **Add "like episode"**: create `Reaction(op='ADD', op_id=uuid)` → write to DB → append Outbox → optimistic UI → sync push.
- **New episode arrives (server)**: change feed event → sync upsert Episode → subscribed queries re-emit → UI updates.
- **Offline comment**: insert `Comment` row (pending) + Outbox → show pending state → on ack, update `version` + pending=false.

---

## PR rules
- Title: `feat(scope): short summary`
- Include a rationale in the PR body. Link issues.
- Keep changesets small and focused; add tests.

---

## Where to put future agent guidance
- If we split into packages (e.g., `/mobile`, `/server`), add **nested `AGENTS.md`** in each package; closest file wins.