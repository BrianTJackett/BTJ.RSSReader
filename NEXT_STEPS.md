# Next Steps Handoff

Date: 2026-02-13
Project: BTJ RSS Reader

## Quick Resume Checklist

1. Ensure `.env.local` has a valid `FEEDLY_ACCESS_TOKEN`.
2. Run:
   - `npm install`
   - `npm run dev`
3. Open `http://localhost:3000`.

## Current Baseline

- Feed subscriptions are grouped by inferred category.
- Feeds with zero unread can be hidden behind `n more feeds`.
- Clicking an article opens a scrollable webview in the right pane.
- Mark-as-read is manual via checkbox near selected article title.
- Lint/build were passing at end of session.

## Backlog For Next Session

### 1) Mark-as-read timing bug

Status: ✅ Completed (now local-queue first, immediate UI update, sync-driven server update)

Issue:
- Clicking "Mark as read" does not always update immediately; sometimes it appears to apply only after clicking another article.

Goal:
- Marking read should immediately update UI state (remove article from list, update feed/category unread counts, and selection) without extra user action.

Suggested area:
- `src/app/page.tsx` (`handleMarkSelectedAsRead`, selected entry state updates)

---

### 2) Place webview directly below clicked article

 Status: ✅ Completed (selected article now expands inline with webview directly under its row)

Issue:
- Webview currently renders in a fixed panel area (effectively lower in the right pane), not directly under the selected article row.

Goal:
- When an article is clicked, expand/insert the webview immediately beneath that article row in the list.

Suggested area:
- `src/app/page.tsx` article list rendering structure and selected row expansion logic.

---

### 3) Allow categories to be collapsed

Status: ✅ Completed (category-level collapse/expand toggle added)

Issue:
- Feed categories/groups are always expanded.

Goal:
- Add category-level expand/collapse toggles independent of the existing `n more feeds` expansion behavior.

Suggested area:
- `src/app/page.tsx` grouped feed nav state (`expandedGroups`) and header actions.

---

### 4) Show unread count next to each category

Status: ✅ Completed (category unread totals now shown in header)

Issue:
- Category headers currently do not display total unread counts.

Goal:
- Show a category unread total = sum of unread counts from feeds in that category.

Suggested area:
- `src/app/page.tsx` grouped feed derivation (`groupedFeeds` memo), category header rendering.

---

### 5) Add simple UX styling/settings options

Status: ✅ Completed (bottom-left settings menu added with background preset + compact mode, persisted locally)

Request:
- Provide simple UX options such as background color and a few basic preferences.
- Settings can live in a small menu at bottom-left.

Goal:
- Add lightweight settings UI with a minimal set of options (example: theme/background preset, compact mode toggle).
- Persist user preferences locally.

Suggested area:
- `src/app/page.tsx` for initial implementation.
- Consider extracting to a small component once stable.

---

### 6) Add an "All" feed view across categories

Status: ✅ Completed (synthetic All item added at top; unread entries now load across feeds in date order)

Request:
- Add an "All" section at the top of categories so user can read all unread articles regardless of feed.

Goal:
- Add a synthetic "All" item in the left navigation.
- When selected, right pane shows unread entries merged from all feeds and ordered by date.

Suggested area:
- `src/app/page.tsx` for nav and selection behavior.
- `src/app/api/feedly/articles/route.ts` may need support for a broader stream or merged strategy.

---

### 7) Add "Mark all as read" for current feed

Status: ⏳ Pending

Request:
- Add a button at the bottom of the right pane to mark all visible articles in that feed as read.

Goal:
- Queue all currently listed entries for read-state sync.
- Keep behavior consistent with existing Sync model (no server update until Sync button is clicked).

Suggested area:
- `src/app/page.tsx` for queueing and UI action placement.

---

### 8) Add sort order toggle inside feed

Status: ⏳ Pending

Request:
- Allow sorting articles by oldest first or newest first within a feed.

Goal:
- Add simple sort control near the article list header.
- Apply client-side sort to loaded entries without re-fetch.

Suggested area:
- `src/app/page.tsx` (entries rendering and local sort state).

---

