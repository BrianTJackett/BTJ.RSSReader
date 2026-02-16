import { act, renderHook, waitFor } from "@testing-library/react";
import { useReadQueue } from "@/app/hooks/useReadQueue";
import type { FeedlyEntry, FeedlyFeed } from "@/types/feedly";

function createEntry(id: string, feedId: string): FeedlyEntry {
  return {
    id,
    feedId,
    title: `title-${id}`,
    summary: "summary",
    source: "source",
    published: 1000,
    ageTimestamp: 1000,
    url: "https://example.com",
  };
}

describe("useReadQueue", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("queues selected entry when marking as read", () => {
    const selectedEntry = createEntry("entry-1", "feed-1");

    const { result } = renderHook(() =>
      useReadQueue({
        entries: [selectedEntry],
        selectedEntry,
        selectedEntryId: selectedEntry.id,
        selectedFeedId: "feed-1",
        allFeedsId: "__all__",
        setEntries: () => {},
        setSelectedEntryId: () => {},
        setFeeds: () => {},
        setError: () => {},
      })
    );

    act(() => {
      result.current.handleMarkSelectedAsRead(true);
    });

    expect(result.current.pendingReadQueue).toEqual([{ entryId: "entry-1", feedId: "feed-1" }]);
    expect(result.current.pendingReadIds.has("entry-1")).toBe(true);
  });

  it("queues all visible entries and deduplicates already queued items", () => {
    const entries = [createEntry("entry-1", "feed-1"), createEntry("entry-2", "feed-1")];

    const { result } = renderHook(() =>
      useReadQueue({
        entries,
        selectedEntry: entries[0],
        selectedEntryId: entries[0].id,
        selectedFeedId: "feed-1",
        allFeedsId: "__all__",
        setEntries: () => {},
        setSelectedEntryId: () => {},
        setFeeds: () => {},
        setError: () => {},
      })
    );

    act(() => {
      result.current.handleMarkSelectedAsRead(true);
    });

    act(() => {
      result.current.handleMarkAllVisibleAsRead();
    });

    expect(result.current.pendingReadQueue).toHaveLength(2);
    expect(result.current.pendingReadIds.has("entry-1")).toBe(true);
    expect(result.current.pendingReadIds.has("entry-2")).toBe(true);
  });

  it("syncs queued entries, removes them from list, and decrements feed unread counts", async () => {
    const entries = [createEntry("entry-1", "feed-1"), createEntry("entry-2", "feed-1")];
    let currentEntries = [...entries];
    let currentSelectedEntryId: string | null = "entry-1";
    let currentFeeds: FeedlyFeed[] = [
      { id: "feed-1", title: "Feed 1", groups: ["Group"], unreadCount: 5 },
      { id: "feed-2", title: "Feed 2", groups: ["Group"], unreadCount: 2 },
    ];
    let currentError: string | null = null;

    const setEntries: React.Dispatch<React.SetStateAction<FeedlyEntry[]>> = (next) => {
      currentEntries = typeof next === "function" ? next(currentEntries) : next;
    };
    const setSelectedEntryId: React.Dispatch<React.SetStateAction<string | null>> = (next) => {
      currentSelectedEntryId = typeof next === "function" ? next(currentSelectedEntryId) : next;
    };
    const setFeeds: React.Dispatch<React.SetStateAction<FeedlyFeed[]>> = (next) => {
      currentFeeds = typeof next === "function" ? next(currentFeeds) : next;
    };
    const setError: React.Dispatch<React.SetStateAction<string | null>> = (next) => {
      currentError = typeof next === "function" ? next(currentError) : next;
    };

    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    ) as unknown as typeof fetch;

    const { result } = renderHook(() =>
      useReadQueue({
        entries,
        selectedEntry: entries[0],
        selectedEntryId: currentSelectedEntryId,
        selectedFeedId: "feed-1",
        allFeedsId: "__all__",
        setEntries,
        setSelectedEntryId,
        setFeeds,
        setError,
      })
    );

    act(() => {
      result.current.handleMarkAllVisibleAsRead();
    });

    await act(async () => {
      await result.current.handleSyncReads();
    });

    await waitFor(() => {
      expect(currentEntries).toEqual([]);
      expect(currentSelectedEntryId).toBeNull();
      expect(currentFeeds.find((feed) => feed.id === "feed-1")?.unreadCount).toBe(3);
      expect(currentFeeds.find((feed) => feed.id === "feed-2")?.unreadCount).toBe(2);
      expect(currentError).toBeNull();
      expect(result.current.pendingReadQueue).toEqual([]);
    });
  });
});
