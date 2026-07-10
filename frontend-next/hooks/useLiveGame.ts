"use client";

import { useEffect, useRef } from "react";

// Same origin as NEXT_PUBLIC_API_URL, just ws(s):// instead of http(s)://
const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001").replace(/^http/, "ws");

/**
 * Opens a WebSocket at `wsPath` and calls `onTick` with each parsed JSON
 * message. Pass `null` for `wsPath` to skip connecting entirely (e.g. the
 * game isn't "live"). `onTick` is called via a ref so the caller can pass a
 * fresh closure every render without reopening the socket — it should call
 * its own setState using the functional updater form to avoid stale state.
 */
export function useLiveGame(wsPath: string | null, onTick: (payload: any) => void) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!wsPath) return;
    const ws = new WebSocket(`${WS_BASE}${wsPath}`);
    ws.onmessage = (evt) => {
      try {
        onTickRef.current(JSON.parse(evt.data));
      } catch {
        // malformed frame — ignore rather than crash the page
      }
    };
    return () => ws.close();
  }, [wsPath]);
}
