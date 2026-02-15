"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeedlyEntry, FeedlyFeed } from "@/types/feedly";

type EntriesApiResponse = {
  entries?: FeedlyEntry[];
  error?: string;
};

type FeedsApiResponse = {
  feeds?: FeedlyFeed[];
  error?: string;
};

type EmbedCheckResponse = {
  embeddable?: boolean;
  reason?: string;
  error?: string;
};

type EmbedStatus = "idle" | "checking" | "embeddable" | "blocked";
type ArticleCountOption = 10 | 25 | 50 | 100;
type BackgroundPreset = "sky" | "emerald" | "stone";
type SortOrder = "newest" | "oldest";
type ThemeMode = "system" | "light" | "dark";

type UserSettings = {
  backgroundPreset: BackgroundPreset;
  compactMode: boolean;
  sortOrder: SortOrder;
  themeMode: ThemeMode;
  defaultArticleCount: ArticleCountOption;
};

const ARTICLE_COUNT_OPTIONS: ArticleCountOption[] = [10, 25, 50, 100];
const ARTICLE_COUNT_STORAGE_KEY = "btj-rssreader-article-count-by-feed";
const USER_SETTINGS_STORAGE_KEY = "btj-rssreader-settings";
const ALL_FEEDS_ID = "__all__";

const DEFAULT_SETTINGS: UserSettings = {
  backgroundPreset: "stone",
  compactMode: false,
  sortOrder: "newest",
  themeMode: "system",
  defaultArticleCount: 10,
};

const BACKGROUND_PRESET_CLASSES: Record<BackgroundPreset, { light: string; dark: string }> = {
  sky: { light: "bg-sky-100", dark: "bg-sky-950" },
  emerald: { light: "bg-emerald-100", dark: "bg-emerald-950" },
  stone: { light: "bg-stone-100", dark: "bg-stone-900" },
};

function formatAgeDays(epochMs: number) {
  const normalizedEpochMs = epochMs < 1_000_000_000_000 ? epochMs * 1000 : epochMs;

  const publishedDate = new Date(normalizedEpochMs);
  const now = new Date();

  const publishedDayStart = new Date(
    publishedDate.getFullYear(),
    publishedDate.getMonth(),
    publishedDate.getDate()
  );
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const ageDays = Math.max(0, Math.round((todayStart.getTime() - publishedDayStart.getTime()) / msPerDay));

  return `${ageDays} day${ageDays === 1 ? "" : "s"} ago`;
}

