const ACCESS_TOKEN_KEY = "sw_access_token";
const REFRESH_TOKEN_KEY = "sw_refresh_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export interface Me {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

// Returns null both when logged out and when the stored token is rejected
// (expired/invalid) — callers show the same "sign in" state either way, no
// refresh-token retry loop yet (light-touch verification for Phase 4, not a
// full session-management system).
export async function fetchMe(): Promise<Me | null> {
  const token = getAccessToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  return res.json();
}

export function googleLoginUrl(): string {
  return `${API_URL}/api/auth/google`;
}
