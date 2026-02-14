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
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [entries, setEntries] = useState<FeedlyEntry[]>([]);
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

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId]
  );

  const pendingReadIds = useMemo(
    () => new Set(pendingReadQueue.map((item) => item.entryId)),
    [pendingReadQueue]
  );

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

  const loadEntries = useCallback(async (streamId: string) => {
    setIsLoadingEntries(true);
    setError(null);

    const response = await fetch(`/api/feedly/articles?streamId=${encodeURIComponent(streamId)}`, { cache: "no-store" });

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
    setEntries(loadedEntries);
    setSelectedEntryId((currentSelectedId) => {
      if (loadedEntries.some((entry) => entry.id === currentSelectedId)) {
        return currentSelectedId;
      }

      return loadedEntries[0]?.id ?? null;
    });
    setIsLoadingEntries(false);
  }, []);

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
      loadedFeeds.find((feed) => feed.id === selectedFeedId)?.id ??
      loadedFeeds.find((feed) => feed.unreadCount > 0)?.id ??
      loadedFeeds[0]?.id ??
      null;
    setSelectedFeedId(nextFeedId);

    if (nextFeedId) {
      await loadEntries(nextFeedId);
    } else {
      setEntries([]);
      setSelectedEntryId(null);
    }

    setIsLoadingFeeds(false);
  }, [loadEntries, selectedFeedId]);

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
    const currentSelectedFeedId = selectedFeedId;

    if (!currentSelectedFeedId) {
      return;
    }

    setPendingReadQueue((currentQueue) => {
      if (!checked) {
        return currentQueue.filter((item) => item.entryId !== currentSelectedEntryId);
      }

      if (currentQueue.some((item) => item.entryId === currentSelectedEntryId)) {
        return currentQueue;
      }

      return [...currentQueue, { entryId: currentSelectedEntryId, feedId: currentSelectedFeedId }];
    });
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

      setEntries((current) => {
        const remaining = current.filter((entry) => !readIds.has(entry.id));
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

      setPendingReadQueue([]);
    } catch {
      setError("Unable to sync read articles.");
    } finally {
      setIsSyncingReads(false);
    }
  }

  async function handleSelectFeed(feedId: string) {
    setSelectedFeedId(feedId);
    await loadEntries(feedId);
  }

  function toggleGroup(groupName: string) {
    setExpandedGroups((current) => ({
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
    if (!selectedEntry?.url) {
      setEmbedStatus("idle");
      setEmbedBlockReason(null);
      return;
    }

    void checkEmbeddable(selectedEntry.url);
  }, [checkEmbeddable, selectedEntry]);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BTJ RSS Reader</h1>
          <p className="text-sm text-slate-600">Select a feed, open an article, mark as read locally, then sync.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadFeeds()}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700"
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
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold">Connect Feedly</h2>
          <p className="mb-4 text-sm text-slate-600">Authorize the app to load your unread entries.</p>
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
          <aside className="overflow-auto rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Feeds</h2>
            </div>
            {isLoadingFeeds ? (
              <p className="p-4 text-sm text-slate-500">Loading feeds...</p>
            ) : feeds.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No subscriptions found.</p>
            ) : (
              <div className="pb-2">
                {groupedFeeds.map((group) => (
                  <section key={group.groupName} className="border-b border-slate-100 last:border-b-0">
                    <h3 className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {group.groupName}
                    </h3>
                    <ul>
                      {(expandedGroups[group.groupName]
                        ? group.feeds
                        : group.feeds.filter((feed) => feed.unreadCount > 0 || feed.id === selectedFeedId)
                      ).map((feed) => (
                        <li key={feed.id}>
                          <button
                            type="button"
                            onClick={() => void handleSelectFeed(feed.id)}
                            className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                              selectedFeedId === feed.id ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-700"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="line-clamp-2">{feed.title}</p>
                              <span className="shrink-0 text-[11px] text-slate-500">{feed.unreadCount}</span>
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
                            className="w-full px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                          >
                            {hiddenCount} more feeds
                          </button>
                        );
                      })()
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.groupName)}
                        className="w-full px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                      >
                        Show fewer feeds
                      </button>
                    )}
                  </section>
                ))}
              </div>
            )}
          </aside>

          <article className="rounded-lg border border-slate-200 bg-white p-4 md:p-6">
            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : !selectedFeed ? (
              <p className="text-sm text-slate-500">Select a feed from the left navigation.</p>
            ) : isLoadingEntries ? (
              <p className="text-sm text-slate-500">Loading unread articles...</p>
            ) : entries.length === 0 ? (
              <>
                <h2 className="text-lg font-semibold text-slate-900">{selectedFeed.title}</h2>
                <p className="mt-3 text-sm text-slate-500">No unread articles in this feed.</p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-slate-900">{selectedFeed.title}</h2>
                <ul className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => void handleSelectEntry(entry)}
                        className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 ${
                          selectedEntryId === entry.id ? "bg-slate-100" : ""
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            pendingReadIds.has(entry.id) ? "text-slate-400 line-through" : "text-slate-900"
                          }`}
                        >
                          {entry.title}
                        </span>
                        <span
                          className={`shrink-0 text-xs ${
                            pendingReadIds.has(entry.id) ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {formatAgeDays(entry.ageTimestamp)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                {selectedEntry ? (
                  <section className="mt-5 rounded-md border border-slate-200">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{selectedEntry.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">{selectedEntry.source}</p>
                      </div>
                      <label className="flex shrink-0 items-center gap-2 text-xs text-slate-700">
                        <input
                          key={selectedEntry.id}
                          type="checkbox"
                          className="h-4 w-4"
                          disabled={isSyncingReads}
                          checked={pendingReadIds.has(selectedEntry.id)}
                          onChange={(event) => void handleMarkSelectedAsRead(event.target.checked)}
                        />
                        Mark as read
                      </label>
                    </div>

                    {selectedEntry.url ? (
                      embedStatus === "embeddable" ? (
                        <iframe
                          title={selectedEntry.title}
                          src={selectedEntry.url}
                          className="h-[62vh] w-full"
                        />
                      ) : embedStatus === "checking" ? (
                        <div className="flex h-[62vh] items-center justify-center px-4 py-3 text-sm text-slate-500">
                          Checking if this article can be displayed in webview...
                        </div>
                      ) : (
                        <div className="max-h-[62vh] overflow-auto px-4 py-3">
                          <p className="text-sm text-slate-700">
                            {embedBlockReason ?? "This site cannot be embedded in a webview."}
                          </p>
                          <a
                            href={selectedEntry.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                          >
                            Open Original Article
                          </a>
                          <div className="mt-4 border-t border-slate-200 pt-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
                            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{selectedEntry.summary}</p>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="max-h-[62vh] overflow-auto px-4 py-3">
                        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{selectedEntry.summary}</p>
                      </div>
                    )}
                  </section>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">Select an article title above to open it.</p>
                )}
              </>
            )}
          </article>
        </section>
      )}
    </main>
  );
}
