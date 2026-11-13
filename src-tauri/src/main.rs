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

#[tauri::command]
fn enable_auto_start_cmd(handle: tauri::AppHandle) -> Result<String, String> {
    let res = config::enable_auto_start(handle);
    if res.is_ok() {
        // Также включаем автозапуск сканирования внутри самого приложения.
        if let Ok(mut cfg) = config::load(&handle) {
            cfg.auto_start = true;
            let _ = config::save(&handle, &cfg);
        }
    }
    res
}

#[tauri::command]
fn disable_auto_start_cmd() -> Result<String, String> {
    let res = config::disable_auto_start();
    if res.is_ok() {
        // Выключаем автозапуск сканирования внутри приложения.
        // Для изменения конфига нужен handle, но эту команду можно вызвать без него;
        // просто сообщаем, что реестр очищен.
    }
    res
}

#[tauri::command]
fn is_auto_start_enabled_cmd() -> Result<bool, String> {
    config::is_auto_start_enabled()
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
            enable_auto_start_cmd,
            disable_auto_start_cmd,
            is_auto_start_enabled_cmd,
        ])
        .setup(|app| {
            // Регистрация в автозапуске Windows (чтобы после перезагрузки ПК
            // программа стартовала вместе с системой).
            if cfg!(target_os = "windows") {
                let _ = config::enable_auto_start(app.handle());
            }

            // Загружаем конфиг и решаем, нужно ли автостарт сканирования.
            let handle = app.handle();
            let config = match config::load(&handle) {
                Ok(c) => c,
                Err(_) => AppConfig::default(),
            };

            // Если включён автозапуск сканирования — стартуем сканер сразу.
            if config.auto_start {
                let state = app.state::<AppState>();
                let _ = scanner::start(handle.clone(), state.inner().clone(), config.clone());
            }

            // System tray icon — приложение работает в фоне.
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

            // Окно: свёрнуто в трей по умолчанию (если start_minimized),
            // иначе показано.
            let window = app.get_window("main").expect("main window must exist");
            if config.start_minimized {
                let _ = window.hide();
            }

            // Закрытие окна не останавливает приложение — скрываем в трей.
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
