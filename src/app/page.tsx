"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FeedlyEntry, FeedlyFeed } from "@/types/feedly";
import {
  useUserSettings,
  type ArticleCountOption,
} from "@/app/hooks/useUserSettings";
import { SettingsPanel } from "@/app/components/SettingsPanel";
import { FeedSidebar } from "@/app/components/FeedSidebar";
import { useReadQueue } from "@/app/hooks/useReadQueue";
import { ArticlePane } from "@/app/components/ArticlePane";
import { getUiThemeTokens } from "@/app/lib/uiTheme";
import { sortEntriesByOrder } from "@/app/lib/articleSort";

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

const ARTICLE_COUNT_OPTIONS: ArticleCountOption[] = [10, 25, 50, 100];
const ARTICLE_COUNT_STORAGE_KEY = "btj-rssreader-article-count-by-feed";
const ALL_FEEDS_ID = "__all__";

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
  const { settings, setSettings, isDarkMode } = useUserSettings();
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [entries, setEntries] = useState<FeedlyEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
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
  const {
    backgroundClassName,
    primaryTextClass,
    mutedTextClass,
    subtleTextClass,
    panelClass,
    panelInnerBorderClass,
    rowHoverClass,
    rowSelectedClass,
    controlClass,
  } = useMemo(() => getUiThemeTokens(isDarkMode, settings.backgroundPreset), [isDarkMode, settings.backgroundPreset]);

  const sortedEntries = useMemo(() => sortEntriesByOrder(entries, sortOrder), [entries, sortOrder]);

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
    const sortedLoadedEntries = sortEntriesByOrder(loadedEntries, sortOrder);
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

  function handleSelectEntry(entry: FeedlyEntry) {
    setSelectedEntryId(entry.id);
  }

  async function handleSelectFeed(feedId: string) {
    setSelectedFeedId(feedId);
    await loadEntries(feedId, getArticleCountForFeed(feedId));
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

  function handleDefaultArticleCountChange(nextCount: ArticleCountOption) {
    if (selectedFeedId && !(selectedFeedId in articleCountByFeed)) {
      void loadEntries(selectedFeedId, nextCount);
    }
  }

  function handleSortOrderChange(value: "newest" | "oldest") {
    setSettings((current) => ({
      ...current,
      sortOrder: value,
    }));
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
    if (!selectedEntry?.url) {
      setEmbedStatus("idle");
      setEmbedBlockReason(null);
      return;
    }

    void checkEmbeddable(selectedEntry.url);
  }, [checkEmbeddable, selectedEntry]);

  const {
    pendingReadQueue,
    pendingReadIds,
    isSyncingReads,
    handleMarkSelectedAsRead,
    handleMarkAllVisibleAsRead,
    handleSyncReads,
  } = useReadQueue({
    entries,
    selectedEntry,
    selectedEntryId,
    selectedFeedId,
    allFeedsId: ALL_FEEDS_ID,
    setEntries,
    setSelectedEntryId,
    setFeeds,
    setError,
  });

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
          <FeedSidebar
            isLoadingFeeds={isLoadingFeeds}
            feeds={feeds}
            groupedFeeds={groupedFeeds}
            isCompactMode={isCompactMode}
            panelClass={panelClass}
            panelInnerBorderClass={panelInnerBorderClass}
            primaryTextClass={primaryTextClass}
            mutedTextClass={mutedTextClass}
            subtleTextClass={subtleTextClass}
            rowHoverClass={rowHoverClass}
            rowSelectedClass={rowSelectedClass}
            isDarkMode={isDarkMode}
            allFeedsId={ALL_FEEDS_ID}
            isAllFeedsSelected={isAllFeedsSelected}
            allFeedsUnreadCount={allFeedsUnreadCount}
            selectedFeedId={selectedFeedId}
            collapsedCategories={collapsedCategories}
            expandedGroups={expandedGroups}
            onSelectFeed={handleSelectFeed}
            onToggleCategoryCollapse={toggleCategoryCollapse}
            onToggleGroup={toggleGroup}
          />

          <ArticlePane
            panelClass={panelClass}
            isCompactMode={isCompactMode}
            error={error}
            selectedFeedId={selectedFeedId}
            isLoadingEntries={isLoadingEntries}
            sortedEntries={sortedEntries}
            selectedFeedTitle={selectedFeedTitle}
            primaryTextClass={primaryTextClass}
            mutedTextClass={mutedTextClass}
            subtleTextClass={subtleTextClass}
            controlClass={controlClass}
            sortOrder={sortOrder}
            onSortOrderChange={handleSortOrderChange}
            selectedFeedArticleCount={selectedFeedArticleCount}
            articleCountOptions={ARTICLE_COUNT_OPTIONS}
            onArticleCountChange={handleArticleCountChange}
            isDarkMode={isDarkMode}
            rowHoverClass={rowHoverClass}
            rowSelectedClass={rowSelectedClass}
            selectedEntryId={selectedEntryId}
            pendingReadIds={pendingReadIds}
            onSelectEntry={handleSelectEntry}
            formatAgeDays={formatAgeDays}
            isSyncingReads={isSyncingReads}
            onMarkSelectedAsRead={handleMarkSelectedAsRead}
            embedStatus={embedStatus}
            embedBlockReason={embedBlockReason}
            onMarkAllVisibleAsRead={handleMarkAllVisibleAsRead}
          />
        </section>
      )}

      <SettingsPanel
        settings={settings}
        setSettings={setSettings}
        isDarkMode={isDarkMode}
        primaryTextClass={primaryTextClass}
        mutedTextClass={mutedTextClass}
        subtleTextClass={subtleTextClass}
        panelClass={panelClass}
        controlClass={controlClass}
        articleCountOptions={ARTICLE_COUNT_OPTIONS}
        onDefaultArticleCountChange={handleDefaultArticleCountChange}
      />
      </div>
    </main>
  );
}
