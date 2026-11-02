import { describe, expect, it } from "vitest";
import voices from "./voices.json";

describe("TTS Multi-Model voice catalog", () => {
  it("contains unique selectable preset identifiers and descriptions", () => {
    expect(voices.length).toBeGreaterThanOrEqual(130);
    expect(new Set(voices.map((voice) => voice.id)).size).toBe(voices.length);
    expect(voices.every((voice) => voice.id && voice.description && voice.model)).toBe(true);
  });

  it("includes all requested TTS model families with accurate metadata", () => {
    const models = Array.from(new Set(voices.map((v) => v.model)));
    expect(models).toContain("VieNeu-TTS v3 Turbo");
    expect(models).toContain("Kokoro-82M");
    expect(models).toContain("Piper TTS");
    expect(models).toContain("CosyVoice 2");
    expect(models).toContain("F5-TTS");
    expect(models).toContain("GPT-SoVITS");
  });

  it("preserves VieNeu presets with verified genders and aliases", () => {
    const maiAnh = voices.find((voice) => voice.id === "Mai Anh");
    expect(maiAnh?.gender).toBe("female");
    expect(maiAnh?.modelId).toBe("vieneu");

    const haiDang = voices.find((voice) => voice.id === "Hải Đăng");
    expect(haiDang?.gender).toBe("male");
    expect(haiDang?.modelId).toBe("vieneu");
  });

  it("provides Kokoro, Piper, CosyVoice, F5-TTS and GPT-SoVITS voices", () => {
    expect(voices.find((v) => v.id === "af_heart")?.modelId).toBe("kokoro");
    expect(voices.find((v) => v.id === "vi_VN-vais1000-medium")?.modelId).toBe("piper");
    expect(voices.find((v) => v.id === "cosy_zh_female")?.modelId).toBe("cosyvoice");
    expect(voices.find((v) => v.id === "f5_basic_ref_en")?.modelId).toBe("f5-tts");
    expect(voices.find((v) => v.id === "gpt_sovits_clone")?.modelId).toBe("gpt-sovits");
  });

  it("specifies minimum hardware requirements for every entry", () => {
    expect(voices.every((v) => typeof v.minRamGb === "number" && v.minRamGb > 0)).toBe(true);
    expect(voices.every((v) => typeof v.minVramGb === "number" && v.minVramGb >= 0)).toBe(true);
  });
});
