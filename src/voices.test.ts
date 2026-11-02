import { describe, expect, it } from "vitest";
import voices from "./data/voices";
import models from "./data/models";

describe("TTS Multi-Model voice catalog", () => {
  it("contains unique selectable preset identifiers and descriptions", () => {
    expect(voices.length).toBeGreaterThanOrEqual(130);
    expect(new Set(voices.map((voice) => voice.id)).size).toBe(voices.length);
    expect(
      voices.every((voice) => voice.id && voice.description && voice.model)
    ).toBe(true);
  });

  it("includes all requested TTS model families with accurate metadata", () => {
    const modelNames = Array.from(new Set(voices.map((v) => v.model)));
    expect(modelNames).toContain("VieNeu-TTS v3 Turbo");
    expect(modelNames).toContain("Kokoro-82M");
    expect(modelNames).toContain("Piper TTS");
    expect(modelNames).toContain("CosyVoice 2");
    expect(modelNames).toContain("F5-TTS");
    expect(modelNames).toContain("GPT-SoVITS");
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
    expect(voices.find((v) => v.id === "vi_VN-vais1000-medium")?.modelId).toBe(
      "piper"
    );
    expect(voices.find((v) => v.id === "cosy_zh_female")?.modelId).toBe(
      "cosyvoice"
    );
    expect(voices.find((v) => v.id === "f5_basic_ref_en")?.modelId).toBe(
      "f5-tts"
    );
    expect(voices.find((v) => v.id === "gpt_sovits_clone")?.modelId).toBe(
      "gpt-sovits"
    );
  });

  it("specifies minimum hardware requirements for every voice entry", () => {
    expect(
      voices.every((v) => typeof v.minRamGb === "number" && v.minRamGb > 0)
    ).toBe(true);
    expect(
      voices.every((v) => typeof v.minVramGb === "number" && v.minVramGb >= 0)
    ).toBe(true);
  });
});

describe("AI 27-Model Catalog (TypeScript Data)", () => {
  it("contains all 27 models across ASR, Separation, Diarization, and TTS", () => {
    expect(models).toHaveLength(27);
    const categories = new Set(models.map((m) => m.category));
    expect(categories.has("asr")).toBe(true);
    expect(categories.has("separation")).toBe(true);
    expect(categories.has("diarization")).toBe(true);
    expect(categories.has("tts")).toBe(true);
  });

  it("specifies minimum RAM and VRAM for all models", () => {
    expect(models.every((m) => typeof m.ramMinGb === "number" && m.ramMinGb > 0)).toBe(true);
    expect(models.every((m) => typeof m.vramMinGb === "number" && m.vramMinGb >= 0)).toBe(true);
    expect(models.every((m) => m.operationalNotes && m.operationalNotes.length > 0)).toBe(true);
  });

  it("verifies ultra-light models can run on pure CPU with 0 VRAM", () => {
    const sherpa = models.find((m) => m.id === "sherpa-onnx");
    expect(sherpa?.vramMinGb).toBe(0);
    expect(sherpa?.ramMinGb).toBe(0.5);

    const piper = models.find((m) => m.id === "piper");
    expect(piper?.vramMinGb).toBe(0);
    expect(piper?.ramMinGb).toBe(0.5);

    const deepfilter = models.find((m) => m.id === "deepfilternet");
    expect(deepfilter?.vramMinGb).toBe(0);
  });
});
