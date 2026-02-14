import { NextResponse } from "next/server";
import { feedlyRequest } from "@/lib/feedly";
import type { FeedlyFeed } from "@/types/feedly";

type FeedlySubscription = {
  id?: string;
  title?: string;
  categories?: Array<{
    id?: string;
    label?: string;
  }>;
};

type FeedlyMarkerCountsResponse = {
  unreadcounts?: Array<{
    id?: string;
    count?: number;
  }>;
};

function inferGroups(subscription: FeedlySubscription): string[] {
  const groups = (subscription.categories ?? [])
    .map((category) => category.label?.trim() || category.id?.split("/").pop()?.replace(/^global\./, "") || "")
    .map((group) => group.trim())
    .filter(Boolean);

  return groups.length > 0 ? Array.from(new Set(groups)) : ["Ungrouped"];
}

export async function GET() {
  try {
    const data = await feedlyRequest<FeedlySubscription[]>("/v3/subscriptions");

    let unreadCountByStreamId = new Map<string, number>();
    try {
      const markerCounts = await feedlyRequest<FeedlyMarkerCountsResponse>("/v3/markers/counts");
      unreadCountByStreamId = new Map(
        (markerCounts.unreadcounts ?? [])
          .filter((item) => Boolean(item.id))
          .map((item) => [item.id ?? "", Math.max(0, item.count ?? 0)])
      );
    } catch {
      unreadCountByStreamId = new Map();
    }

    const feeds: FeedlyFeed[] = (data ?? [])
      .filter((subscription) => Boolean(subscription.id))
      .map((subscription) => ({
        id: subscription.id ?? "",
        title: subscription.title?.trim() || "Untitled feed",
        groups: inferGroups(subscription),
        unreadCount: unreadCountByStreamId.get(subscription.id ?? "") ?? 0,
      }))
      .sort((left, right) => left.title.localeCompare(right.title));

    return NextResponse.json({ feeds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load subscriptions.";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
