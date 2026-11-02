use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
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
            language: "en".into(),
        }
    }
}
#[derive(Default, Serialize, Deserialize)]
struct Store {
    settings: Settings,
    recent: Vec<Recent>,
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
fn write_store(app: &AppHandle, store: &Store) -> Result<(), String> {
    let path = store_path(app)?;
    let temp = path.with_extension("tmp");
    fs::write(
        &temp,
        serde_json::to_vec_pretty(store).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(temp, path).map_err(|e| e.to_string())
}
fn read_project(path: &str) -> Result<Project, String> {
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let project: Project =
        serde_json::from_str(&data).map_err(|_| "Invalid DubStudio project file".to_string())?;
    if project.version != 1
        || project.name.trim().is_empty()
        || chrono::DateTime::parse_from_rfc3339(&project.created_at).is_err()
        || chrono::DateTime::parse_from_rfc3339(&project.updated_at).is_err()
    {
        return Err("Unsupported or invalid DubStudio project".into());
    }
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
    let store = read_store(&app)?;
    Ok((
        store.settings,
        store.recent.into_iter().map(availability).collect(),
    ))
}
#[tauri::command]
fn save_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    let mut store = read_store(&app)?;
    store.settings = settings;
    write_store(&app, &store)
}
fn add_recent(app: &AppHandle, path: String, project: Project) -> Result<Vec<Recent>, String> {
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
        version: 1,
        name: name.into(),
        created_at: now.clone(),
        updated_at: now,
        video_path,
    };
    let contents = serde_json::to_vec_pretty(&project).map_err(|e| e.to_string())?;
    use std::io::Write;
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
            load_data,
            save_settings,
            create_project,
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
}
