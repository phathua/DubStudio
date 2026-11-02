import { useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { CaretDown, FilmStrip, FolderOpen, Robot } from "@phosphor-icons/react";
import "./video-import.css";

type Props = {
  language: "vi" | "en";
  onClose: () => void;
  onCreated: (path: string) => void;
};

export function VideoImport({ language, onClose, onCreated }: Props) {
  const vi = language === "vi";
  const [path, setPath] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function chooseVideo() {
    try {
      setError("");
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Video",
            extensions: ["mp4", "mov", "mkv", "webm", "avi", "m4v"],
          },
        ],
      });
      if (typeof selected === "string") {
        setPath(selected);
        setName(
          selected
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.[^.]+$/, "") || "",
        );
      }
    } catch (e) {
      setError(String(e));
    }
  }

  async function create() {
    if (!path || !name.trim() || saving) return;
    try {
      setError("");
      setSaving(true);
      const destination = await save({
        defaultPath: `${name.trim().replace(/[\\/:*?"<>|]/g, "-")}.dub`,
        filters: [{ name: "DubStudio", extensions: ["dub"] }],
      });
      if (!destination) return;
      await invoke("create_project", {
        path: destination,
        name: name.trim(),
        videoPath: path,
      });
      onCreated(destination);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="overlay video-import-overlay"
      onMouseDown={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="modal video-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-import-title"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !saving) {
            e.stopPropagation();
            onClose();
          }
          if (e.key === "Tab") {
            const controls = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                "button:not(:disabled), input:not(:disabled)",
              ),
            );
            if (!controls.length) {
              e.preventDefault();
              return;
            }
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="modal-icon">
          <Robot size={24} />
        </div>
        <h2 id="video-import-title">{vi ? "Nhập video" : "Import video"}</h2>
        <p>
          {vi
            ? "Tạo dự án với video được tham chiếu tại vị trí hiện tại."
            : "Create a project that references the video at its current location."}
        </p>
        <button
          className="video-picker"
          onClick={chooseVideo}
          disabled={saving}
          autoFocus
        >
          {path ? <FilmStrip size={22} /> : <FolderOpen size={22} />}
          <span>
            {path
              ? path.split(/[\\/]/).pop()
              : vi
                ? "Chọn video"
                : "Choose video"}
          </span>
          <small>
            {path ? (vi ? "Thay đổi" : "Change") : "MP4, MOV, MKV, WebM"}
          </small>
        </button>
        <label className="field video-name">
          {vi ? "Tên dự án" : "Project name"}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            placeholder={vi ? "Đặt tên cho dự án" : "Name your project"}
          />
        </label>
        <div className="field video-target">
          <span id="video-target-label">
            {vi ? "Ngôn ngữ đích" : "Target language"}
          </span>
          <button
            type="button"
            className="video-target-select"
            disabled
            aria-labelledby="video-target-label video-target-value"
            aria-describedby="video-target-hint"
          >
            <span id="video-target-value">
              {vi ? "Chưa hỗ trợ" : "Not available yet"}
            </span>
            <CaretDown size={16} />
          </button>
          <small id="video-target-hint">
            {vi
              ? "Sẽ có khi tích hợp xử lý AI."
              : "Available when AI processing is integrated."}
          </small>
        </div>
        <div className="video-unavailable" role="note">
          <b>
            {vi
              ? "Xử lý AI chưa khả dụng trong ứng dụng"
              : "AI processing is not yet available in the app"}
          </b>
          <span>
            {vi
              ? "Chưa thể chọn ngôn ngữ đích hoặc bắt đầu xử lý tại đây. Dự án chỉ lưu tham chiếu tới video."
              : "Target language selection and processing are not available here yet. The project will only reference the video."}
          </span>
        </div>
        {saving && (
          <p className="video-status" role="status">
            {vi ? "Đang tạo dự án…" : "Creating project…"}
          </p>
        )}
        {error && (
          <p className="video-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose} disabled={saving}>
            {vi ? "Hủy" : "Cancel"}
          </button>
          <button
            className="primary"
            onClick={create}
            disabled={!path || !name.trim() || saving}
          >
            {vi ? "Chọn nơi lưu" : "Choose location"}
          </button>
        </div>
      </div>
    </div>
  );
}
