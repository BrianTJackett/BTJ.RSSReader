import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getRequiredEnv } from "@/lib/feedly";

export async function GET() {
  try {
    const clientId = getRequiredEnv("FEEDLY_CLIENT_ID");
    const redirectUri = getRequiredEnv("FEEDLY_REDIRECT_URI");
    const scope = process.env.FEEDLY_SCOPE ?? "https://cloud.feedly.com/subscriptions";

    const state = randomUUID();
    const cookieStore = await cookies();
    cookieStore.set("feedly_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    const authUrl = new URL("https://cloud.feedly.com/v3/auth/auth");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl);
  } catch {
    return NextResponse.redirect(new URL("/?error=missing_feedly_config", process.env.FEEDLY_REDIRECT_URI ?? "http://localhost:3000"));
  }
}
