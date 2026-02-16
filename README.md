# BTJ RSS Reader

A Next.js + TypeScript + Tailwind RSS reader for Feedly with categorized feed navigation, inline article reading, and a local read queue that syncs in batch.

## Requirements

- Node.js 20+
- Feedly authentication via one of:
  - `FEEDLY_ACCESS_TOKEN` (token mode), or
  - OAuth app credentials: `FEEDLY_CLIENT_ID`, `FEEDLY_CLIENT_SECRET`, `FEEDLY_REDIRECT_URI`

## Setup

1. Create `.env.local` from `.env.example`.
2. Configure one auth mode in `.env.local`:
   - Token mode (quick local dev): set `FEEDLY_ACCESS_TOKEN`.
   - OAuth mode: set `FEEDLY_CLIENT_ID`, `FEEDLY_CLIENT_SECRET`, and `FEEDLY_REDIRECT_URI`.
3. For OAuth mode, register redirect URI in Feedly app settings:
   - `http://localhost:3000/api/feedly/callback`
4. Install and run:
   - `npm install`
   - `npm run dev`
5. Open:
   - `http://localhost:3000`

## Authentication Behavior

- Token mode uses `FEEDLY_ACCESS_TOKEN` directly.
- OAuth mode uses `/api/feedly/login` and `/api/feedly/callback`.
- OAuth access/refresh data is stored in secure HTTP-only cookies.
- If Feedly returns unauthorized, auth cookies are cleared and the UI prompts reconnection.

## Current UX and Features

### Feed and Category Navigation

- Left sidebar shows:
  - synthetic **All** view (unread across feeds),
  - grouped categories inferred from Feedly metadata,
  - unread count per feed and per category.
- Categories can be collapsed/expanded independently.
- Zero-unread feeds are hidden by default behind an `n more feeds` expander.

### Article List and Reader

- Right pane shows unread entries for the selected feed (or **All**).
- Sort control supports `Newest first` and `Oldest first` without re-fetch.
- Per-feed article count selector supports `10`, `25`, `50`, `100`.
- Selected article expands inline directly below its list row.
- Article age is displayed in days.

### Read Queue and Sync Workflow

- `Mark as read` (checkbox on selected article) queues the entry locally.
- Queued entries stay visible but are grayed/struck through until sync.
- `Mark all as read` queues all visible entries in current view.
- Top-right `Sync` sends queued items to Feedly in batch.
- After successful sync, synced entries are removed and unread counts are decremented.

### Settings and Persistence

- Bottom-left settings panel with persisted preferences:
  - Theme mode: `system`, `light`, `dark`
  - Background preset: `Sky`, `Emerald`, `Stone`
  - Compact mode
  - Default sort order
  - Global default article count (`10/25/50/100`)
- Per-feed article count overrides are persisted separately.
- Global default count is used for feeds without an override.

### Embedding Fallback Behavior

- App checks whether article URLs allow embedding (`/api/feedly/embed-check`).
- If embeddable, article opens in inline iframe.
- If blocked by X-Frame-Options/CSP, UI shows:
  - reason message,
  - `Open Original Article` link,
  - summary fallback.

## API Routes

- `GET /api/feedly/subscriptions` - load subscriptions and unread counts
- `GET /api/feedly/articles` - load unread entries (`streamId`, `count`)
- `POST /api/feedly/mark-read` - mark one or many entries as read
- `GET /api/feedly/login` - start OAuth flow
- `GET /api/feedly/callback` - handle OAuth callback
- `GET /api/feedly/embed-check` - evaluate iframe eligibility for article URL

## Available Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
