import { NextRequest, NextResponse } from "next/server";
import { feedlyRequest } from "@/lib/feedly";

type MarkReadBody = {
  entryId?: string;
  entryIds?: string[];
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as MarkReadBody;
  const entryIds = Array.from(new Set([...(body.entryIds ?? []), ...(body.entryId ? [body.entryId] : [])]));

  if (entryIds.length === 0) {
    return NextResponse.json({ error: "entryId or entryIds is required" }, { status: 400 });
  }

  try {
    await feedlyRequest<unknown>("/v3/markers", {
      method: "POST",
      body: JSON.stringify({
        action: "markAsRead",
        type: "entries",
        entryIds,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to mark entry as read.";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
