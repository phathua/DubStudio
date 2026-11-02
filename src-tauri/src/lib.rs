mod translate;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::{Mutex, MutexGuard, OnceLock},
};
use tauri::{AppHandle, Manager};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Project {
    version: u32,
    name: String,
    created_at: String,
    updated_at: String,
    video_path: Option<String>,
    #[serde(default)]
    media: Vec<Media>,
    #[serde(default)]
    speakers: Vec<Speaker>,
    #[serde(default)]
    segments: Vec<Segment>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Media {
    id: String,
    path: String,
    kind: String,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Speaker {
    id: String,
    name: String,
    voice: Option<String>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Segment {
    id: String,
    start: f64,
    end: f64,
    text: String,
    translation: String,
    speaker_id: Option<String>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Recent {
    path: String,
    project: Project,
    available: bool,
    video_available: bool,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    theme: String,
    language: String,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            language: "system".into(),
        }
    }
}
#[derive(Default, Serialize, Deserialize)]
struct Store {
    settings: Settings,
    recent: Vec<Recent>,
}
fn lock_store() -> Result<MutexGuard<'static, ()>, String> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
        .lock()
        .map_err(|_| "App data lock failed".into())
}
fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("store.json"))
}
fn read_store(app: &AppHandle) -> Result<Store, String> {
    let path = store_path(app)?;
    if !path.exists() {
        return Ok(Store::default());
    }
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| format!("Could not read app data: {e}"))
}
// Write into the same directory, then atomically replace the destination.
fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or("Invalid destination")?;
    let filename = path
        .file_name()
        .ok_or("Invalid destination")?
        .to_string_lossy();
    let unique = Utc::now().timestamp_nanos_opt().ok_or("Invalid clock")?;
    let temp = parent.join(format!(".{filename}.{}.{}.tmp", std::process::id(), unique));
    let result = (|| {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)?;
        file.write_all(contents)?;
        file.sync_all()?;
        fs::rename(&temp, path)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result.map_err(|e| e.to_string())
}
fn write_store(app: &AppHandle, store: &Store) -> Result<(), String> {
    let path = store_path(app)?;
    atomic_write(
        &path,
        &serde_json::to_vec_pretty(store).map_err(|e| e.to_string())?,
    )
}
fn validate_project(project: &Project) -> Result<(), String> {
    if !(1..=2).contains(&project.version)
        || project.name.trim().is_empty()
        || chrono::DateTime::parse_from_rfc3339(&project.created_at).is_err()
        || chrono::DateTime::parse_from_rfc3339(&project.updated_at).is_err()
        || project
            .segments
            .iter()
            .any(|s| !s.start.is_finite() || !s.end.is_finite() || s.start < 0.0 || s.end < s.start)
    {
        return Err("Unsupported or invalid DubStudio project".into());
    }
    Ok(())
}
fn read_project(path: &str) -> Result<Project, String> {
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mut project: Project =
        serde_json::from_str(&data).map_err(|_| "Invalid DubStudio project file".to_string())?;
    validate_project(&project)?;
    if project.version == 1 {
        if let Some(path) = &project.video_path {
            project.media.push(Media {
                id: "legacy-video".into(),
                path: path.clone(),
                kind: "video".into(),
            });
        }
        project.version = 2;
    }
    Ok(project)
}
fn allow_media(app: &AppHandle, project: &Project) -> Result<(), String> {
    for item in &project.media {
        if Path::new(&item.path).is_file() {
            app.asset_protocol_scope()
                .allow_file(&item.path)
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
#[tauri::command]
fn open_project(app: AppHandle, path: String) -> Result<Project, String> {
    let project = read_project(&path)?;
    allow_media(&app, &project)?;
    Ok(project)
}
#[tauri::command]
fn save_project(app: AppHandle, path: String, mut project: Project) -> Result<Project, String> {
    let destination = Path::new(&path);
    if !destination
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| e.eq_ignore_ascii_case("dub"))
    {
        return Err("Save projects as .dub; the original legacy project remains unchanged".into());
    }
    if destination.exists() {
        // Do not silently replace an unrelated file selected by mistake.
        read_project(&path)?;
    }
    project.version = 2;
    project.updated_at = Utc::now().to_rfc3339();
    project.video_path = project
        .media
        .iter()
        .find(|m| m.kind == "video")
        .map(|m| m.path.clone());
    validate_project(&project)?;
    allow_media(&app, &project)?;
    atomic_write(
        destination,
        &serde_json::to_vec_pretty(&project).map_err(|e| e.to_string())?,
    )?;
    add_recent(&app, path, project.clone())?;
    Ok(project)
}
fn availability(mut item: Recent) -> Recent {
    item.available = Path::new(&item.path).is_file();
    if item.available {
        if let Ok(project) = read_project(&item.path) {
            item.project = project;
        } else {
            item.available = false;
        }
    }
    item.video_available = item
        .project
        .video_path
        .as_ref()
        .map_or(true, |p| Path::new(p).is_file());
    item
}
#[tauri::command]
fn load_data(app: AppHandle) -> Result<(Settings, Vec<Recent>), String> {
    let _guard = lock_store()?;
    let store = read_store(&app)?;
    Ok((
        store.settings,
        store.recent.into_iter().map(availability).collect(),
    ))
}
#[tauri::command]
fn save_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    let _guard = lock_store()?;
    let mut store = read_store(&app)?;
    store.settings = settings;
    write_store(&app, &store)
}
fn add_recent(app: &AppHandle, path: String, project: Project) -> Result<Vec<Recent>, String> {
    let _guard = lock_store()?;
    let mut store = read_store(app)?;
    store.recent.retain(|r| r.path != path);
    store.recent.insert(
        0,
        Recent {
            path,
            project,
            available: true,
            video_available: true,
        },
    );
    store.recent.truncate(100);
    write_store(app, &store)?;
    Ok(store.recent.into_iter().map(availability).collect())
}
#[tauri::command]
fn create_project(
    app: AppHandle,
    path: String,
    name: String,
    video_path: Option<String>,
) -> Result<Vec<Recent>, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Project name is required".into());
    }
    if Path::new(&path).exists() {
        return Err("A file already exists at this location".into());
    }
    if let Some(video) = &video_path {
        if !Path::new(video).is_file() {
            return Err("Video file not found".into());
        }
    }
    let now = Utc::now().to_rfc3339();
    let project = Project {
        version: 2,
        name: name.into(),
        created_at: now.clone(),
        updated_at: now,
        media: video_path
            .as_ref()
            .map(|path| {
                vec![Media {
                    id: "initial-video".into(),
                    path: path.clone(),
                    kind: "video".into(),
                }]
            })
            .unwrap_or_default(),
        video_path,
        speakers: Vec::new(),
        segments: Vec::new(),
    };
    let contents = serde_json::to_vec_pretty(&project).map_err(|e| e.to_string())?;
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    file.write_all(&contents).map_err(|e| e.to_string())?;
    add_recent(&app, path, project)
}
#[tauri::command]
fn import_project(app: AppHandle, path: String) -> Result<Vec<Recent>, String> {
    let project = read_project(&path)?;
    add_recent(&app, path, project)
}
#[tauri::command]
fn remove_recent(app: AppHandle, path: String) -> Result<Vec<Recent>, String> {
    let _guard = lock_store()?;
    let mut store = read_store(&app)?;
    store.recent.retain(|item| item.path != path);
    write_store(&app, &store)?;
    Ok(store.recent.into_iter().map(availability).collect())
}
#[tauri::command]
fn ready(app: AppHandle) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        main.show().map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
    }
    if let Some(splash) = app.get_webview_window("splash") {
        splash.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            translate::translate_text,
            load_data,
            save_settings,
            create_project,
            open_project,
            save_project,
            import_project,
            remove_recent,
            ready
        ])
        .run(tauri::generate_context!())
        .expect("error running DubStudio");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_project_files_and_missing_video() {
        let path =
            std::env::temp_dir().join(format!("dubstudio-test-{}.dubstudio", std::process::id()));
        let path_str = path.to_str().unwrap();
        fs::write(&path, r#"{"version":1,"name":"Demo","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z","videoPath":"/nonexistent/dubstudio-video.mp4"}"#).unwrap();
        let project = read_project(path_str).unwrap();
        let recent = availability(Recent {
            path: path_str.into(),
            project,
            available: true,
            video_available: true,
        });
        assert!(recent.available);
        assert!(!recent.video_available);
        fs::write(
            &path,
            r#"{"version":2,"name":"Demo","createdAt":"bad","updatedAt":"bad","videoPath":null}"#,
        )
        .unwrap();
        assert!(read_project(path_str).is_err());
        fs::remove_file(&path).unwrap();
        assert!(!availability(recent).available);
    }
    #[test]
    fn migrates_legacy_in_memory_and_saves_a_separate_project() {
        let dir = std::env::temp_dir().join(format!("dubstudio-migration-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let legacy = dir.join("original.dubstudio");
        let target = dir.join("converted.dub");
        let content = r#"{"version":1,"name":"Demo","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z","videoPath":"/missing.mp4"}"#;
        fs::write(&legacy, content).unwrap();
        let project = read_project(legacy.to_str().unwrap()).unwrap();
        assert_eq!(project.version, 2);
        assert_eq!(project.media[0].path, "/missing.mp4");
        atomic_write(&target, &serde_json::to_vec(&project).unwrap()).unwrap();
        assert_eq!(fs::read_to_string(&legacy).unwrap(), content);
        assert_eq!(
            read_project(target.to_str().unwrap()).unwrap().media.len(),
            1
        );
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn rejects_unknown_versions_and_invalid_timing() {
        let mut project: Project = serde_json::from_str(r#"{"version":3,"name":"Demo","createdAt":"2026-01-01T00:00:00Z","updatedAt":"2026-01-01T00:00:00Z","videoPath":null}"#).unwrap();
        assert!(validate_project(&project).is_err());
        project.version = 2;
        project.segments.push(Segment {
            id: "s".into(),
            start: 2.0,
            end: 1.0,
            text: String::new(),
            translation: String::new(),
            speaker_id: None,
        });
        assert!(validate_project(&project).is_err());
    }
}
