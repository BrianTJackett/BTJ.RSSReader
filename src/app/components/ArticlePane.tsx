"use client";

import type { FeedlyEntry } from "@/types/feedly";

type ArticlePaneProps = {
  panelClass: string;
  isCompactMode: boolean;
  error: string | null;
  selectedFeedId: string | null;
  isLoadingEntries: boolean;
  sortedEntries: FeedlyEntry[];
  selectedFeedTitle: string | null;
  primaryTextClass: string;
  mutedTextClass: string;
  subtleTextClass: string;
  controlClass: string;
  sortOrder: "newest" | "oldest";
  onSortOrderChange: (value: "newest" | "oldest") => void;
  selectedFeedArticleCount: number;
  articleCountOptions: number[];
  onArticleCountChange: (value: string) => Promise<void>;
  isDarkMode: boolean;
  rowHoverClass: string;
  rowSelectedClass: string;
  selectedEntryId: string | null;
  pendingReadIds: Set<string>;
  onSelectEntry: (entry: FeedlyEntry) => void;
  formatAgeDays: (epochMs: number) => string;
  isSyncingReads: boolean;
  onMarkSelectedAsRead: (checked: boolean) => void;
  embedStatus: "idle" | "checking" | "embeddable" | "blocked";
  embedBlockReason: string | null;
  onMarkAllVisibleAsRead: () => void;
};

