import { NextRequest, NextResponse } from "next/server";

type EmbedCheckResult = {
  embeddable: boolean;
  reason?: string;
};

function isBlockedByXFrameOptions(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return normalized.includes("deny") || normalized.includes("sameorigin");
}

function isBlockedByCsp(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  const directives = normalized.split(";").map((directive) => directive.trim());
  const frameAncestors = directives.find((directive) => directive.startsWith("frame-ancestors"));

  if (!frameAncestors) {
    return false;
  }

  if (frameAncestors.includes("'none'")) {
    return true;
  }

  if (frameAncestors.includes("'self'")) {
    return true;
  }

  return false;
}

function evaluateHeaders(headers: Headers): EmbedCheckResult {
  const xFrameOptions = headers.get("x-frame-options");
  if (isBlockedByXFrameOptions(xFrameOptions)) {
    return {
      embeddable: false,
      reason: "This site disallows embedding (X-Frame-Options).",
    };
  }

  const csp = headers.get("content-security-policy");
  if (isBlockedByCsp(csp)) {
    return {
      embeddable: false,
      reason: "This site disallows embedding via Content Security Policy.",
    };
  }

  return { embeddable: true };
}

async function probeUrl(url: string): Promise<EmbedCheckResult> {
  try {
    const headResponse = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
    });

    return evaluateHeaders(headResponse.headers);
  } catch {
    try {
      const getResponse = await fetch(url, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
      });

      return evaluateHeaders(getResponse.headers);
    } catch {
      return {
        embeddable: false,
        reason: "Unable to verify embed permissions for this site.",
      };
    }
  }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")?.trim();

  if (!rawUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!/^https?:$/.test(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 });
  }

  const result = await probeUrl(parsedUrl.toString());
  return NextResponse.json(result);
}
