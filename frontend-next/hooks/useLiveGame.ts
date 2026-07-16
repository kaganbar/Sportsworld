"use client";

import { useEffect, useRef } from "react";

// Same origin as NEXT_PUBLIC_API_URL, just ws(s):// instead of http(s)://
const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001").replace(/^http/, "ws");

// If the server/network drops the connection unexpectedly, retry after this
// delay rather than leaving the page silently stale for the rest of the
// session — a real gap this app hit directly during development (backend
// container restarts close every open client socket).
const RECONNECT_DELAY_MS = 3000;

/**
 * Opens a WebSocket at `wsPath` and calls `onTick` with each parsed JSON
 * message. Pass `null` for `wsPath` to skip connecting entirely (e.g. the
 * game isn't "live"). `onTick` is called via a ref so the caller can pass a
 * fresh closure every render without reopening the socket — it should call
 * its own setState using the functional updater form to avoid stale state.
 *
 * Reconnects automatically on an unexpected close (server restart, network
 * blip) — the live ticker keeps advancing games server-side regardless of
 * any one client's connection, so a dropped socket that never reconnects
 * would otherwise leave the page frozen on stale scores indefinitely, with
 * no error and no recovery, until the user manually reloads.
 */
export function useLiveGame(wsPath: string | null, onTick: (payload: any) => void) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!wsPath) return;

    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      ws = new WebSocket(`${WS_BASE}${wsPath}`);
      ws.onmessage = (evt) => {
        try {
          onTickRef.current(JSON.parse(evt.data));
        } catch {
          // malformed frame — ignore rather than crash the page
        }
      };
      ws.onclose = () => {
        if (cancelled) return;
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [wsPath]);
}
