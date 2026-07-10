import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchGameDetail, fetchNews, fetchTodaysGames } from "./api";

// All 11 exported fetchers funnel through the same internal get<T>() helper,
// so these three (no-arg-ish, id-param, limit-param) are enough to prove the
// shared success/error path without redundantly repeating it 11 times.

function mockFetchOnce(response: Partial<Response> & { json: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue(response as Response);
}

describe("lib/api get<T> (via representative fetchers)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed JSON on a successful response", async () => {
    const games = [{ id: 1, competition: "Test League" }];
    mockFetchOnce({ ok: true, json: async () => games });

    const result = await fetchTodaysGames("en");

    expect(result).toEqual(games);
  });

  it("passes the id through the URL for a param-based fetcher", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ game: {} }) } as Response);
    global.fetch = fetchSpy;

    await fetchGameDetail("42", "he");

    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/api/games/42/?lang=he"));
  });

  it("throws ApiError with the status and the body's detail message on a non-ok response", async () => {
    mockFetchOnce({ ok: false, status: 404, json: async () => ({ detail: "Not found" }) });

    await expect(fetchNews()).rejects.toMatchObject({
      status: 404,
      message: "Not found",
    });
    await expect(fetchNews()).rejects.toBeInstanceOf(ApiError);
  });

  it("falls back to a generic HTTP {status} message when the error body can't be parsed", async () => {
    mockFetchOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("invalid json");
      },
    });

    await expect(fetchNews()).rejects.toMatchObject({
      status: 500,
      message: "HTTP 500",
    });
  });
});
