# Completed Tasks

This file summarizes completed work for the BTJ RSS Reader project to date.

## 1) Project Setup

- [x] Initialized project as a Next.js + TypeScript + Tailwind + ESLint app in current workspace.
- [x] Added core config files (`tsconfig`, `next.config`, PostCSS, ESLint, globals).
- [x] Added environment template and documentation baseline.
- [x] Verified project builds and lints successfully.

## 2) Feedly Integration (API + Auth)

- [x] Implemented Feedly helper library for authenticated API requests.
- [x] Added OAuth login callback flow routes:
  - `/api/feedly/login`
  - `/api/feedly/callback`
- [x] Added token-based fallback mode via `FEEDLY_ACCESS_TOKEN`.
- [x] Added unread article retrieval route:
  - `/api/feedly/articles`
- [x] Added mark-read route:
  - `/api/feedly/mark-read`
- [x] Added subscriptions route:
  - `/api/feedly/subscriptions`

## 3) Core Reader UX

- [x] Built two-pane layout with feed navigation left and article pane right.
- [x] Updated left pane to ~15% width and right pane to remaining space.
- [x] Implemented feed selection to load unread article titles.
- [x] Added article age display in days.
- [x] Added grouped/category feed display inferred from Feedly metadata.

## 4) Feed Grouping and Navigation Improvements

- [x] Grouped feeds by inferred section/category.
- [x] Added feed unread count to the right of each feed name.
- [x] Added "`<n> more feeds`" behavior to hide zero-unread feeds by default.
- [x] Added expand/collapse behavior for hidden feeds per category.
- [x] Ensured feeds with unread items appear before zero-unread feeds when expanded.

## 5) Read-State Workflow Changes

- [x] Switched from auto-mark-on-click to manual mark-as-read checkbox.
- [x] Changed behavior so marking read is local first (queued), not immediately sent.
- [x] Added top-right `Sync` button to send queued reads in batch.
- [x] Updated mark-read API to accept both single `entryId` and batch `entryIds`.
- [x] Updated UI so locally marked items stay in list and are visually gray/struck until synced.
- [x] On successful sync, queued items are removed and unread counts are decremented.

## 6) Webview / Embedding Robustness

- [x] Investigated external site iframe failures (e.g., Slashdot).
- [x] Confirmed cause: `X-Frame-Options` / CSP `frame-ancestors` restrictions on source sites.
- [x] Added embed-permission check route:
  - `/api/feedly/embed-check`
- [x] Updated article pane to:
  - attempt webview only when embeddable,
  - show fallback message when blocked,
  - provide "Open Original Article" link,
  - show summary fallback content.

## 7) Date/Age Corrections

- [x] Corrected day-age display logic to better match Feedly recency expectations.
- [x] Added `ageTimestamp` support in entries.
- [x] Used Feedly recency fields (`crawled`/`updated` fallback chain) for age calculations.

## 8) Documentation and Handoff Artifacts

- [x] Updated `README.md` for setup and auth options (OAuth + token mode).
- [x] Created `NEXT_STEPS.md` with backlog and resume guidance.
- [x] Updated `.github/copilot-instructions.md` checklist entries to completed state.

## 9) Validation Status

- [x] Repeatedly validated changes with:
  - `npm run lint`
  - `npm run build`
- [x] Confirmed main routes compile and are available in build output.

---

Last updated: 2026-02-14
