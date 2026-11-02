import { useCallback, useEffect, useRef, useState } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import {
  getCurrentWindow,
  type CloseRequestedEvent,
} from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  ArrowLeft,
  CaretDown,
  ArrowsLeftRight,
  FilmSlate,
  FolderOpen,
  Plus,
  FloppyDisk,
  Trash,
  Users,
  Waveform,
} from "@phosphor-icons/react";
import { Translate } from "./Translate";
import { Menu } from "./Menu";
import voices from "./voices.json";
import "./workspace.css";

type Media = { id: string; path: string; kind: string };
type Speaker = { id: string; name: string; voice: string | null };
type Segment = {
  id: string;
  start: number;
  end: number;
  text: string;
  translation: string;
  speakerId: string | null;
};
export type WorkspaceProject = {
  version: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  videoPath: string | null;
  media: Media[];
  speakers: Speaker[];
  segments: Segment[];
};
type Props = { path: string; language: "en" | "vi"; onBack: () => void };
const messages = {
  en: {
    back: "Projects",
    library: "Library",
    speakers: "Speakers",
    script: "Script & translation",
    timeline: "Timeline",
    import: "Import media",
    noMedia: "Import a video or audio file to get started.",
    noPreview: "Select a video in your library to preview it.",
    savePreview: "Save the project to preview this file.",
    noSpeakers: "No speakers yet. Add one to assign lines and a voice.",
    addSpeaker: "Add speaker",
    speakerName: "Speaker name",
    voice: "Voice",
    voicePlaceholder: "Voice name (optional)",
    noSegments: "No dialogue yet. Add a line to start a script.",
    addLine: "Add line",
    original: "Original",
    translated: "Translation",
    start: "Start (s)",
    end: "End (s)",
    assign: "Assign speaker",
    unassigned: "Unassigned",
    delete: "Delete",
    save: "Save",
    saved: "Saved",
    unsaved: "Unsaved changes",
    saving: "Saving…",
    saveAs: "Save as .dub",
    loadError: "Unable to open project",
    saveError: "Unable to save project",
    video: "Video",
    audio: "Audio",
    emptyTimeline: "Your timeline is empty.",
    swap: "Swap side panels",
    reset: "Reset layout",
    loading: "Opening project…",
    resize: "Resize panel",
    lines: "lines",
    select: "Select media",
  },
  vi: {
    back: "Dự án",
    library: "Thư viện",
    speakers: "Nhân vật",
    script: "Kịch bản & bản dịch",
    timeline: "Timeline",
    import: "Nhập tệp",
    noMedia: "Nhập video hoặc âm thanh để bắt đầu.",
    noPreview: "Chọn video trong thư viện để xem trước.",
    savePreview: "Lưu dự án để xem trước tệp này.",
    noSpeakers:
      "Chưa có nhân vật. Hãy thêm nhân vật để gán lời thoại và giọng.",
    addSpeaker: "Thêm nhân vật",
    speakerName: "Tên nhân vật",
    voice: "Giọng",
    voicePlaceholder: "Tên giọng (không bắt buộc)",
    noSegments: "Chưa có lời thoại. Thêm một dòng để bắt đầu kịch bản.",
    addLine: "Thêm lời thoại",
    original: "Lời gốc",
    translated: "Bản dịch",
    start: "Bắt đầu (giây)",
    end: "Kết thúc (giây)",
    assign: "Gán nhân vật",
    unassigned: "Chưa gán",
    delete: "Xóa",
    save: "Lưu",
    saved: "Đã lưu",
    unsaved: "Chưa lưu",
    saving: "Đang lưu…",
    saveAs: "Lưu thành .dub",
    loadError: "Không thể mở dự án",
    saveError: "Không thể lưu dự án",
    video: "Video",
    audio: "Âm thanh",
    emptyTimeline: "Timeline đang trống.",
    swap: "Đổi vị trí hai bảng",
    reset: "Đặt lại bố cục",
    loading: "Đang mở dự án…",
    resize: "Thay đổi kích thước bảng",
    lines: "dòng",
    select: "Chọn tệp",
  },
};
const leaf = (path: string) => path.split(/[\\/]/).pop() || path;
const id = () => crypto.randomUUID();
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function Workspace({ path, language, onBack }: Props) {
  const t = messages[language];
  const [project, setProject] = useState<WorkspaceProject | null>(null);
  const [currentPath, setCurrentPath] = useState(path);
  const [tab, setTab] = useState<"library" | "speakers">("library");
  const [selected, setSelected] = useState<string | null>(null);
  const [permittedMedia, setPermittedMedia] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"saved" | "dirty" | "saving">("saved");
  const [leftWidth, setLeftWidth] = useState(
    () => Number(localStorage.getItem("workspace.left")) || 230,
  );
  const [rightWidth, setRightWidth] = useState(
    () => Number(localStorage.getItem("workspace.right")) || 300,
  );
  const [timelineHeight, setTimelineHeight] = useState(
    () => Number(localStorage.getItem("workspace.timeline")) || 180,
  );
  const [swapped, setSwapped] = useState(
    () => localStorage.getItem("workspace.swapped") === "true",
  );
  const projectRef = useRef<WorkspaceProject | null>(null);
  const revision = useRef(0);
  const saving = useRef(false);
  const pathRef = useRef(path);
  const video = useRef<HTMLVideoElement>(null);
  const closeHandler = useRef<(event: CloseRequestedEvent) => Promise<void>>(
    async () => {},
  );
  const allowClose = useRef(false);

  useEffect(() => {
    let active = true;
    invoke<WorkspaceProject>("open_project", { path })
      .then((value) => {
        if (!active) return;
        projectRef.current = value;
        setProject(value);
        setPermittedMedia(value.media.map((item) => item.id));
        setSelected(
          value.media.find((item) => item.kind === "video")?.id ?? null,
        );
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [path]);
  const change = useCallback(
    (update: (prev: WorkspaceProject) => WorkspaceProject) => {
      setProject((previous) => {
        if (!previous) return previous;
        const next = update(previous);
        projectRef.current = next;
        revision.current += 1;
        setStatus("dirty");
        setError("");
        return next;
      });
    },
    [],
  );
  const persist = useCallback(
    async (target?: string) => {
      if (saving.current || !projectRef.current) return false;
      const destination = target ?? pathRef.current;
      if (destination.toLowerCase().endsWith(".dubstudio")) return false;
      saving.current = true;
      const snapshot = projectRef.current;
      const savedRevision = revision.current;
      setStatus("saving");
      try {
        const result = await invoke<WorkspaceProject>("save_project", {
          path: destination,
          project: snapshot,
        });
        setPermittedMedia(snapshot.media.map((item) => item.id));
        pathRef.current = destination;
        setCurrentPath(destination);
        if (revision.current === savedRevision) {
          projectRef.current = result;
          setProject(result);
          setStatus("saved");
        } else setStatus("dirty");
        setError("");
        return revision.current === savedRevision;
      } catch (e) {
        setError(`${t.saveError}: ${String(e)}`);
        setStatus("dirty");
        return false;
      } finally {
        saving.current = false;
      }
    },
    [t.saveError],
  );
  useEffect(() => {
    if (
      status !== "dirty" ||
      error ||
      currentPath.toLowerCase().endsWith(".dubstudio")
    )
      return;
    const timer = window.setTimeout(() => void persist(), 1000);
    return () => clearTimeout(timer);
  }, [project, status, currentPath, persist, error]);
  const saveNow = async () => {
    if (currentPath.toLowerCase().endsWith(".dubstudio")) {
      const destination = await save({
        defaultPath: `${project?.name || "project"}.dub`,
        filters: [{ name: "DubStudio", extensions: ["dub"] }],
      });
      if (destination) return await persist(destination);
      return false;
    }
    return await persist();
  };
  closeHandler.current = async (event) => {
    if (allowClose.current || status === "saved") return;
    event.preventDefault();
    if (status === "saving" || saving.current) return;
    if (await saveNow()) {
      allowClose.current = true;
      try {
        await getCurrentWindow().close();
      } catch (e) {
        allowClose.current = false;
        setError(String(e));
      }
    }
  };
  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;
    void getCurrentWindow()
      .onCloseRequested((event) => closeHandler.current(event))
      .then((stop) => {
        if (active) unlisten = stop;
        else stop();
      })
      .catch((e) => setError(String(e)));
    return () => {
      active = false;
      unlisten?.();
    };
  }, []);
  const goBack = async () => {
    if (status === "saving") return;
    if (status === "dirty" && !(await saveNow())) return;
    onBack();
  };
  const importMedia = async () => {
    try {
      const files = await open({
        multiple: true,
        filters: [
          {
            name: "Media",
            extensions: [
              "mp4",
              "mov",
              "mkv",
              "webm",
              "m4v",
              "mp3",
              "wav",
              "m4a",
              "flac",
              "ogg",
            ],
          },
        ],
      });
      if (!files) return;
      const paths = Array.isArray(files) ? files : [files];
      const items = paths.map((file) => ({
        id: id(),
        path: file,
        kind: /\.(mp4|mov|mkv|webm|m4v)$/i.test(file) ? "video" : "audio",
      }));
      change((prev) => ({
        ...prev,
        media: [
          ...prev.media,
          ...items.filter(
            (item) => !prev.media.some((old) => old.path === item.path),
          ),
        ],
        videoPath:
          prev.videoPath ??
          items.find((item) => item.kind === "video")?.path ??
          null,
      }));
      if (items[0])
        setSelected(
          projectRef.current?.media.find((old) => old.path === items[0].path)
            ?.id ?? items[0].id,
        );
    } catch (e) {
      setError(String(e));
    }
  };
  const resize = (
    kind: "left" | "right" | "timeline",
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();
    const start = kind === "timeline" ? e.clientY : e.clientX;
    const size =
      kind === "left"
        ? leftWidth
        : kind === "right"
          ? rightWidth
          : timelineHeight;
    const direction =
      kind === "timeline" ? -1 : (kind === "left") !== swapped ? 1 : -1;
    const move = (event: PointerEvent) => {
      const delta =
        (kind === "timeline" ? event.clientY : event.clientX) - start;
      const value = clamp(
        size + delta * direction,
        kind === "timeline" ? 110 : 160,
        kind === "timeline" ? 360 : 430,
      );
      if (kind === "left") setLeftWidth(value);
      else if (kind === "right") setRightWidth(value);
      else setTimelineHeight(value);
      localStorage.setItem(`workspace.${kind}`, String(value));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const resizeKey = (
    kind: "left" | "right" | "timeline",
    e: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? 10
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? -10
          : 0;
    if (
      !delta ||
      (kind === "timeline"
        ? !["ArrowUp", "ArrowDown"].includes(e.key)
        : !["ArrowLeft", "ArrowRight"].includes(e.key))
    )
      return;
    e.preventDefault();
    const direction =
      kind === "timeline" ? 1 : (kind === "left") !== swapped ? 1 : -1;
    const value = clamp(
      (kind === "left"
        ? leftWidth
        : kind === "right"
          ? rightWidth
          : timelineHeight) +
        delta * direction,
      kind === "timeline" ? 110 : 160,
      kind === "timeline" ? 360 : 430,
    );
    if (kind === "left") setLeftWidth(value);
    else if (kind === "right") setRightWidth(value);
    else setTimelineHeight(value);
    localStorage.setItem(`workspace.${kind}`, String(value));
  };
  const resetLayout = () => {
    setLeftWidth(230);
    setRightWidth(300);
    setTimelineHeight(180);
    setSwapped(false);
    ["left", "right", "timeline", "swapped"].forEach((key) =>
      localStorage.removeItem(`workspace.${key}`),
    );
  };
  const chosen = project?.media.find((item) => item.id === selected);
  if (!project)
    return (
      <div className="workspace-loading">
        {error ? `${t.loadError}: ${error}` : t.loading}
        <button className="secondary" onClick={onBack}>
          {t.back}
        </button>
      </div>
    );
  const sidePanel = (
    <div className="ws-panel ws-left" style={{ width: leftWidth }}>
      <div className="ws-panel-tabs">
        <button
          className={tab === "library" ? "active" : ""}
          onClick={() => setTab("library")}
        >
          <FolderOpen size={17} />
          {t.library}
        </button>
        <button
          className={tab === "speakers" ? "active" : ""}
          onClick={() => setTab("speakers")}
        >
          <Users size={17} />
          {t.speakers}
        </button>
      </div>
      {tab === "library" ? (
        <>
          <div className="ws-panel-heading">
            <b>{t.library}</b>
            <button
              title={t.import}
              aria-label={t.import}
              onClick={importMedia}
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="ws-scroll">
            {project.media.length === 0 ? (
              <p className="ws-hint">{t.noMedia}</p>
            ) : (
              project.media.map((item) => (
                <button
                  key={item.id}
                  className={`ws-file ${selected === item.id ? "selected" : ""}`}
                  onClick={() => setSelected(item.id)}
                  title={item.path}
                >
                  {item.kind === "video" ? (
                    <FilmSlate size={18} />
                  ) : (
                    <Waveform size={18} />
                  )}
                  <span>{leaf(item.path)}</span>
                </button>
              ))
            )}
          </div>
          <button className="ws-action" onClick={importMedia}>
            <Plus size={16} />
            {t.import}
          </button>
        </>
      ) : (
        <>
          <div className="ws-panel-heading">
            <b>
              {t.speakers} ({project.speakers.length})
            </b>
            <button
              title={t.addSpeaker}
              aria-label={t.addSpeaker}
              onClick={() =>
                change((p) => ({
                  ...p,
                  speakers: [
                    ...p.speakers,
                    {
                      id: id(),
                      name: `${language === "vi" ? "Nhân vật" : "Speaker"} ${p.speakers.length + 1}`,
                      voice: null,
                    },
                  ],
                }))
              }
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="ws-scroll">
            {project.speakers.length === 0 ? (
              <p className="ws-hint">{t.noSpeakers}</p>
            ) : (
              project.speakers.map((speaker) => (
                <div className="ws-speaker" key={speaker.id}>
                  <div>
                    <input
                      aria-label={t.speakerName}
                      value={speaker.name}
                      onChange={(e) =>
                        change((p) => ({
                          ...p,
                          speakers: p.speakers.map((s) =>
                            s.id === speaker.id
                              ? { ...s, name: e.target.value }
                              : s,
                          ),
                        }))
                      }
                    />
                    <button
                      aria-label={t.delete}
                      title={t.delete}
                      onClick={() =>
                        change((p) => ({
                          ...p,
                          speakers: p.speakers.filter(
                            (s) => s.id !== speaker.id,
                          ),
                          segments: p.segments.map((s) =>
                            s.speakerId === speaker.id
                              ? { ...s, speakerId: null }
                              : s,
                          ),
                        }))
                      }
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                  <Menu
                    align="start"
                    trigger={
                      <button className="ws-voice-trigger" aria-label={t.voice}>
                        {speaker.voice ||
                          (language === "vi"
                            ? "Chọn giọng VieNeu"
                            : "Choose a VieNeu voice")}{" "}
                        <CaretDown size={14} />
                      </button>
                    }
                  >
                    {(close) => (
                      <div className="ws-voice-menu">
                        <p>
                          {language === "vi"
                            ? "Giọng mẫu · chưa hỗ trợ phát thử"
                            : "Preset voices · preview unavailable"}
                        </p>
                        {[
                          {
                            id: "",
                            description:
                              language === "vi" ? "Chưa chọn" : "Unassigned",
                          },
                          ...voices,
                        ].map((voice) => (
                          <button
                            role="menuitem"
                            key={voice.id}
                            onClick={() => {
                              change((p) => ({
                                ...p,
                                speakers: p.speakers.map((s) =>
                                  s.id === speaker.id
                                    ? { ...s, voice: voice.id || null }
                                    : s,
                                ),
                              }));
                              close();
                            }}
                          >
                            <strong>{voice.id || voice.description}</strong>
                            {voice.id && <small>{voice.description}</small>}
                          </button>
                        ))}
                      </div>
                    )}
                  </Menu>
                </div>
              ))
            )}
          </div>
          <button
            className="ws-action"
            onClick={() =>
              change((p) => ({
                ...p,
                speakers: [
                  ...p.speakers,
                  {
                    id: id(),
                    name: `${language === "vi" ? "Nhân vật" : "Speaker"} ${p.speakers.length + 1}`,
                    voice: null,
                  },
                ],
              }))
            }
          >
            <Plus size={16} />
            {t.addSpeaker}
          </button>
        </>
      )}
    </div>
  );
  const scriptPanel = (
    <div className="ws-panel ws-script" style={{ width: rightWidth }}>
      <div className="ws-panel-heading">
        <b>{t.script}</b>
        <button
          aria-label={t.addLine}
          title={t.addLine}
          onClick={() =>
            change((p) => ({
              ...p,
              segments: [
                ...p.segments,
                {
                  id: id(),
                  start: 0,
                  end: 1,
                  text: "",
                  translation: "",
                  speakerId: null,
                },
              ],
            }))
          }
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="ws-scroll">
        {project.segments.length === 0 ? (
          <p className="ws-hint">{t.noSegments}</p>
        ) : (
          project.segments.map((segment) => (
            <div className="ws-segment" key={segment.id}>
              <div className="ws-time">
                <input
                  aria-label={t.start}
                  type="number"
                  min="0"
                  step="0.1"
                  value={segment.start}
                  onChange={(e) =>
                    change((p) => ({
                      ...p,
                      segments: p.segments.map((s) =>
                        s.id === segment.id
                          ? { ...s, start: Number(e.target.value) }
                          : s,
                      ),
                    }))
                  }
                />
                <span>—</span>
                <input
                  aria-label={t.end}
                  type="number"
                  min="0"
                  step="0.1"
                  value={segment.end}
                  onChange={(e) =>
                    change((p) => ({
                      ...p,
                      segments: p.segments.map((s) =>
                        s.id === segment.id
                          ? { ...s, end: Number(e.target.value) }
                          : s,
                      ),
                    }))
                  }
                />
                <button
                  title={t.delete}
                  aria-label={t.delete}
                  onClick={() =>
                    change((p) => ({
                      ...p,
                      segments: p.segments.filter((s) => s.id !== segment.id),
                    }))
                  }
                >
                  <Trash size={16} />
                </button>
              </div>
              <textarea
                aria-label={t.original}
                placeholder={t.original}
                value={segment.text}
                onChange={(e) =>
                  change((p) => ({
                    ...p,
                    segments: p.segments.map((s) =>
                      s.id === segment.id ? { ...s, text: e.target.value } : s,
                    ),
                  }))
                }
              />
              <textarea
                aria-label={t.translated}
                placeholder={t.translated}
                value={segment.translation}
                onChange={(e) =>
                  change((p) => ({
                    ...p,
                    segments: p.segments.map((s) =>
                      s.id === segment.id
                        ? { ...s, translation: e.target.value }
                        : s,
                    ),
                  }))
                }
              />
              <Translate
                text={segment.text}
                currentTranslation={segment.translation}
                duration={segment.end - segment.start}
                language={language}
                onApply={(translation, originalText, originalTranslation) => {
                  const current = projectRef.current?.segments.find(
                    (item) => item.id === segment.id,
                  );
                  if (
                    !current ||
                    current.text !== originalText ||
                    current.translation !== originalTranslation ||
                    current.start !== segment.start ||
                    current.end !== segment.end
                  ) {
                    setError(
                      language === "vi"
                        ? "Lời thoại, bản dịch hoặc thời gian đã thay đổi; kết quả dịch không được áp dụng."
                        : "The line, translation or timing changed; the result was not applied.",
                    );
                    return;
                  }
                  change((p) => ({
                    ...p,
                    segments: p.segments.map((item) =>
                      item.id === segment.id ? { ...item, translation } : item,
                    ),
                  }));
                }}
              />
              <Menu
                align="start"
                trigger={
                  <button className="ws-select" aria-label={t.assign}>
                    {project.speakers.find((s) => s.id === segment.speakerId)
                      ?.name || t.unassigned}
                    <CaretDown size={14} />
                  </button>
                }
              >
                {(close) => (
                  <>
                    {[{ id: "", name: t.unassigned }, ...project.speakers].map(
                      (speaker) => (
                        <button
                          className="option"
                          key={speaker.id}
                          onClick={() => {
                            change((p) => ({
                              ...p,
                              segments: p.segments.map((s) =>
                                s.id === segment.id
                                  ? { ...s, speakerId: speaker.id || null }
                                  : s,
                              ),
                            }));
                            close();
                          }}
                        >
                          {speaker.name}
                        </button>
                      ),
                    )}
                  </>
                )}
              </Menu>
            </div>
          ))
        )}
      </div>
    </div>
  );
  const split = (kind: "left" | "right") => (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={t.resize}
      onKeyDown={(e) => resizeKey(kind, e)}
      className="ws-split"
      onPointerDown={(e) => resize(kind, e)}
    />
  );
  return (
    <div className="workspace">
      <div className="ws-top">
        <button onClick={goBack} disabled={status === "saving"}>
          <ArrowLeft size={17} />
          {t.back}
        </button>
        <span className="ws-crumb">/</span>
        <strong>{project.name}</strong>
        <span className="ws-status">
          {status === "saved"
            ? t.saved
            : status === "saving"
              ? t.saving
              : t.unsaved}
        </span>
        <div className="ws-top-end">
          <button
            title={t.swap}
            aria-label={t.swap}
            onClick={() => {
              localStorage.setItem("workspace.swapped", String(!swapped));
              setSwapped(!swapped);
            }}
          >
            <ArrowsLeftRight size={18} />
          </button>
          <button onClick={resetLayout}>{t.reset}</button>
          <button className="ws-save" onClick={saveNow}>
            <FloppyDisk size={16} />
            {currentPath.toLowerCase().endsWith(".dubstudio")
              ? t.saveAs
              : t.save}
          </button>
        </div>
      </div>
      {error && (
        <div className="ws-error" role="alert">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}
      <div className="ws-upper">
        {swapped ? (
          <>
            {scriptPanel}
            {split("right")}
          </>
        ) : (
          <>
            {sidePanel}
            {split("left")}
          </>
        )}
        <div className="ws-preview">
          {chosen && !permittedMedia.includes(chosen.id) ? (
            <div className="ws-preview-empty">
              <FilmSlate size={32} />
              <span>{t.savePreview}</span>
            </div>
          ) : chosen?.kind === "video" ? (
            <video
              ref={video}
              key={chosen.path}
              controls
              src={convertFileSrc(chosen.path)}
            />
          ) : chosen?.kind === "audio" ? (
            <div className="ws-audio">
              <Waveform size={42} />
              <span>{leaf(chosen.path)}</span>
              <audio controls src={convertFileSrc(chosen.path)} />
            </div>
          ) : (
            <div className="ws-preview-empty">
              <FilmSlate size={32} />
              <span>{t.noPreview}</span>
            </div>
          )}
        </div>
        {swapped ? (
          <>
            {split("left")}
            {sidePanel}
          </>
        ) : (
          <>
            {split("right")}
            {scriptPanel}
          </>
        )}
      </div>
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="horizontal"
        aria-label={t.resize}
        onKeyDown={(e) => resizeKey("timeline", e)}
        className="ws-split ws-split-horizontal"
        onPointerDown={(e) => resize("timeline", e)}
      />
      <div className="ws-timeline" style={{ height: timelineHeight }}>
        <div className="ws-panel-heading">
          <b>{t.timeline}</b>
          <span>
            {project.segments.length} {t.lines}
          </span>
        </div>
        <div className="ws-tracks">
          {project.media.length === 0 && project.segments.length === 0 ? (
            <p className="ws-hint">{t.emptyTimeline}</p>
          ) : (
            <>
              {project.media.map((m) => (
                <div className="ws-track" key={m.id}>
                  <span>{m.kind === "video" ? t.video : t.audio}</span>
                  <button onClick={() => setSelected(m.id)}>
                    {leaf(m.path)}
                  </button>
                </div>
              ))}
              {project.segments.length > 0 && (
                <div className="ws-track">
                  <span>{t.script}</span>
                  <div className="ws-clips">
                    {project.segments.map((s) => (
                      <button
                        key={s.id}
                        title={`${s.start}s – ${s.end}s`}
                        onClick={() => {
                          if (video.current)
                            video.current.currentTime = s.start;
                        }}
                      >
                        {s.translation || s.text || `${s.start}s`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
