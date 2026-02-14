import { NextRequest, NextResponse } from "next/server";
import { feedlyRequest } from "@/lib/feedly";
import type { FeedlyEntry } from "@/types/feedly";

type FeedlyStreamItem = {
  id: string;
  title?: string;
  summary?: { content?: string };
  content?: { content?: string };
  alternate?: Array<{ href?: string }>;
  canonical?: Array<{ href?: string }>;
  origin?: { title?: string; streamId?: string };
  published?: number;
  updated?: number;
  crawled?: number;
};

type FeedlyStreamResponse = {
  items?: FeedlyStreamItem[];
};

type FeedlyProfile = {
  id?: string;
};

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const requestedCount = Number(request.nextUrl.searchParams.get("count") ?? "10");
  const count = [10, 25, 50, 100].includes(requestedCount) ? requestedCount : 10;
  const requestedStreamId = request.nextUrl.searchParams.get("streamId");

  try {
    let streamId = requestedStreamId;

    if (!streamId) {
      const profile = await feedlyRequest<FeedlyProfile>("/v3/profile");
      const profileId = profile.id;

      if (!profileId) {
        return NextResponse.json({ error: "Unable to resolve Feedly profile id." }, { status: 500 });
      }

      streamId = `user/${profileId}/category/global.all`;
    }

    const data = await feedlyRequest<FeedlyStreamResponse>(
      `/v3/streams/contents?streamId=${encodeURIComponent(streamId)}&count=${count}&ranked=newest&unreadOnly=true`
    );

    const entries: FeedlyEntry[] = (data.items ?? []).map((item) => {
      const published = item.published ?? Date.now();
      const ageTimestamp = item.crawled ?? item.updated ?? published;

      return {
        id: item.id,
        feedId: item.origin?.streamId ?? "",
        title: item.title ?? "(Untitled)",
        summary: stripHtml(item.summary?.content ?? item.content?.content ?? "No preview available."),
        source: item.origin?.title ?? "Unknown source",
        published,
        ageTimestamp,
        url: item.canonical?.[0]?.href ?? item.alternate?.[0]?.href ?? "",
      };
    });

    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load entries.";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
