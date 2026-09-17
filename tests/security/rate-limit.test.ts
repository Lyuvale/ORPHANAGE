import { describe, it, expect } from "vitest";
import { createRateLimiter, clientIp } from "@/lib/security/rate-limit";

describe("rate-limit", () => {
  it("allows requests up to the limit then blocks", () => {
    const limiter = createRateLimiter(3, 60_000);
    expect(limiter("ip-a").allowed).toBe(true);
    expect(limiter("ip-a").allowed).toBe(true);
    expect(limiter("ip-a").allowed).toBe(true);
    const blocked = limiter("ip-a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter(2, 60_000);
    expect(limiter("ip-a").allowed).toBe(true);
    expect(limiter("ip-a").allowed).toBe(true);
    expect(limiter("ip-a").allowed).toBe(false);
    expect(limiter("ip-b").allowed).toBe(true);
  });

  it("resets after the window elapses", async () => {
    const limiter = createRateLimiter(1, 10);
    expect(limiter("k").allowed).toBe(true);
    expect(limiter("k").allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(limiter("k").allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers the first x-forwarded-for entry", () => {
    const req = new Request("https://x/api", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(clientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip then unknown", () => {
    const reqReal = new Request("https://x/api", { headers: { "x-real-ip": "198.51.100.9" } });
    expect(clientIp(reqReal)).toBe("198.51.100.9");
    expect(clientIp(new Request("https://x/api"))).toBe("unknown");
  });
});