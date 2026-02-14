import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getRequiredEnv, setAuthCookies } from "@/lib/feedly";

type FeedlyTokenResponse = {
  access_token: string;
  refresh_token?: string;
  id?: string;
  expires_in?: number;
};

export async function GET(request: NextRequest) {
  const clientId = getRequiredEnv("FEEDLY_CLIENT_ID");
  const clientSecret = getRequiredEnv("FEEDLY_CLIENT_SECRET");
  const redirectUri = getRequiredEnv("FEEDLY_REDIRECT_URI");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, request.url));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("feedly_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/?error=invalid_oauth_state", request.url));
  }

  const tokenResponse = await fetch("https://cloud.feedly.com/v3/auth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url));
  }

  const tokenPayload = (await tokenResponse.json()) as FeedlyTokenResponse;

  await setAuthCookies({
    accessToken: tokenPayload.access_token,
    refreshToken: tokenPayload.refresh_token,
    userId: tokenPayload.id,
    expiresIn: tokenPayload.expires_in,
  });

  cookieStore.delete("feedly_oauth_state");
  return NextResponse.redirect(new URL("/", request.url));
}
