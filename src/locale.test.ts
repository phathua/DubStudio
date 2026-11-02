import { describe, expect, it } from "vitest";
import { resolveLanguage } from "./locale";

describe("language selection", () => {
  it("uses the system language with English fallback", () => {
    expect(resolveLanguage("system", ["vi-VN", "en-US"])).toBe("vi");
    expect(resolveLanguage("system", ["en-US", "vi-VN"])).toBe("en");
    expect(resolveLanguage("system", [])).toBe("en");
  });
  it("respects an explicit preference", () => {
    expect(resolveLanguage("en", ["vi-VN"])).toBe("en");
    expect(resolveLanguage("vi", ["en-US"])).toBe("vi");
  });
});
