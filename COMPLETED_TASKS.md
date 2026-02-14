# Completed Tasks

This file summarizes completed work for the BTJ RSS Reader project to date.

## 1) Project Setup

- [x] Initialized project as a Next.js + TypeScript + Tailwind + ESLint app in current workspace. (Completed: 2026-02-13)
- [x] Added core config files (`tsconfig`, `next.config`, PostCSS, ESLint, globals). (Completed: 2026-02-13)
- [x] Added environment template and documentation baseline. (Completed: 2026-02-13)
- [x] Verified project builds and lints successfully. (Completed: 2026-02-13)

## 2) Feedly Integration (API + Auth)

- [x] Implemented Feedly helper library for authenticated API requests. (Completed: 2026-02-13)
- [x] Added OAuth login callback flow routes: (Completed: 2026-02-13)
  - `/api/feedly/login`
  - `/api/feedly/callback`
- [x] Added token-based fallback mode via `FEEDLY_ACCESS_TOKEN`. (Completed: 2026-02-13)
- [x] Added unread article retrieval route: (Completed: 2026-02-13)
  - `/api/feedly/articles`
- [x] Added mark-read route: (Completed: 2026-02-13)
  - `/api/feedly/mark-read`
- [x] Added subscriptions route: (Completed: 2026-02-13)
  - `/api/feedly/subscriptions`

## 3) Core Reader UX

- [x] Built two-pane layout with feed navigation left and article pane right. (Completed: 2026-02-13)
- [x] Updated left pane to ~15% width and right pane to remaining space. (Completed: 2026-02-13)
- [x] Implemented feed selection to load unread article titles. (Completed: 2026-02-13)
- [x] Added synthetic "All" section at top of feed nav to read unread entries across all feeds in date order. (Completed: 2026-02-14)
- [x] Placed selected article webview inline directly beneath the clicked article row. (Completed: 2026-02-14)
- [x] Added per-feed article count selector (10/25/50/100) with local persistence. (Completed: 2026-02-14)
- [x] Added article age display in days. (Completed: 2026-02-13)
- [x] Added grouped/category feed display inferred from Feedly metadata. (Completed: 2026-02-13)

## 4) Feed Grouping and Navigation Improvements

- [x] Grouped feeds by inferred section/category. (Completed: 2026-02-14)
- [x] Added feed unread count to the right of each feed name. (Completed: 2026-02-14)
- [x] Added category unread totals in each category header. (Completed: 2026-02-14)
- [x] Added category-level collapse/expand toggles. (Completed: 2026-02-14)
- [x] Added "`<n> more feeds`" behavior to hide zero-unread feeds by default. (Completed: 2026-02-14)
- [x] Added expand/collapse behavior for hidden feeds per category. (Completed: 2026-02-14)
- [x] Ensured feeds with unread items appear before zero-unread feeds when expanded. (Completed: 2026-02-14)

## 5) Read-State Workflow Changes

- [x] Switched from auto-mark-on-click to manual mark-as-read checkbox. (Completed: 2026-02-14)
- [x] Changed behavior so marking read is local first (queued), not immediately sent. (Completed: 2026-02-14)
- [x] Added top-right `Sync` button to send queued reads in batch. (Completed: 2026-02-14)
- [x] Updated mark-read API to accept both single `entryId` and batch `entryIds`. (Completed: 2026-02-14)
- [x] Updated UI so locally marked items stay in list and are visually gray/struck until synced. (Completed: 2026-02-14)
- [x] On successful sync, queued items are removed and unread counts are decremented. (Completed: 2026-02-14)

## 6) Webview / Embedding Robustness

- [x] Investigated external site iframe failures (e.g., Slashdot). (Completed: 2026-02-14)
- [x] Confirmed cause: `X-Frame-Options` / CSP `frame-ancestors` restrictions on source sites. (Completed: 2026-02-14)
- [x] Added embed-permission check route: (Completed: 2026-02-14)
  - `/api/feedly/embed-check`
- [x] Updated article pane to: (Completed: 2026-02-14)
  - attempt webview only when embeddable,
  - show fallback message when blocked,
  - provide "Open Original Article" link,
  - show summary fallback content.

## 7) Date/Age Corrections

- [x] Corrected day-age display logic to better match Feedly recency expectations. (Completed: 2026-02-14)
- [x] Added `ageTimestamp` support in entries. (Completed: 2026-02-14)
- [x] Used Feedly recency fields (`crawled`/`updated` fallback chain) for age calculations. (Completed: 2026-02-14)

## 8) Documentation and Handoff Artifacts

- [x] Updated `README.md` for setup and auth options (OAuth + token mode). (Completed: 2026-02-13)
- [x] Created `NEXT_STEPS.md` with backlog and resume guidance. (Completed: 2026-02-13)
- [x] Updated `.github/copilot-instructions.md` checklist entries to completed state. (Completed: 2026-02-13)

## 9) Validation Status

- [x] Repeatedly validated changes with: (Completed: 2026-02-14)
  - `npm run lint`
  - `npm run build`
- [x] Confirmed main routes compile and are available in build output. (Completed: 2026-02-14)

## 10) Feed Loading Controls

- [x] Added configurable article retrieval size per feed (`10`, `25`, `50`, `100`). (Completed: 2026-02-14)
- [x] Wired count selector into feed fetch calls. (Completed: 2026-02-14)
- [x] Added API-side guardrails to accept only supported count options. (Completed: 2026-02-14)

---

Last updated: 2026-02-14 (tracking docs synced after task #6 completion)
