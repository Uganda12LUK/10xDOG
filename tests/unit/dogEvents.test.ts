import { describe, expect, it } from "vitest";
import { nextOccurrence } from "@/lib/dogEventAttributes";

// `from` is pinned so the tests are deterministic regardless of the real date.
const FROM = new Date(Date.UTC(2026, 9, 18)); // 2026-10-18

describe("nextOccurrence", () => {
  it("returns a future one-off date as-is", () => {
    expect(nextOccurrence("2026-12-01", "none", 1, FROM)).toBe("2026-12-01");
  });

  it("returns today for a one-off dated today", () => {
    expect(nextOccurrence("2026-10-18", "none", 1, FROM)).toBe("2026-10-18");
  });

  it("returns null for a past one-off (no future occurrence)", () => {
    expect(nextOccurrence("2026-01-01", "none", 1, FROM)).toBeNull();
  });

  it("rolls a yearly event forward to the next anniversary (every year)", () => {
    // first shot 2024-05-10 → next on/after 2026-10-18 is 2027-05-10
    expect(nextOccurrence("2024-05-10", "yearly", 1, FROM)).toBe("2027-05-10");
  });

  it("honors a multi-year interval (e.g. every 3 years)", () => {
    // 2025-05-10 + 3y = 2028-05-10 (2025 start is before FROM, +3y clears it)
    expect(nextOccurrence("2025-05-10", "yearly", 3, FROM)).toBe("2028-05-10");
  });

  it("rolls monthly and weekly forward past `from`", () => {
    expect(nextOccurrence("2026-10-01", "monthly", 1, FROM)).toBe("2026-11-01");
    expect(nextOccurrence("2026-10-14", "weekly", 1, FROM)).toBe("2026-10-21");
  });

  it("keeps a future recurring start untouched", () => {
    expect(nextOccurrence("2026-11-20", "yearly", 1, FROM)).toBe("2026-11-20");
  });

  it("returns null for an unparseable date", () => {
    expect(nextOccurrence("not-a-date", "none", 1, FROM)).toBeNull();
  });
});
