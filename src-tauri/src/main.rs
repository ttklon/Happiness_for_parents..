#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri::State;

mod balance;
mod config;
mod notifier;
mod results;
mod scanner;
mod state;
mod wallet;

use config::AppConfig;
use state::AppState;

#[tauri::command]
async fn start_scanner(
    handle: tauri::AppHandle,
    state: State<'_, AppState>,
    config: AppConfig,
) -> Result<String, String> {
    scanner::start(handle, state.inner().clone(), config)
}

#[tauri::command]
fn stop_scanner(state: State<'_, AppState>) -> Result<String, String> {
    scanner::stop(state.inner().clone())
}

#[tauri::command]
fn get_stats(state: State<'_, AppState>) -> Result<scanner::ScanStats, String> {
    Ok(state.stats.lock().map_err(|e| e.to_string())?.clone())
}

#[tauri::command]
fn save_config(handle: tauri::AppHandle, config: AppConfig) -> Result<String, String> {
    config::save(&handle, &config)
}

#[tauri::command]
fn load_config(handle: tauri::AppHandle) -> Result<AppConfig, String> {
    config::load(&handle)
}

#[tauri::command]
fn get_hits(state: State<'_, AppState>) -> Result<Vec<results::HitRecord>, String> {
    results::list(state.inner().clone())
}

#[tauri::command]
fn clear_hits(state: State<'_, AppState>) -> Result<String, String> {
    results::clear(state.inner().clone())
}

#[tauri::command]
fn toggle_window(app: tauri::AppHandle) -> Result<String, String> {
    if let Some(window) = app.get_window("main") {
        if window.is_visible().unwrap_or(false) {
            window.hide()?;
            Ok("hidden".to_string())
        } else {
            window.show()?;
            window.set_focus()?;
            Ok("shown".to_string())
        }
    } else {
        Err("main window not found".to_string())
    }
}

#[tauri::command]
fn test_api(config: AppConfig) -> Result<balance::BalanceProbe, String> {
    balance::probe(&config)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            start_scanner,
            stop_scanner,
            get_stats,
            save_config,
            load_config,
            get_hits,
            clear_hits,
            toggle_window,
            test_api,
        ])
        .setup(|app| {
            // System tray icon so the app keeps running in the background on Windows 11.
            let tray_icon = app.default_window_icon();
            let builder = tauri::TrayIconBuilder::new()
                .tooltip("Happiness Scanner — работает в фоне")
                .menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    match event.id().as_str() {
                        "show" => {
                            if let Some(w) = app.get_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(w) = app.get_window("main") {
                                let _ = w.hide();
                            }
                        }
                        "quit" => {
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                });
            let builder = match tray_icon {
                Some(icon) => builder.icon(icon),
                None => builder,
            };
            let _tray = builder.build(app)?;

            // Minimize-to-tray instead of closing: keep scanning in the background.
            let window = app.get_window("main").expect("main window must exist");
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window_clone.hide();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
}