### 9) Feedly login/session-assisted token workflow

Status: ⏳ Pending

Request:
- Launch browser to Feedly, login, then capture `feedlyToken` and update `.env.local`.

Notes / Constraints:
- Browser cookie/session token extraction is security-sensitive and typically blocked by browser isolation.
- Directly reading token from an authenticated third-party browser session is usually not reliable in app code.

Goal:
- Define a practical workflow with alternatives:
   1. Preferred: official OAuth/client flow and store access token server-side.
   2. Practical local-dev fallback: user manually pastes token into `.env.local`.
   3. Optional guided helper UX: open Feedly login page and show clear post-login instructions.

Suggested area:
- `README.md` (document safe workflow)
- optional utility route/UI helper in `src/app/page.tsx`.

---

### 10) Configurable per-feed article count (10/25/50/100)

Status: ✅ Completed (selector added; per-feed count persisted locally; API constrained to 10/25/50/100)

Request:
- Currently new feed loads around 10 items; make this configurable.
- Let user choose 10, 25, 50, or 100 per feed.

Goal:
- Add UI selector for article count in right pane.
- Pass selected count to articles API (`count` query param).
- Keep selection persistent per user session (and optionally per feed).

Suggested area:
- `src/app/page.tsx` for selector state + fetch wiring.
- `src/app/api/feedly/articles/route.ts` already supports `count`; verify bounds/validation.

---

### 11) Settings menu with saved user configurations

Status: ⏳ Pending

Request:
- Add settings menu where user preferences can be changed and saved.
- Initial option set can be minimal.

Goal:
- Add small settings UI (bottom-left or equivalent non-intrusive location).
- Persist settings in local storage.
- Wire settings state into page rendering.

Suggested area:
- `src/app/page.tsx` initially; optionally extract a `SettingsPanel` component later.

---

### 12) Light/Dark mode with system/browser preference support

Status: ⏳ Pending

Request:
- Add light/dark mode options that default from user system/browser preference.
- Include a slider/toggle control in settings.

Goal:
- Use `prefers-color-scheme` as initial mode when no saved override exists.
- Let user toggle mode manually and persist override.
- Apply mode consistently across nav, list, panels, and controls.

Suggested area:
- `src/app/page.tsx` state + class toggles.
- `src/app/globals.css` for theme tokens/selectors.
- optional `localStorage` key (e.g., `btj-rssreader-theme`).

---

### 13) Fix article-count dropdown vs refresh behavior

Status: ⏳ Pending

Issue:
- Changing the article count selector (10/25/50/100) for a feed does not reliably affect refresh results.
- Example: selecting 50 for a feed and pressing Refresh still appears to load the same small set.

Goal:
- Ensure refresh/load behavior always uses the selected per-feed article count when requesting unread entries.
- Confirm the selected value is applied both on feed selection and on manual Refresh.

Scope note:
- This belongs to refresh/load-fetch logic, not sync logic.
- Sync only pushes queued read markers to Feedly; it does not control unread retrieval size.

Suggested area:
- `src/app/page.tsx` (`loadFeeds`, `loadEntries`, selected feed + count resolution)
- `src/app/api/feedly/articles/route.ts` (verify count handling and constraints)

---

### 14) Make settings background options more visually distinct and accessible

Status: ✅ Completed (replaced with Sky, Emerald, and Stone presets; Stone retained)

Request:
- Current styling/background options look too similar.
- Keep `Stone`, replace the other two with more visually distinct options while maintaining accessible contrast.

Goal:
- Offer 3 total presets in settings, including `Stone`.
- Ensure the other two options are clearly distinct from each other and from `Stone`.
- Keep body/content readability high (web-accessible color contrast with existing text/UI).

Suggested area:
- `src/app/page.tsx` (`BackgroundPreset` type, `BACKGROUND_PRESET_CLASSES`, settings `<select>` options)

## Nice-to-Have Validation Pass

After implementing next items:

- `npm run lint`
- `npm run build`
- Manual check of:
  - immediate mark-as-read behavior
  - expanded inline webview placement
  - category collapse + unread totals
  - settings persistence across refresh
