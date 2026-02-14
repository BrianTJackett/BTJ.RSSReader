import { cookies } from "next/headers";

const FEEDLY_BASE_URL = process.env.FEEDLY_BASE_URL ?? "https://cloud.feedly.com";
const FEEDLY_ACCESS_TOKEN = process.env.FEEDLY_ACCESS_TOKEN?.trim() || null;
const ACCESS_TOKEN_COOKIE = "feedly_access_token";
const REFRESH_TOKEN_COOKIE = "feedly_refresh_token";
const USER_ID_COOKIE = "feedly_user_id";

export function getRequiredEnv(name: "FEEDLY_CLIENT_ID" | "FEEDLY_CLIENT_SECRET" | "FEEDLY_REDIRECT_URI"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? FEEDLY_ACCESS_TOKEN;
}

export async function setAuthCookies(payload: {
  accessToken: string;
  refreshToken?: string;
  userId?: string;
  expiresIn?: number;
}) {
  const cookieStore = await cookies();
  const maxAge = payload.expiresIn ? Math.max(payload.expiresIn - 60, 60) : 60 * 60;

  cookieStore.set(ACCESS_TOKEN_COOKIE, payload.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  if (payload.refreshToken) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, payload.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (payload.userId) {
    cookieStore.set(USER_ID_COOKIE, payload.userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(USER_ID_COOKIE);
}

export async function feedlyRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("UNAUTHORIZED");
  }

  const response = await fetch(`${FEEDLY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    if (!FEEDLY_ACCESS_TOKEN) {
      await clearAuthCookies();
    }
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Feedly request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}
