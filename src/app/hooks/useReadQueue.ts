"use client";

import { useMemo, useState } from "react";
import type { FeedlyEntry, FeedlyFeed } from "@/types/feedly";

type QueueItem = {
  entryId: string;
  feedId: string;
};

type UseReadQueueParams = {
  entries: FeedlyEntry[];
  selectedEntry: FeedlyEntry | null;
  selectedEntryId: string | null;
  selectedFeedId: string | null;
  allFeedsId: string;
  setEntries: React.Dispatch<React.SetStateAction<FeedlyEntry[]>>;
  setSelectedEntryId: React.Dispatch<React.SetStateAction<string | null>>;
  setFeeds: React.Dispatch<React.SetStateAction<FeedlyFeed[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

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

export function useReadQueue({
  entries,
  selectedEntry,
  selectedEntryId,
  selectedFeedId,
  allFeedsId,
  setEntries,
  setSelectedEntryId,
  setFeeds,
  setError,
}: UseReadQueueParams) {
  const [pendingReadQueue, setPendingReadQueue] = useState<QueueItem[]>([]);
  const [isSyncingReads, setIsSyncingReads] = useState(false);

  const pendingReadIds = useMemo(
    () => new Set(pendingReadQueue.map((item) => item.entryId)),
    [pendingReadQueue]
  );

  function handleMarkSelectedAsRead(checked: boolean) {
    if (!selectedEntry) {
      return;
    }

    const currentSelectedEntryId = selectedEntry.id;
    const currentSelectedFeedId = selectedEntry.feedId || selectedFeedId;

    if (!currentSelectedFeedId || currentSelectedFeedId === allFeedsId) {
      return;
    }

    if (!checked) {
      setPendingReadQueue((currentQueue) =>
        currentQueue.filter((item) => item.entryId !== currentSelectedEntryId)
      );
      return;
    }

    if (pendingReadIds.has(currentSelectedEntryId)) {
      return;
    }

    setPendingReadQueue((currentQueue) => [
      ...currentQueue,
      { entryId: currentSelectedEntryId, feedId: currentSelectedFeedId },
    ]);
  }

  function handleMarkAllVisibleAsRead() {
    if (isSyncingReads || entries.length === 0) {
      return;
    }

    const queueCandidates = entries
      .map((entry) => {
        const resolvedFeedId = entry.feedId || (selectedFeedId !== allFeedsId ? selectedFeedId : null);
        if (!resolvedFeedId || resolvedFeedId === allFeedsId) {
          return null;
        }

        return {
          entryId: entry.id,
          feedId: resolvedFeedId,
        };
      })
      .filter((item): item is QueueItem => item !== null)
      .filter((item) => !pendingReadIds.has(item.entryId));

    if (queueCandidates.length === 0) {
      return;
    }

    setPendingReadQueue((currentQueue) => [...currentQueue, ...queueCandidates]);
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

  return {
    pendingReadQueue,
    pendingReadIds,
    isSyncingReads,
    handleMarkSelectedAsRead,
    handleMarkAllVisibleAsRead,
    handleSyncReads,
  };
}