export default function HomePage() {
  const [feeds, setFeeds] = useState<FeedlyFeed[]>([]);
  const [articleCountByFeed, setArticleCountByFeed] = useState<Record<string, ArticleCountOption>>({});
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [entries, setEntries] = useState<FeedlyEntry[]>([]);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [pendingReadQueue, setPendingReadQueue] = useState<Array<{ entryId: string; feedId: string }>>([]);
  const [isSyncingReads, setIsSyncingReads] = useState(false);
  const [embedStatus, setEmbedStatus] = useState<EmbedStatus>("idle");
  const [embedBlockReason, setEmbedBlockReason] = useState<string | null>(null);
  const [isLoadingFeeds, setIsLoadingFeeds] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const selectedFeed = useMemo(
    () => feeds.find((feed) => feed.id === selectedFeedId) ?? null,
    [feeds, selectedFeedId]
  );

  const isAllFeedsSelected = selectedFeedId === ALL_FEEDS_ID;
  const allFeedsUnreadCount = useMemo(() => feeds.reduce((total, feed) => total + feed.unreadCount, 0), [feeds]);
  const selectedFeedTitle = isAllFeedsSelected ? "All" : selectedFeed?.title ?? null;

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId]
  );

  const getArticleCountForFeed = useCallback(
    (feedId: string | null): ArticleCountOption => {
      if (!feedId) {
        return settings.defaultArticleCount;
      }

      return articleCountByFeed[feedId] ?? settings.defaultArticleCount;
    },
    [articleCountByFeed, settings.defaultArticleCount]
  );

  const selectedFeedArticleCount = useMemo(
    () => getArticleCountForFeed(selectedFeedId),
    [getArticleCountForFeed, selectedFeedId]
  );
  const sortOrder = settings.sortOrder;
  const isCompactMode = settings.compactMode;
  const isDarkMode =
    settings.themeMode === "dark" || (settings.themeMode === "system" && systemPrefersDark);
  const selectedBackgroundPreset =
    BACKGROUND_PRESET_CLASSES[settings.backgroundPreset] ?? BACKGROUND_PRESET_CLASSES.stone;
  const backgroundClassName = isDarkMode ? selectedBackgroundPreset.dark : selectedBackgroundPreset.light;
  const primaryTextClass = isDarkMode ? "text-slate-100" : "text-slate-900";
  const mutedTextClass = isDarkMode ? "text-slate-300" : "text-slate-600";
  const subtleTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";
  const panelClass = isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white";
  const panelInnerBorderClass = isDarkMode ? "border-slate-700" : "border-slate-100";
  const rowHoverClass = isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-50";
  const rowSelectedClass = isDarkMode ? "bg-slate-700" : "bg-slate-100";
  const controlClass = isDarkMode
    ? "rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-100"
    : "rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700";

  const pendingReadIds = useMemo(
    () => new Set(pendingReadQueue.map((item) => item.entryId)),
    [pendingReadQueue]
  );

  const sortedEntries = useMemo(() => {
    return [...entries].sort((left, right) => {
      if (sortOrder === "oldest") {
        return left.ageTimestamp - right.ageTimestamp;
      }

      return right.ageTimestamp - left.ageTimestamp;
    });
  }, [entries, sortOrder]);

  const groupedFeeds = useMemo(() => {
    const groups = new Map<string, FeedlyFeed[]>();

    for (const feed of feeds) {
      const feedGroups = feed.groups.length > 0 ? feed.groups : ["Ungrouped"];
      for (const group of feedGroups) {
        const current = groups.get(group) ?? [];
        current.push(feed);
        groups.set(group, current);
      }
    }

    return Array.from(groups.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([groupName, groupFeeds]) => ({
        groupName,
        unreadCount: groupFeeds.reduce((total, feed) => total + feed.unreadCount, 0),
        feeds: groupFeeds.sort((left, right) => {
          const leftIsUnread = left.unreadCount > 0;
          const rightIsUnread = right.unreadCount > 0;

          if (leftIsUnread !== rightIsUnread) {
            return leftIsUnread ? -1 : 1;
          }

          return left.title.localeCompare(right.title);
        }),
      }));
  }, [feeds]);

  const oauthErrorMessage =
    oauthError === "missing_feedly_config"
      ? "Feedly is not configured yet. Set FEEDLY_ACCESS_TOKEN for token mode, or FEEDLY_CLIENT_ID, FEEDLY_CLIENT_SECRET, and FEEDLY_REDIRECT_URI for OAuth mode."
      : oauthError
        ? "Feedly login failed. Please try again."
        : null;

  const loadEntries = useCallback(async (streamId: string, count: ArticleCountOption = 10) => {
    setIsLoadingEntries(true);
    setError(null);

    const effectiveStreamId = streamId === ALL_FEEDS_ID ? null : streamId;
    const query = new URLSearchParams();
    query.set("count", String(count));
    if (effectiveStreamId) {
      query.set("streamId", effectiveStreamId);
    }

    const response = await fetch(`/api/feedly/articles?${query.toString()}`, { cache: "no-store" });

    if (response.status === 401) {
      setIsAuthenticated(false);
      setEntries([]);
      setSelectedEntryId(null);
      setIsLoadingEntries(false);
      return;
    }

    const payload = (await response.json()) as EntriesApiResponse;

    if (!response.ok) {
      setError(payload.error ?? "Unable to load articles.");
      setSelectedEntryId(null);
      setIsLoadingEntries(false);
      return;
    }

    setIsAuthenticated(true);
    const loadedEntries = payload.entries ?? [];
    const sortedLoadedEntries = [...loadedEntries].sort((left, right) => {
      if (sortOrder === "oldest") {
        return left.ageTimestamp - right.ageTimestamp;
      }

      return right.ageTimestamp - left.ageTimestamp;
    });
    setEntries(loadedEntries);
    setSelectedEntryId((currentSelectedId) => {
      if (sortedLoadedEntries.some((entry) => entry.id === currentSelectedId)) {
        return currentSelectedId;
      }

      return sortedLoadedEntries[0]?.id ?? null;
    });
    setIsLoadingEntries(false);
  }, [sortOrder]);

  const loadFeeds = useCallback(async () => {
    setIsLoadingFeeds(true);
    setError(null);

    const response = await fetch("/api/feedly/subscriptions", { cache: "no-store" });

    if (response.status === 401) {
      setIsAuthenticated(false);
      setFeeds([]);
      setSelectedFeedId(null);
      setEntries([]);
      setSelectedEntryId(null);
      setIsLoadingFeeds(false);
      return;
    }

    const payload = (await response.json()) as FeedsApiResponse;

    if (!response.ok) {
      setError(payload.error ?? "Unable to load feeds.");
      setSelectedEntryId(null);
      setIsLoadingFeeds(false);
      return;
    }

    const loadedFeeds = payload.feeds ?? [];
    setFeeds(loadedFeeds);
    setIsAuthenticated(true);

    const nextFeedId =
      (selectedFeedId === ALL_FEEDS_ID ? ALL_FEEDS_ID : null) ??
      loadedFeeds.find((feed) => feed.id === selectedFeedId)?.id ??
      loadedFeeds.find((feed) => feed.unreadCount > 0)?.id ??
      ALL_FEEDS_ID ??
      null;
    setSelectedFeedId(nextFeedId);

    if (nextFeedId) {
      await loadEntries(nextFeedId, getArticleCountForFeed(nextFeedId));
    } else {
      setEntries([]);
      setSelectedEntryId(null);
    }

    setIsLoadingFeeds(false);
  }, [getArticleCountForFeed, loadEntries, selectedFeedId]);

  async function markAsRead(entryIds: string[]) {
    if (entryIds.length === 0) {
      return;
    }

    await fetch("/api/feedly/mark-read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entryIds }),
    });
  }

  function handleSelectEntry(entry: FeedlyEntry) {
    setSelectedEntryId(entry.id);
  }

  function handleMarkSelectedAsRead(checked: boolean) {
    if (!selectedEntry) {
      return;
    }

    const currentSelectedEntryId = selectedEntry.id;
    const currentSelectedFeedId = selectedEntry.feedId || selectedFeedId;

    if (!currentSelectedFeedId || currentSelectedFeedId === ALL_FEEDS_ID) {
      return;
    }

    if (!checked) {
      setPendingReadQueue((currentQueue) => currentQueue.filter((item) => item.entryId !== currentSelectedEntryId));
      return;
    }

    if (pendingReadIds.has(currentSelectedEntryId)) {
      return;
    }

    setPendingReadQueue((currentQueue) => [...currentQueue, { entryId: currentSelectedEntryId, feedId: currentSelectedFeedId }]);
  }

  async function handleSyncReads() {
    if (pendingReadQueue.length === 0 || isSyncingReads) {
      return;
    }

    const queueSnapshot = pendingReadQueue;
    const readIds = new Set(queueSnapshot.map((item) => item.entryId));
    const readCountByFeed = queueSnapshot.reduce<Record<string, number>>((acc, item) => {
      acc[item.feedId] = (acc[item.feedId] ?? 0) + 1;
      return acc;
    }, {});

    setIsSyncingReads(true);
    setError(null);

    try {
      const entryIds = queueSnapshot.map((item) => item.entryId);
      await markAsRead(entryIds);

      setEntries((currentEntries) => {
        const remaining = currentEntries.filter((entry) => !readIds.has(entry.id));
        if (selectedEntryId && readIds.has(selectedEntryId)) {
          setSelectedEntryId(remaining[0]?.id ?? null);
        }
        return remaining;
      });

      setFeeds((currentFeeds) =>
        currentFeeds.map((feed) => {
          const toSubtract = readCountByFeed[feed.id] ?? 0;
          if (toSubtract === 0) {
            return feed;
          }

          return {
            ...feed,
            unreadCount: Math.max(0, feed.unreadCount - toSubtract),
          };
        })
      );

      setPendingReadQueue((currentQueue) => currentQueue.filter((item) => !readIds.has(item.entryId)));
    } catch {
      setError("Unable to sync read articles.");
    } finally {
      setIsSyncingReads(false);
    }
  }

  async function handleSelectFeed(feedId: string) {
    setSelectedFeedId(feedId);
    await loadEntries(feedId, getArticleCountForFeed(feedId));
  }

  function handleMarkAllVisibleAsRead() {
    if (isSyncingReads || entries.length === 0) {
      return;
    }

    const queueCandidates = entries
      .map((entry) => {
        const resolvedFeedId = entry.feedId || (selectedFeedId !== ALL_FEEDS_ID ? selectedFeedId : null);
        if (!resolvedFeedId || resolvedFeedId === ALL_FEEDS_ID) {
          return null;
        }

        return {
          entryId: entry.id,
          feedId: resolvedFeedId,
        };
      })
      .filter((item): item is { entryId: string; feedId: string } => item !== null)
      .filter((item) => !pendingReadIds.has(item.entryId));

    if (queueCandidates.length === 0) {
      return;
    }

    setPendingReadQueue((currentQueue) => [...currentQueue, ...queueCandidates]);
  }

  async function handleArticleCountChange(value: string) {
    if (!selectedFeedId) {
      return;
    }

    const parsed = Number(value);
    if (!ARTICLE_COUNT_OPTIONS.includes(parsed as ArticleCountOption)) {
      return;
    }

    const count = parsed as ArticleCountOption;
    setArticleCountByFeed((current) => ({
      ...current,
      [selectedFeedId]: count,
    }));

    await loadEntries(selectedFeedId, count);
  }

  function toggleGroup(groupName: string) {
    setExpandedGroups((current) => ({
      ...current,
      [groupName]: !current[groupName],
    }));
  }

  function toggleCategoryCollapse(groupName: string) {
    setCollapsedCategories((current) => ({
      ...current,
      [groupName]: !current[groupName],
    }));
  }

  const checkEmbeddable = useCallback(async (url: string) => {
    setEmbedStatus("checking");
    setEmbedBlockReason(null);

    try {
      const response = await fetch(`/api/feedly/embed-check?url=${encodeURIComponent(url)}`, { cache: "no-store" });
      const payload = (await response.json()) as EmbedCheckResponse;

      if (!response.ok) {
        setEmbedStatus("blocked");
        setEmbedBlockReason(payload.error ?? "Unable to verify embed permissions for this site.");
        return;
      }

      if (payload.embeddable) {
        setEmbedStatus("embeddable");
        return;
      }

      setEmbedStatus("blocked");
      setEmbedBlockReason(payload.reason ?? "This site blocks webview embedding.");
    } catch {
      setEmbedStatus("blocked");
      setEmbedBlockReason("Unable to verify embed permissions for this site.");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOauthError(params.get("error"));
    void loadFeeds();
  }, [loadFeeds]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ARTICLE_COUNT_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, number>;
      const normalized = Object.fromEntries(
        Object.entries(parsed)
          .filter(([, value]) => ARTICLE_COUNT_OPTIONS.includes(value as ArticleCountOption))
          .map(([key, value]) => [key, value as ArticleCountOption])
      ) as Record<string, ArticleCountOption>;

      setArticleCountByFeed(normalized);
    } catch {
      setArticleCountByFeed({});
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ARTICLE_COUNT_STORAGE_KEY, JSON.stringify(articleCountByFeed));
  }, [articleCountByFeed]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      const backgroundPreset =
        parsed.backgroundPreset && parsed.backgroundPreset in BACKGROUND_PRESET_CLASSES
          ? parsed.backgroundPreset
          : DEFAULT_SETTINGS.backgroundPreset;

      setSettings({
        backgroundPreset,
        compactMode: Boolean(parsed.compactMode),
        sortOrder: parsed.sortOrder === "oldest" ? "oldest" : DEFAULT_SETTINGS.sortOrder,
        themeMode:
          parsed.themeMode === "light" || parsed.themeMode === "dark" || parsed.themeMode === "system"
            ? parsed.themeMode
            : DEFAULT_SETTINGS.themeMode,
        defaultArticleCount: ARTICLE_COUNT_OPTIONS.includes(parsed.defaultArticleCount as ArticleCountOption)
          ? (parsed.defaultArticleCount as ArticleCountOption)
          : DEFAULT_SETTINGS.defaultArticleCount,
      });
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyPreference = () => setSystemPrefersDark(mediaQuery.matches);

    applyPreference();
    mediaQuery.addEventListener("change", applyPreference);

    return () => {
      mediaQuery.removeEventListener("change", applyPreference);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  useEffect(() => {
    window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!selectedEntry?.url) {
      setEmbedStatus("idle");
      setEmbedBlockReason(null);
      return;
    }

    void checkEmbeddable(selectedEntry.url);
  }, [checkEmbeddable, selectedEntry]);

  return (
    <main className={`min-h-screen px-6 py-8 ${backgroundClassName} ${primaryTextClass}`}>
      <div className="mx-auto max-w-[1400px]">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BTJ RSS Reader</h1>
          <p className={`text-sm ${mutedTextClass}`}>Select a feed, open an article, mark as read locally, then sync.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadFeeds()}
            className={`rounded-md px-3 py-2 text-sm text-white ${isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-900 hover:bg-slate-700"}`}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleSyncReads()}
            disabled={isSyncingReads || pendingReadQueue.length === 0}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncingReads ? "Syncing..." : `Sync${pendingReadQueue.length > 0 ? ` (${pendingReadQueue.length})` : ""}`}
          </button>
        </div>
      </header>

      {!isAuthenticated ? (
        <section className={`rounded-lg border p-6 ${panelClass}`}>
          <h2 className="mb-2 text-lg font-semibold">Connect Feedly</h2>
          <p className={`mb-4 text-sm ${mutedTextClass}`}>Authorize the app to load your unread entries.</p>
          {oauthErrorMessage ? <p className="mb-4 text-sm text-red-600">{oauthErrorMessage}</p> : null}
          <a
            href="/api/feedly/login"
            className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Connect Feedly Account
          </a>
        </section>
      ) : (
        <section className="grid min-h-[60vh] grid-cols-1 gap-4 md:grid-cols-[15%_85%]">
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
                    onClick={() => void handleSelectFeed(ALL_FEEDS_ID)}
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
                        onClick={() => toggleCategoryCollapse(group.groupName)}
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
                                onClick={() => void handleSelectFeed(feed.id)}
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
                                onClick={() => toggleGroup(group.groupName)}
                                className={`w-full text-left ${subtleTextClass} ${rowHoverClass} ${isDarkMode ? "hover:text-slate-200" : "hover:text-slate-700"} ${isCompactMode ? "px-3 py-1.5 text-[11px]" : "px-3 py-2 text-xs"}`}
                              >
                                {hiddenCount} more feeds
                              </button>
                            );
                          })()
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.groupName)}
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
                          const nextSortOrder = event.target.value as SortOrder;
                          if (nextSortOrder !== "newest" && nextSortOrder !== "oldest") {
                            return;
                          }

                          setSettings((current) => ({
                            ...current,
                            sortOrder: nextSortOrder,
                          }));
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
                        onChange={(event) => void handleArticleCountChange(event.target.value)}
                        className={controlClass}
                      >
                        {ARTICLE_COUNT_OPTIONS.map((option) => (
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
                          const nextSortOrder = event.target.value as SortOrder;
                          if (nextSortOrder !== "newest" && nextSortOrder !== "oldest") {
                            return;
                          }

                          setSettings((current) => ({
                            ...current,
                            sortOrder: nextSortOrder,
                          }));
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
                        onChange={(event) => void handleArticleCountChange(event.target.value)}
                        className={controlClass}
                      >
                        {ARTICLE_COUNT_OPTIONS.map((option) => (
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
                        onClick={() => void handleSelectEntry(entry)}
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
                                onChange={(event) => void handleMarkSelectedAsRead(event.target.checked)}
                              />
                              Mark as read
                            </label>
                          </div>

                          {entry.url ? (
                            embedStatus === "embeddable" ? (
                              <iframe
                                title={entry.title}
                                src={entry.url}
                                className="h-[62vh] w-full"
                              />
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
                                  <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${subtleTextClass}`}>Summary</p>
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
                    onClick={handleMarkAllVisibleAsRead}
                    disabled={isSyncingReads || sortedEntries.length === 0}
                    className={`rounded-md px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${isDarkMode ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-900 hover:bg-slate-700"}`}
                  >
                    Mark all as read
                  </button>
                </div>
              </>
            )}
          </article>
        </section>
      )}

      <div className="fixed bottom-4 left-4 z-20">
        {isSettingsOpen ? (
          <section className={`w-64 rounded-lg border p-3 shadow-sm ${panelClass}`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={`text-sm font-semibold ${primaryTextClass}`}>Settings</h2>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className={`text-xs ${subtleTextClass} ${isDarkMode ? "hover:text-slate-200" : "hover:text-slate-700"}`}
              >
                Close
              </button>
            </div>
            <label className={`mb-3 block text-xs ${mutedTextClass}`}>
              Use system theme
              <input
                type="checkbox"
                className="ml-2 h-4 w-4 align-middle"
                checked={settings.themeMode === "system"}
                onChange={(event) => {
                  setSettings((current) => ({
                    ...current,
                    themeMode: event.target.checked ? "system" : isDarkMode ? "dark" : "light",
                  }));
                }}
              />
            </label>
            <label className={`mb-3 flex items-center gap-2 text-xs ${mutedTextClass}`}>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={settings.themeMode === "dark"}
                disabled={settings.themeMode === "system"}
                onChange={(event) => {
                  setSettings((current) => ({
                    ...current,
                    themeMode: event.target.checked ? "dark" : "light",
                  }));
                }}
              />
              Dark mode
            </label>
            <label className={`mb-3 block text-xs ${mutedTextClass}`}>
              Background
              <select
                value={settings.backgroundPreset}
                onChange={(event) => {
                  const nextPreset = event.target.value as BackgroundPreset;
                  if (!(nextPreset in BACKGROUND_PRESET_CLASSES)) {
                    return;
                  }

                  setSettings((current) => ({
                    ...current,
                    backgroundPreset: nextPreset,
                  }));
                }}
                className={`mt-1 w-full ${controlClass}`}
              >
                <option value="sky">Sky</option>
                <option value="emerald">Emerald</option>
                <option value="stone">Stone</option>
              </select>
            </label>
            <label className={`mb-3 block text-xs ${mutedTextClass}`}>
              Default sort
              <select
                value={settings.sortOrder}
                onChange={(event) => {
                  const nextSortOrder = event.target.value as SortOrder;
                  if (nextSortOrder !== "newest" && nextSortOrder !== "oldest") {
                    return;
                  }

                  setSettings((current) => ({
                    ...current,
                    sortOrder: nextSortOrder,
                  }));
                }}
                className={`mt-1 w-full ${controlClass}`}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <label className={`mb-3 block text-xs ${mutedTextClass}`}>
              Default articles
              <select
                value={settings.defaultArticleCount}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  if (!ARTICLE_COUNT_OPTIONS.includes(parsed as ArticleCountOption)) {
                    return;
                  }

                  const nextCount = parsed as ArticleCountOption;
                  setSettings((current) => ({
                    ...current,
                    defaultArticleCount: nextCount,
                  }));

                  if (selectedFeedId && !(selectedFeedId in articleCountByFeed)) {
                    void loadEntries(selectedFeedId, nextCount);
                  }
                }}
                className={`mt-1 w-full ${controlClass}`}
              >
                {ARTICLE_COUNT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className={`flex items-center gap-2 text-xs ${mutedTextClass}`}>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={settings.compactMode}
                onChange={(event) => {
                  setSettings((current) => ({
                    ...current,
                    compactMode: event.target.checked,
                  }));
                }}
              />
              Compact mode
            </label>
          </section>
        ) : (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className={`rounded-md border px-3 py-2 text-xs font-medium ${isDarkMode ? "border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            Settings
          </button>
        )}
      </div>
      </div>
    </main>
  );
}
