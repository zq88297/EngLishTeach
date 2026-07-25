import { describe, expect, it } from "vitest";

import { retryDelayMs } from "./localDatabase";

describe("sync retry policy", () => {
  it("uses bounded exponential backoff", () => {
    expect(retryDelayMs(0)).toBe(1_000);
    expect(retryDelayMs(3)).toBe(8_000);
    expect(retryDelayMs(20)).toBe(256_000);
  });
});

