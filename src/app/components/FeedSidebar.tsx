"use client";

import type { FeedlyFeed } from "@/types/feedly";

type GroupedFeed = {
  groupName: string;
  unreadCount: number;
  feeds: FeedlyFeed[];
};

type FeedSidebarProps = {
  isLoadingFeeds: boolean;
  feeds: FeedlyFeed[];
  groupedFeeds: GroupedFeed[];
  isCompactMode: boolean;
  panelClass: string;
  panelInnerBorderClass: string;
  primaryTextClass: string;
  mutedTextClass: string;
  subtleTextClass: string;
  rowHoverClass: string;
  rowSelectedClass: string;
  isDarkMode: boolean;
  allFeedsId: string;
  isAllFeedsSelected: boolean;
  allFeedsUnreadCount: number;
  selectedFeedId: string | null;
  collapsedCategories: Record<string, boolean>;
  expandedGroups: Record<string, boolean>;
  onSelectFeed: (feedId: string) => Promise<void>;
  onToggleCategoryCollapse: (groupName: string) => void;
  onToggleGroup: (groupName: string) => void;
};

export function FeedSidebar({
  isLoadingFeeds,
  feeds,
  groupedFeeds,
  isCompactMode,
  panelClass,
  panelInnerBorderClass,
  primaryTextClass,
  mutedTextClass,
  subtleTextClass,
  rowHoverClass,
  rowSelectedClass,
  isDarkMode,
  allFeedsId,
  isAllFeedsSelected,
  allFeedsUnreadCount,
  selectedFeedId,
  collapsedCategories,
  expandedGroups,
  onSelectFeed,
  onToggleCategoryCollapse,
  onToggleGroup,
}: FeedSidebarProps) {
  return (
    <aside className={`overflow-auto rounded-lg border ${panelClass}`}>
      <div className={`border-b ${panelInnerBorderClass} ${isCompactMode ? "px-4 py-2" : "px-4 py-3"}`}>
        <h2 className={`text-sm font-semibold ${primaryTextClass}`}>Feeds</h2>
      </div>
      {isLoadingFeeds ? (
        <p className={`p-4 text-sm ${subtleTextClass}`}>Loading feeds...</p>
      ) : feeds.length === 0 ? (
        <p className={`p-4 text-sm ${subtleTextClass}`}>No subscriptions found.</p>
      ) : (
        <div className="pb-2">
          <section className={`border-b ${panelInnerBorderClass}`}>
            <button
              type="button"
              onClick={() => void onSelectFeed(allFeedsId)}
              className={`w-full text-left ${isCompactMode ? "px-3 py-1.5 text-[11px]" : "px-3 py-2 text-xs"} ${rowHoverClass} ${
                isAllFeedsSelected ? `${rowSelectedClass} font-semibold ${primaryTextClass}` : mutedTextClass
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2">All</p>
                <span className={`shrink-0 text-[11px] ${subtleTextClass}`}>{allFeedsUnreadCount}</span>
              </div>
            </button>
          </section>
          {groupedFeeds.map((group) => (
            <section key={group.groupName} className={`border-b ${panelInnerBorderClass} last:border-b-0`}>
              <div className={`flex items-center justify-between ${isCompactMode ? "px-3 py-1.5" : "px-3 py-2"}`}>
                <button
                  type="button"
                  onClick={() => onToggleCategoryCollapse(group.groupName)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className={`shrink-0 text-[11px] ${subtleTextClass}`}>{collapsedCategories[group.groupName] ? "▸" : "▾"}</span>
                  <h3 className={`truncate text-[11px] font-semibold uppercase tracking-wide ${subtleTextClass}`}>
                    {group.groupName}
                  </h3>
                </button>
                <span className={`shrink-0 text-[11px] ${subtleTextClass}`}>{group.unreadCount}</span>
              </div>
              {!collapsedCategories[group.groupName] ? (
                <>
                  <ul>
                    {(expandedGroups[group.groupName]
                      ? group.feeds
                      : group.feeds.filter((feed) => feed.unreadCount > 0 || feed.id === selectedFeedId)
                    ).map((feed) => (
                      <li key={feed.id}>
                        <button
                          type="button"
                          onClick={() => void onSelectFeed(feed.id)}
                          className={`w-full text-left ${isCompactMode ? "px-3 py-1.5 text-[11px]" : "px-3 py-2 text-xs"} ${rowHoverClass} ${
                            selectedFeedId === feed.id ? `${rowSelectedClass} font-semibold ${primaryTextClass}` : mutedTextClass
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2">{feed.title}</p>
                            <span className={`shrink-0 text-[11px] ${subtleTextClass}`}>{feed.unreadCount}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {!expandedGroups[group.groupName] ? (
                    (() => {
                      const hiddenCount = group.feeds.filter(
                        (feed) => feed.unreadCount === 0 && feed.id !== selectedFeedId
                      ).length;

                      if (hiddenCount <= 0) {
                        return null;
                      }

                      return (
                        <button
                          type="button"
                          onClick={() => onToggleGroup(group.groupName)}
                          className={`w-full text-left ${subtleTextClass} ${rowHoverClass} ${isDarkMode ? "hover:text-slate-200" : "hover:text-slate-700"} ${isCompactMode ? "px-3 py-1.5 text-[11px]" : "px-3 py-2 text-xs"}`}
                        >
                          {hiddenCount} more feeds
                        </button>
                      );
                    })()
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleGroup(group.groupName)}
                      className={`w-full text-left ${subtleTextClass} ${rowHoverClass} ${isDarkMode ? "hover:text-slate-200" : "hover:text-slate-700"} ${isCompactMode ? "px-3 py-1.5 text-[11px]" : "px-3 py-2 text-xs"}`}
                    >
                      Show fewer feeds
                    </button>
                  )}
                </>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
