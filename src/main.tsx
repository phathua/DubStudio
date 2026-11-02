import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  IconContext,
  ArrowsDownUp as ArrowDownUp,
  ArrowsOutSimple,
  CaretDown as ChevronDown,
  Question as CircleHelp,
  FilmSlate as Clapperboard,
  FilePlus as FilePlus2,
  FilmStrip as Film,
  FolderOpen,
  SquaresFour as Grid2X2,
  Translate as Languages,
  ListBullets as LayoutList,
  Minus,
  DotsThree as MoreHorizontal,
  Plus,
  MagnifyingGlass as Search,
  SlidersHorizontal as Settings2,
  Robot,
  Sparkle,
  Square,
  SunDim as SunMoon,
  X,
} from "@phosphor-icons/react";
import "./style.css";
import { filterProjects } from "./projects";
import { words, resolveLanguage, type Text } from "./locale";
import { Menu } from "./Menu";
import { Workspace } from "./Workspace";
import { VideoImport } from "./VideoImport";

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
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
function Titlebar({ t }: { t: Text }) {
  const win = getCurrentWindow();
  const toggleSize = async () => {
    if (isMac) await win.setFullscreen(!(await win.isFullscreen()));
    else await win.toggleMaximize();
  };
  const controls = (
    <div className="window-actions">
      {isMac && (
        <button
          className="window-close"
          aria-label={t.close}
          title={t.close}
          onClick={() => win.close()}
        >
          <X size={10} weight="bold" />
        </button>
      )}
      <button
        className="window-minimize"
        aria-label={t.minimize}
        title={t.minimize}
        onClick={() => win.minimize()}
      >
        <Minus size={isMac ? 10 : 15} weight="regular" />
      </button>
      <button
        className="window-maximize"
        aria-label={t.maximize}
        title={t.maximize}
        onClick={toggleSize}
      >
        {isMac ? (
          <ArrowsOutSimple size={9} weight="bold" />
        ) : (
          <Square size={12} weight="regular" />
        )}
      </button>
      {!isMac && (
        <button
          className="window-close"
          aria-label={t.close}
          title={t.close}
          onClick={() => win.close()}
        >
          <X size={16} weight="regular" />
        </button>
      )}
    </div>
  );
  return (
    <header
      className={`titlebar ${isMac ? "mac" : "windows"}`}
      data-tauri-drag-region
      onDoubleClick={(event) => {
        if (event.target === event.currentTarget) void toggleSize();
      }}
    >
      {isMac && controls}
      <div className="title-brand" data-tauri-drag-region>
        <img src="/logo.png" alt="" />{" "}
        <span data-tauri-drag-region>DubStudio</span>
      </div>
      {!isMac && controls}
    </header>
  );
}
function App() {
  const [settings, setSettings] = useState<Settings>({
    theme: "system",
    language: "system",
  });
  const [recent, setRecent] = useState<Recent[]>([]);
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<"projects" | "settings">("projects");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showPath, setShowPath] = useState(false);
  const [dialog, setDialog] = useState<"blank" | "video" | null>(null);
  const [name, setName] = useState("");

  const [notice, setNotice] = useState("");
  const [detail, setDetail] = useState<Recent | null>(null);
  const [failed, setFailed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const language = resolveLanguage(settings.language, navigator.languages);
  const t = words[language];
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
    document.documentElement.lang = language;
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
  const importProject = async () => {
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "DubStudio", extensions: ["dub", "dubstudio"] }],
      });
      if (typeof path === "string") {
        setRecent(await invoke("import_project", { path }));
        setWorkspace(path);
      }
    } catch (e) {
      setNotice(`${t.importFailed}: ${String(e)}`);
    }
  };
  const createProject = async () => {
    try {
      const path = await save({
        defaultPath: `${name.trim().replace(/[\\/:*?"<>|]/g, "-")}.dub`,
        filters: [{ name: "DubStudio", extensions: ["dub"] }],
      });
      if (!path) return;
      setRecent(
        await invoke("create_project", {
          path,
          name: name.trim(),
          videoPath: null,
        }),
      );
      setDialog(null);
      setWorkspace(path);
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
              setDialog("video");
            }}
          >
            <span className="menu-icon">
              <Robot size={19} />
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
  if (workspace)
    return (
      <div className="app">
        <Titlebar t={t} />
        <Workspace
          path={workspace}
          language={language}
          onBack={() => {
            setWorkspace(null);
            invoke<[Settings, Recent[]]>("load_data")
              .then(([, items]) => setRecent(items))
              .catch((e) => setNotice(String(e)));
          }}
        />
      </div>
    );
  return (
    <div className="app">
      <Titlebar t={t} />
      <div className="shell">
        <aside className="sidebar">
          <div className="side-label">
            {language === "vi" ? "KHÔNG GIAN" : "WORKSPACE"}
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
              <Clapperboard size={16} />
              <span>
                {language === "vi" ? "DÀNH CHO CÂU CHUYỆN" : "MADE FOR STORIES"}
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
                    {language === "vi"
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
                      <Sparkle className="empty-spark" size={19} />
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
                          onClick={() =>
                            item.available
                              ? setWorkspace(item.path)
                              : setDetail(item)
                          }
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
                                {new Intl.DateTimeFormat(language, {
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
                    {language === "vi"
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
                        {settings.language === "system"
                          ? t.system
                          : language === "vi"
                            ? "Tiếng Việt"
                            : "English"}
                        <ChevronDown size={14} />
                      </button>
                    }
                  >
                    {(close) => (
                      <>
                        {[
                          ["system", t.system],
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
      {dialog === "video" && (
        <VideoImport
          language={language}
          onClose={() => setDialog(null)}
          onCreated={(path) => {
            setDialog(null);
            setWorkspace(path);
          }}
        />
      )}
      {dialog === "blank" && (
        <div className="overlay" onMouseDown={() => setDialog(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-icon">
              <FilePlus2 />
            </div>
            <h2 id="dialog-title">{t.blank}</h2>
            <p>{t.blankDesc}</p>
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
  const [language, setLanguage] = useState(() =>
    resolveLanguage("system", navigator.languages),
  );
  useEffect(() => {
    invoke<[Settings, Recent[]]>("load_data")
      .then(([s]) =>
        setLanguage(resolveLanguage(s.language, navigator.languages)),
      )
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
  <IconContext.Provider value={{ weight: "duotone" }}>
    {new URLSearchParams(location.search).has("splash") ? <Splash /> : <App />}
  </IconContext.Provider>,
);
