import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./translate.css";

type Props = {
  text: string;
  language: "en" | "vi";
  currentTranslation: string;
  duration: number;
  onApply: (
    translation: string,
    originalText: string,
    originalTranslation: string,
  ) => void;
};
const languages = [
  ["en", "English"],
  ["vi", "Tiếng Việt"],
  ["ko", "한국어"],
  ["zh", "中文"],
] as const;

export function Translate({
  text,
  language,
  currentTranslation,
  duration,
  onApply,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [source, setSource] = useState("en");
  const [target, setTarget] = useState("vi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const vi = language === "vi";
  const validDuration = Number.isFinite(duration) && duration > 0 && duration <= 3600;
  async function translate() {
    setBusy(true);
    setError("");
    const original = text;
    const previousTranslation = currentTranslation;
    try {
      const result = await invoke<string>("translate_text", {
        text: original,
        sourceLanguage: source,
        targetLanguage: target,
        durationSeconds: validDuration ? duration : null,
      });
      onApply(result, original, previousTranslation);
      setVisible(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="translate-trigger"
        disabled={!text.trim()}
        onClick={() => {
          setError("");
          setVisible(true);
        }}
      >
        {vi ? "Dịch bằng Google" : "Translate with Google"}
      </button>
      {visible && (
        <div className="overlay translate-overlay">
          <div
            className="modal translate-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="translate-title"
          >
            <h2 id="translate-title">
              {vi ? "Dịch trực tuyến" : "Online translation"}
            </h2>
            <p>
              {vi
                ? "Lời thoại này sẽ được gửi tới Google qua Gemini API. Nội dung ở gói miễn phí có thể được Google dùng để cải thiện sản phẩm. Chỉ gửi khi bạn chọn Dịch."
                : "This line will be sent to Google through the Gemini API. Google may use free-tier content to improve its products. It is sent only when you choose Translate."}
            </p>
            <p className="translate-preview">{text}</p>
            {validDuration && <p>
              {vi
                ? `Bản dịch sẽ ưu tiên tự nhiên và phù hợp khoảng ${duration.toFixed(2)} giây. Thời lượng thực tế cần kiểm tra sau khi tạo giọng nói.`
                : `The translation will aim to sound natural within about ${duration.toFixed(2)} seconds. Check the actual duration after generating speech.`}
            </p>}
            <fieldset disabled={busy}>
              <legend>{vi ? "Ngôn ngữ gốc" : "Source language"}</legend>
              <div className="translate-languages">
                {languages.map(([code, label]) => (
                  <button
                    type="button"
                    className={source === code ? "chosen" : ""}
                    aria-pressed={source === code}
                    key={code}
                    onClick={() => setSource(code)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset disabled={busy}>
              <legend>{vi ? "Ngôn ngữ đích" : "Target language"}</legend>
              <div className="translate-languages">
                {languages.map(([code, label]) => (
                  <button
                    type="button"
                    className={target === code ? "chosen" : ""}
                    aria-pressed={target === code}
                    key={code}
                    onClick={() => setTarget(code)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="translate-error">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setVisible(false)}
              >
                {vi ? "Hủy" : "Cancel"}
              </button>
              <button
                className="primary"
                disabled={busy || source === target}
                onClick={translate}
              >
                {busy
                  ? vi
                    ? "Đang dịch…"
                    : "Translating…"
                  : vi
                    ? "Dịch và gửi"
                    : "Send and translate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
