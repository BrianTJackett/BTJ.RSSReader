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

Issue:
- Clicking "Mark as read" does not always update immediately; sometimes it appears to apply only after clicking another article.

Goal:
- Marking read should immediately update UI state (remove article from list, update feed/category unread counts, and selection) without extra user action.

Suggested area:
- `src/app/page.tsx` (`handleMarkSelectedAsRead`, selected entry state updates)

---

### 2) Place webview directly below clicked article

Issue:
- Webview currently renders in a fixed panel area (effectively lower in the right pane), not directly under the selected article row.

Goal:
- When an article is clicked, expand/insert the webview immediately beneath that article row in the list.

Suggested area:
- `src/app/page.tsx` article list rendering structure and selected row expansion logic.

---

### 3) Allow categories to be collapsed

Issue:
- Feed categories/groups are always expanded.

Goal:
- Add category-level expand/collapse toggles independent of the existing `n more feeds` expansion behavior.

Suggested area:
- `src/app/page.tsx` grouped feed nav state (`expandedGroups`) and header actions.

---

### 4) Show unread count next to each category

Issue:
- Category headers currently do not display total unread counts.

Goal:
- Show a category unread total = sum of unread counts from feeds in that category.

Suggested area:
- `src/app/page.tsx` grouped feed derivation (`groupedFeeds` memo), category header rendering.

---

### 5) Add simple UX styling/settings options

Request:
- Provide simple UX options such as background color and a few basic preferences.
- Settings can live in a small menu at bottom-left.

Goal:
- Add lightweight settings UI with a minimal set of options (example: theme/background preset, compact mode toggle).
- Persist user preferences locally.

Suggested area:
- `src/app/page.tsx` for initial implementation.
- Consider extracting to a small component once stable.

## Nice-to-Have Validation Pass

After implementing next items:

- `npm run lint`
- `npm run build`
- Manual check of:
  - immediate mark-as-read behavior
  - expanded inline webview placement
  - category collapse + unread totals
  - settings persistence across refresh
