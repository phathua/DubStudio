import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  ArrowDownUp,
  ChevronDown,
  CircleHelp,
  Clapperboard,
  FilePlus2,
  Film,
  FolderOpen,
  Grid2X2,
  Languages,
  LayoutList,
  Minus,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Square,
  SunMoon,
  X,
} from "lucide-react";
import "./style.css";
import { filterProjects } from "./projects";
import { words, type Text } from "./locale";
import { Menu } from "./Menu";

type Project = {
  version: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  videoPath: string | null;
};
type Recent = {
  path: string;
  project: Project;
  available: boolean;
  videoAvailable: boolean;
};
type Settings = { theme: string; language: string };
function Titlebar({ t }: { t: Text }) {
  const win = getCurrentWindow();
  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="title-brand" data-tauri-drag-region>
        <img src="/logo.png" /> <span data-tauri-drag-region>DubStudio</span>
      </div>
      <div className="window-actions">
        <button aria-label={t.minimize} onClick={() => win.minimize()}>
          <Minus size={15} />
        </button>
        <button aria-label={t.maximize} onClick={() => win.toggleMaximize()}>
          <Square size={12} />
        </button>
        <button
          className="window-close"
          aria-label={t.close}
          onClick={() => win.close()}
        >
          <X size={16} />
        </button>
      </div>
    </header>
  );
}
function App() {
  const [settings, setSettings] = useState<Settings>({
    theme: "system",
    language: "en",
  });
  const [recent, setRecent] = useState<Recent[]>([]);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<"projects" | "settings">("projects");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showPath, setShowPath] = useState(false);
  const [dialog, setDialog] = useState<"blank" | "video" | null>(null);
  const [name, setName] = useState("");
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [detail, setDetail] = useState<Recent | null>(null);
  const [failed, setFailed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const t = words[settings.language === "vi" ? "vi" : "en"];
  useEffect(() => {
    invoke<[Settings, Recent[]]>("load_data")
      .then(([s, r]) => {
        setSettings(s);
        setRecent(r);
      })
      .catch((e) => {
        setFailed(true);
        setNotice(String(e));
      })
      .finally(() => {
        setReady(true);
        invoke("ready").catch(console.error);
      });
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : settings.theme);
    apply();
    media.addEventListener("change", apply);
    document.documentElement.lang = settings.language;
    return () => media.removeEventListener("change", apply);
  }, [settings]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPage("projects");
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const updateSettings = (next: Settings) => {
    setSettings(next);
    invoke("save_settings", { settings: next }).catch((e) =>
      setNotice(String(e)),
    );
  };
  const chooseVideo = async () => {
    try {
      const picked = await open({
        multiple: false,
        filters: [
          {
            name: "Video",
            extensions: ["mp4", "mov", "mkv", "webm", "avi", "m4v"],
          },
        ],
      });
      if (typeof picked === "string") {
        setVideoPath(picked);
        setName(
          picked
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.[^.]+$/, "") || "",
        );
        setDialog("video");
      }
    } catch (e) {
      setNotice(String(e));
    }
  };
  const importProject = async () => {
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "DubStudio", extensions: ["dubstudio"] }],
      });
      if (typeof path === "string") {
        setRecent(await invoke("import_project", { path }));
        setNotice(t.imported);
      }
    } catch (e) {
      setNotice(`${t.importFailed}: ${String(e)}`);
    }
  };
  const createProject = async () => {
    try {
      const path = await save({
        defaultPath: `${name.trim().replace(/[\\/:*?"<>|]/g, "-")}.dubstudio`,
        filters: [{ name: "DubStudio", extensions: ["dubstudio"] }],
      });
      if (!path) return;
      setRecent(
        await invoke("create_project", {
          path,
          name: name.trim(),
          videoPath: dialog === "video" ? videoPath : null,
        }),
      );
      setDialog(null);
      setNotice(dialog === "video" ? t.videoReady : t.created);
    } catch (e) {
      setNotice(String(e));
    }
  };
  const remove = async (path: string) => {
    try {
      setRecent(await invoke("remove_recent", { path }));
      setDetail(null);
    } catch (e) {
      setNotice(String(e));
    }
  };
  const filtered = filterProjects(recent, query, sort);
  const createMenu = (
    <Menu
      hover
      trigger={
        <button className="primary">
          <Plus size={18} />
          {t.new}
          <ChevronDown size={15} />
        </button>
      }
    >
      {(close) => (
        <>
          <button
            className="menu-item"
            onClick={() => {
              close();
              setName("");
              setVideoPath(null);
              setDialog("blank");
            }}
          >
            <span className="menu-icon">
              <FilePlus2 size={19} />
            </span>
            <span>
              <b>{t.blank}</b>
              <small>{t.blankDesc}</small>
            </span>
          </button>
          <button
            className="menu-item"
            onClick={() => {
              close();
              chooseVideo();
            }}
          >
            <span className="menu-icon">
              <Sparkles size={19} />
            </span>
            <span>
              <b>{t.video}</b>
              <small>{t.videoDesc}</small>
            </span>
          </button>
          <button
            className="menu-item"
            onClick={() => {
              close();
              importProject();
            }}
          >
            <span className="menu-icon">
              <FolderOpen size={19} />
            </span>
            <span>
              <b>{t.import}</b>
              <small>{t.importDesc}</small>
            </span>
          </button>
        </>
      )}
    </Menu>
  );
  if (!ready) return null;
  return (
    <div className="app">
      <Titlebar t={t} />
      <div className="shell">
        <aside className="sidebar">
          <div className="side-label">
            {settings.language === "vi" ? "KHÔNG GIAN" : "WORKSPACE"}
          </div>
          <button
            className={`nav ${page === "projects" ? "active" : ""}`}
            onClick={() => setPage("projects")}
          >
            <Grid2X2 size={18} />
            {t.projects}
          </button>
          <button
            className={`nav ${page === "settings" ? "active" : ""}`}
            onClick={() => setPage("settings")}
          >
            <Settings2 size={18} />
            {t.settings}
          </button>
          <div className="side-bottom">
            <div className="side-mark">
              <Sparkles size={16} />
              <span>
                {settings.language === "vi"
                  ? "DÀNH CHO CÂU CHUYỆN"
                  : "MADE FOR STORIES"}
              </span>
            </div>
            <span className="version">DubStudio · 0.1.0</span>
          </div>
        </aside>
        <main className="main">
          {page === "projects" ? (
            <>
              <div className="heading">
                <div>
                  <div className="eyebrow">
                    <span />{" "}
                    {settings.language === "vi"
                      ? "KHÔNG GIAN SÁNG TẠO"
                      : "YOUR CREATIVE SPACE"}
                  </div>
                  <h1>
                    {t.home}
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>{t.intro}</p>
                </div>
                {createMenu}
              </div>
              <div className="divider" />
              <section>
                <div className="section-head">
                  <div>
                    <h2>
                      {t.recent} <span className="count">{recent.length}</span>
                    </h2>
                    <p>{t.count}</p>
                  </div>
                  <div className="tools">
                    <label className="search">
                      <Search size={17} />
                      <input
                        ref={searchRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t.search}
                      />
                      <kbd>⌘ K</kbd>
                    </label>
                    <div className="view-toggle">
                      <button
                        title={t.grid}
                        aria-label={t.grid}
                        aria-pressed={view === "grid"}
                        onClick={() => setView("grid")}
                      >
                        <Grid2X2 size={16} />
                      </button>
                      <button
                        title={t.list}
                        aria-label={t.list}
                        aria-pressed={view === "list"}
                        onClick={() => setView("list")}
                      >
                        <LayoutList size={17} />
                      </button>
                    </div>
                    <Menu
                      trigger={
                        <button className="sort">
                          <ArrowDownUp size={15} />
                          <span>{sort === "updated" ? t.updated : t.name}</span>
                          <ChevronDown size={14} />
                        </button>
                      }
                    >
                      {(close) => (
                        <>
                          <button
                            className="option"
                            onClick={() => {
                              setSort("updated");
                              close();
                            }}
                          >
                            {t.updated}
                          </button>
                          <button
                            className="option"
                            onClick={() => {
                              setSort("name");
                              close();
                            }}
                          >
                            {t.name}
                          </button>
                        </>
                      )}
                    </Menu>
                  </div>
                </div>
                {filtered.length === 0 ? (
                  <div className="empty">
                    <div className="empty-art">
                      <span className="empty-orbit" />
                      <div className="empty-icon">
                        <Clapperboard size={32} />
                      </div>
                      <Sparkles className="empty-spark" size={19} />
                    </div>
                    <h3>{recent.length ? t.noResults : t.emptyTitle}</h3>
                    <p>{recent.length ? t.noResultsDesc : t.emptyDesc}</p>
                    {!recent.length && createMenu}
                  </div>
                ) : (
                  <div className={`cards ${view}`}>
                    {filtered.map((item) => (
                      <article key={item.path} className="card">
                        <button
                          className="card-open"
                          onClick={() => setDetail(item)}
                        >
                          <div
                            className={`card-art ${item.project.videoPath ? "video-art" : ""}`}
                          >
                            <div className="card-art-glow" />
                            <div className="art-symbol">
                              {item.project.videoPath ? (
                                <Film size={28} />
                              ) : (
                                <Clapperboard size={28} />
                              )}
                            </div>
                            <span className="card-badge">
                              {item.project.videoPath ? t.ai : t.blankBadge}
                            </span>
                          </div>
                          <div className="card-info">
                            <div>
                              <h3>{item.project.name}</h3>
                              <p>
                                {new Intl.DateTimeFormat(settings.language, {
                                  dateStyle: "medium",
                                }).format(new Date(item.project.updatedAt))}
                              </p>
                              {!item.available && (
                                <small className="warning">{t.missing}</small>
                              )}
                              {item.available && !item.videoAvailable && (
                                <small className="warning">
                                  {t.videoMissing}
                                </small>
                              )}
                              {showPath && (
                                <small className="path">{item.path}</small>
                              )}
                            </div>
                          </div>
                        </button>
                        <div className="card-menu">
                          <Menu
                            trigger={
                              <button
                                className="icon-button"
                                aria-label={t.remove}
                              >
                                <MoreHorizontal size={20} />
                              </button>
                            }
                          >
                            {(close) => (
                              <button
                                className="option danger"
                                onClick={() => {
                                  close();
                                  remove(item.path);
                                }}
                              >
                                {t.remove}
                              </button>
                            )}
                          </Menu>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <div className="heading">
                <div>
                  <div className="eyebrow">
                    <span />{" "}
                    {settings.language === "vi"
                      ? "KHÔNG GIAN SÁNG TẠO"
                      : "YOUR CREATIVE SPACE"}
                  </div>
                  <h1>
                    {t.settings}
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>{t.preferences}</p>
                </div>
              </div>
              <div className="divider" />
              <div className="settings-panel">
                <div className="setting-row">
                  <div className="setting-label">
                    <SunMoon size={20} />
                    <b>{t.appearance}</b>
                  </div>
                  <Menu
                    trigger={
                      <button className="sort">
                        {t[settings.theme as "system" | "light" | "dark"] ||
                          t.system}
                        <ChevronDown size={14} />
                      </button>
                    }
                  >
                    {(close) => (
                      <>
                        {(["system", "light", "dark"] as const).map((v) => (
                          <button
                            className="option"
                            key={v}
                            onClick={() => {
                              updateSettings({ ...settings, theme: v });
                              close();
                            }}
                          >
                            {t[v]}
                          </button>
                        ))}
                      </>
                    )}
                  </Menu>
                </div>
                <div className="setting-row">
                  <div className="setting-label">
                    <Languages size={20} />
                    <b>{t.language}</b>
                  </div>
                  <Menu
                    trigger={
                      <button className="sort">
                        {settings.language === "vi" ? "Tiếng Việt" : "English"}
                        <ChevronDown size={14} />
                      </button>
                    }
                  >
                    {(close) => (
                      <>
                        {[
                          ["en", "English"],
                          ["vi", "Tiếng Việt"],
                        ].map(([v, label]) => (
                          <button
                            className="option"
                            key={v}
                            onClick={() => {
                              updateSettings({ ...settings, language: v });
                              close();
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </>
                    )}
                  </Menu>
                </div>
                <label className="setting-row checkbox-row">
                  <div className="setting-label">
                    <CircleHelp size={20} />
                    <b>{t.showPath}</b>
                  </div>
                  <input
                    type="checkbox"
                    checked={showPath}
                    onChange={(e) => setShowPath(e.target.checked)}
                  />
                  <span className="checkmark" />
                </label>
              </div>
            </>
          )}
        </main>
      </div>
      {dialog && (
        <div className="overlay" onMouseDown={() => setDialog(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-icon">
              {dialog === "video" ? <Sparkles /> : <FilePlus2 />}
            </div>
            <h2 id="dialog-title">{dialog === "video" ? t.video : t.blank}</h2>
            <p>{dialog === "video" ? t.videoDesc : t.blankDesc}</p>
            <label className="field">
              {t.projectName}
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) createProject();
                  if (e.key === "Escape") setDialog(null);
                }}
                placeholder={t.placeholder}
              />
            </label>
            {videoPath && dialog === "video" && (
              <div className="selected-file">
                <Film size={16} />
                <span>{videoPath.split(/[\\/]/).pop()}</span>
              </div>
            )}
            <div className="modal-actions">
              <button className="secondary" onClick={() => setDialog(null)}>
                {t.cancel}
              </button>
              <button
                className="primary"
                disabled={!name.trim()}
                onClick={createProject}
              >
                {t.continue}
              </button>
            </div>
          </div>
        </div>
      )}
      {detail && (
        <div className="overlay" onMouseDown={() => setDetail(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-icon">
              <Clapperboard />
            </div>
            <h2>{detail.project.name}</h2>
            <p>{detail.available ? t.noEditor : t.unavailable}</p>
            <div className="detail-line">
              <b>{t.file}</b>
              <span>{detail.path}</span>
            </div>
            {detail.project.videoPath && (
              <div className="detail-line">
                <b>{t.videoFile}</b>
                <span>{detail.project.videoPath}</span>
              </div>
            )}
            {!detail.videoAvailable && (
              <p className="warning">{t.videoMissing}</p>
            )}
            <div className="modal-actions">
              <button className="secondary" onClick={() => remove(detail.path)}>
                {t.remove}
              </button>
              <button className="primary" onClick={() => setDetail(null)}>
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
      {notice && (
        <div className={`toast ${failed ? "toast-error" : ""}`} role="status">
          <span>{notice}</span>
          <button aria-label={t.close} onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Splash() {
  const [language, setLanguage] = useState("en");
  useEffect(() => {
    invoke<[Settings, Recent[]]>("load_data")
      .then(([s]) => setLanguage(s.language))
      .catch(() => {});
  }, []);
  return (
    <div className="splash">
      <div className="splash-glow" />
      <img src="/logo.png" />
      <h1>
        DubStudio<span>.</span>
      </h1>
      <p>{language === "vi" ? "KHÔNG GIAN SÁNG TẠO" : "YOUR CREATIVE SPACE"}</p>
      <div className="progress">
        <i />
      </div>
      <small>{language === "vi" ? words.vi.loading : words.en.loading}</small>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).has("splash") ? <Splash /> : <App />,
);
