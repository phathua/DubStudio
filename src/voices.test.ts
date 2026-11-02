import { describe, expect, it } from "vitest";
import voices from "./voices.json";

describe("VieNeu voice catalog", () => {
  it("contains unique selectable preset identifiers and descriptions", () => {
    expect(voices).toHaveLength(25);
    expect(new Set(voices.map((voice) => voice.id)).size).toBe(voices.length);
    expect(voices.every((voice) => voice.id && voice.description)).toBe(true);
    expect(voices.find((voice) => voice.id === "Mai Anh")?.gender).toBe(
      "female",
    );
    expect(voices.find((voice) => voice.id === "Hải Đăng")?.gender).toBe(
      "male",
    );
  });
});
