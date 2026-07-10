import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLiveGame } from "./useLiveGame";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  onmessage: ((evt: { data: string }) => void) | null = null;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
}

describe("useLiveGame", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not open a socket when wsPath is null", () => {
    renderHook(() => useLiveGame(null, vi.fn()));
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("opens a socket at the ws:// URL derived from the API base plus the path", () => {
    renderHook(() => useLiveGame("/ws/games/football/1/", vi.fn()));

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe("ws://localhost:8001/ws/games/football/1/");
  });

  it("calls onTick with the parsed JSON payload from an incoming message", () => {
    const onTick = vi.fn();
    renderHook(() => useLiveGame("/ws/games/football/1/", onTick));

    const socket = FakeWebSocket.instances[0];
    socket.onmessage?.({ data: JSON.stringify({ minute: 10, home_score: 1 }) });

    expect(onTick).toHaveBeenCalledWith({ minute: 10, home_score: 1 });
  });

  it("swallows a malformed message instead of calling onTick", () => {
    const onTick = vi.fn();
    renderHook(() => useLiveGame("/ws/games/football/1/", onTick));

    const socket = FakeWebSocket.instances[0];
    expect(() => socket.onmessage?.({ data: "not json" })).not.toThrow();
    expect(onTick).not.toHaveBeenCalled();
  });

  it("closes the socket on unmount", () => {
    const { unmount } = renderHook(() => useLiveGame("/ws/games/football/1/", vi.fn()));
    const socket = FakeWebSocket.instances[0];

    unmount();

    expect(socket.close).toHaveBeenCalled();
  });
});
