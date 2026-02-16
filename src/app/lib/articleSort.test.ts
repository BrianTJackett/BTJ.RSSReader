import { sortEntriesByOrder } from "@/app/lib/articleSort";
import type { FeedlyEntry } from "@/types/feedly";

function createEntry(id: string, ageTimestamp: number): FeedlyEntry {
  return {
    id,
    feedId: "feed/1",
    title: `entry-${id}`,
    summary: "summary",
    source: "source",
    published: ageTimestamp,
    ageTimestamp,
    url: "https://example.com",
  };
}

describe("sortEntriesByOrder", () => {
  it("sorts newest first", () => {
    const input = [createEntry("a", 100), createEntry("b", 500), createEntry("c", 300)];

    const sorted = sortEntriesByOrder(input, "newest");

    expect(sorted.map((entry) => entry.id)).toEqual(["b", "c", "a"]);
  });

  it("sorts oldest first", () => {
    const input = [createEntry("a", 100), createEntry("b", 500), createEntry("c", 300)];

    const sorted = sortEntriesByOrder(input, "oldest");

    expect(sorted.map((entry) => entry.id)).toEqual(["a", "c", "b"]);
  });

  it("does not mutate original array", () => {
    const input = [createEntry("a", 100), createEntry("b", 500), createEntry("c", 300)];

    void sortEntriesByOrder(input, "newest");

    expect(input.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });
});