export function ArticlePane({
  panelClass,
  isCompactMode,
  error,
  selectedFeedId,
  isLoadingEntries,
  sortedEntries,
  selectedFeedTitle,
  primaryTextClass,
  mutedTextClass,
  subtleTextClass,
  controlClass,
  sortOrder,
  onSortOrderChange,
  selectedFeedArticleCount,
  articleCountOptions,
  onArticleCountChange,
  isDarkMode,
  rowHoverClass,
  rowSelectedClass,
  selectedEntryId,
  pendingReadIds,
  onSelectEntry,
  formatAgeDays,
  isSyncingReads,
  onMarkSelectedAsRead,
  embedStatus,
  embedBlockReason,
  onMarkAllVisibleAsRead,
}: ArticlePaneProps) {
  return (
    <article className={`rounded-lg border ${panelClass} ${isCompactMode ? "p-3 md:p-4" : "p-4 md:p-6"}`}>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !selectedFeedId ? (
        <p className={`text-sm ${subtleTextClass}`}>Select a feed from the left navigation.</p>
      ) : isLoadingEntries ? (
        <p className={`text-sm ${subtleTextClass}`}>Loading unread articles...</p>
      ) : sortedEntries.length === 0 ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className={`text-lg font-semibold ${primaryTextClass}`}>{selectedFeedTitle}</h2>
            <div className="flex items-center gap-3">
              <label className={`flex items-center gap-2 text-xs ${mutedTextClass}`}>
                Sort
                <select
                  value={sortOrder}
                  onChange={(event) => {
                    const nextSortOrder = event.target.value;
                    if (nextSortOrder !== "newest" && nextSortOrder !== "oldest") {
                      return;
                    }

                    onSortOrderChange(nextSortOrder);
                  }}
                  className={controlClass}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
              <label className={`flex items-center gap-2 text-xs ${mutedTextClass}`}>
                Articles
                <select
                  value={selectedFeedArticleCount}
                  onChange={(event) => void onArticleCountChange(event.target.value)}
                  className={controlClass}
                >
                  {articleCountOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <p className={`mt-3 text-sm ${subtleTextClass}`}>No unread articles in this feed.</p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className={`text-lg font-semibold ${primaryTextClass}`}>{selectedFeedTitle}</h2>
            <div className="flex items-center gap-3">
              <label className={`flex items-center gap-2 text-xs ${mutedTextClass}`}>
                Sort
                <select
                  value={sortOrder}
                  onChange={(event) => {
                    const nextSortOrder = event.target.value;
                    if (nextSortOrder !== "newest" && nextSortOrder !== "oldest") {
                      return;
                    }

                    onSortOrderChange(nextSortOrder);
                  }}
                  className={controlClass}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
              <label className={`flex items-center gap-2 text-xs ${mutedTextClass}`}>
                Articles
                <select
                  value={selectedFeedArticleCount}
                  onChange={(event) => void onArticleCountChange(event.target.value)}
                  className={controlClass}
                >
                  {articleCountOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <ul className={`mt-4 divide-y rounded-md border ${isDarkMode ? "divide-slate-700 border-slate-700" : "divide-slate-100 border-slate-200"}`}>
            {sortedEntries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className={`flex w-full items-start justify-between gap-3 text-left ${rowHoverClass} ${isCompactMode ? "px-3 py-2" : "px-4 py-3"} ${
                    selectedEntryId === entry.id ? rowSelectedClass : ""
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      pendingReadIds.has(entry.id)
                        ? isDarkMode
                          ? "text-slate-500 line-through"
                          : "text-slate-400 line-through"
                        : primaryTextClass
                    }`}
                  >
                    {entry.title}
                  </span>
                  <span
                    className={`shrink-0 text-xs ${
                      pendingReadIds.has(entry.id)
                        ? isDarkMode
                          ? "text-slate-500"
                          : "text-slate-400"
                        : subtleTextClass
                    }`}
                  >
                    {formatAgeDays(entry.ageTimestamp)}
                  </span>
                </button>

                {selectedEntryId === entry.id ? (
                  <section className={`border-t ${isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
                    <div className={`flex items-start justify-between gap-4 border-b ${isDarkMode ? "border-slate-700" : "border-slate-200"} ${isCompactMode ? "px-3 py-2" : "px-4 py-3"}`}>
                      <div>
                        <h3 className={`text-sm font-semibold ${primaryTextClass}`}>{entry.title}</h3>
                        <p className={`mt-1 text-xs ${subtleTextClass}`}>{entry.source}</p>
                      </div>
                      <label className={`flex shrink-0 items-center gap-2 text-xs ${mutedTextClass}`}>
                        <input
                          key={entry.id}
                          type="checkbox"
                          className="h-4 w-4"
                          disabled={isSyncingReads}
                          checked={pendingReadIds.has(entry.id)}
                          onChange={(event) => void onMarkSelectedAsRead(event.target.checked)}
                        />
                        Mark as read
                      </label>
                    </div>

                    {entry.url ? (
                      embedStatus === "embeddable" ? (
                        <iframe title={entry.title} src={entry.url} className="h-[62vh] w-full" />
                      ) : embedStatus === "checking" ? (
                        <div className={`flex h-[62vh] items-center justify-center px-4 py-3 text-sm ${subtleTextClass}`}>
                          Checking if this article can be displayed in webview...
                        </div>
                      ) : (
                        <div className="max-h-[62vh] overflow-auto px-4 py-3">
                          <p className={`text-sm ${mutedTextClass}`}>
                            {embedBlockReason ?? "This site cannot be embedded in a webview."}
                          </p>
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                          >
                            Open Original Article
                          </a>
                          <div className={`mt-4 border-t pt-3 ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                            <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${subtleTextClass}`}>
                              Summary
                            </p>
                            <p className={`whitespace-pre-wrap text-sm leading-7 ${mutedTextClass}`}>{entry.summary}</p>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="max-h-[62vh] overflow-auto px-4 py-3">
                        <p className={`whitespace-pre-wrap text-sm leading-7 ${mutedTextClass}`}>{entry.summary}</p>
                      </div>
                    )}
                  </section>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onMarkAllVisibleAsRead}
              disabled={isSyncingReads || sortedEntries.length === 0}
              className={`rounded-md px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-900 hover:bg-slate-700"}`}
            >
              Mark all as read
            </button>
          </div>
        </>
      )}
    </article>
  );
}
