"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { Me, clearTokens, fetchMe, googleLoginUrl, storeTokens } from "./auth";

interface AuthValue {
  me: Me | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue>({
  me: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

/**
 * App-wide auth state over the preserved lib/auth.ts helpers. The backend uses
 * Google OAuth: `login()` sends the browser to the backend's /api/auth/google,
 * which after Google redirects back to /profile with ?accessToken&refreshToken.
 * On mount we pick those up (on whatever page they land), persist them, scrub
 * the URL, then resolve the current user via /api/auth/me. A rejected/expired
 * token resolves to `me: null` (fetchMe clears it) — same "signed out" state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get("accessToken");
    const refresh = params.get("refreshToken");
    if (access && refresh) {
      storeTokens(access, refresh);
      params.delete("accessToken");
      params.delete("refreshToken");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
    fetchMe()
      .then(setMe)
      .finally(() => setLoading(false));
  }, []);

  const login = () => {
    window.location.href = googleLoginUrl();
  };
  const logout = () => {
    clearTokens();
    setMe(null);
  };

  return <AuthContext.Provider value={{ me, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
