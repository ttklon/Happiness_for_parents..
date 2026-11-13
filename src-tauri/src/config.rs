use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;

const DEFAULT_WORKERS: u32 = 2;
const DEFAULT_BATCH_SIZE: usize = 100;
const DEFAULT_DELAY_MS: u64 = 15_000;
const DEFAULT_NETWORK: &str = "mainnet";
const DEFAULT_ADDRESS_TYPE: &str = "legacy";
const DEFAULT_API_URL: &str = "https://blockchain.info/multiaddr";
const DEFAULT_SCAN_MODE: &str = "random";
const DEFAULT_AUTO_START: bool = true;
const DEFAULT_START_MINIMIZED: bool = true;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub workers: u32,
    pub batch_size: usize,
    pub delay_ms: u64,
    pub save_empty: bool,
    pub api_url: String,
    pub telegram_token: String,
    pub telegram_chat_id: String,
    pub network: String,
    pub address_type: String,
    pub scan_mode: String,
    pub extra_wordlist: String,
    pub auto_start: bool,
    pub start_minimized: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            workers: DEFAULT_WORKERS,
            batch_size: DEFAULT_BATCH_SIZE,
            delay_ms: DEFAULT_DELAY_MS,
            save_empty: true,
            api_url: DEFAULT_API_URL.to_string(),
            telegram_token: String::new(),
            telegram_chat_id: String::new(),
            network: DEFAULT_NETWORK.to_string(),
            address_type: DEFAULT_ADDRESS_TYPE.to_string(),
            scan_mode: DEFAULT_SCAN_MODE.to_string(),
            extra_wordlist: String::new(),
            auto_start: DEFAULT_AUTO_START,
            start_minimized: DEFAULT_START_MINIMIZED,
        }
    }
}

pub fn config_path(handle: &AppHandle) -> std::io::Result<std::path::PathBuf> {
    let dir = handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "app data dir"))?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("config.json"))
}

pub fn save(handle: &AppHandle, config: &AppConfig) -> Result<String, String> {
    let path = config_path(handle).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(format!("Config saved to {:?}", path))
}

pub fn load(handle: &AppHandle) -> Result<AppConfig, String> {
    let path = config_path(handle).map_err(|e| e.to_string())?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let json = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: AppConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
pub fn config_path_command(handle: AppHandle) -> Result<String, String> {
    config_path(&handle)
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// Регистрация приложения в автозапуске Windows (HKCU\...\Run).
/// Позволяет программе стартовать вместе с Windows после перезагрузки.
#[tauri::command]
pub fn enable_auto_start(handle: AppHandle) -> Result<String, String> {
    if cfg!(target_os = "windows") {
        let exe_path = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .to_string();
        let key = r"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run";
        let value_name = "HappinessScanner";
        // Используем reg add через cmd.
        let output = std::process::Command::new("reg")
            .args(&[
                "ADD",
                key,
                "/V",
                value_name,
                "/T",
                "REG_SZ",
                "/D",
                &exe_path,
                "/F",
            ])
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            Ok("Автозапуск с Windows включён".to_string())
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            Err(format!("Не удалось добавить в автозапуск: {}", err))
        }
    } else {
        Err("Автозапуск поддерживается только на Windows".to_string())
    }
}

/// Удаление из автозапуска Windows.
#[tauri::command]
pub fn disable_auto_start() -> Result<String, String> {
    if cfg!(target_os = "windows") {
        let key = r"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run";
        let value_name = "HappinessScanner";
        let output = std::process::Command::new("reg")
            .args(&["DELETE", key, "/V", value_name, "/F"])
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            Ok("Автозапуск с Windows выключен".to_string())
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            Err(format!("Не удалось убрать из автозапуска: {}", err))
        }
    } else {
        Err("Автозапуск поддерживается только на Windows".to_string())
    }
}

/// Проверка, есть ли приложение в автозапуске Windows.
#[tauri::command]
pub fn is_auto_start_enabled() -> Result<bool, String> {
    if cfg!(target_os = "windows") {
        let key = r"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run";
        let value_name = "HappinessScanner";
        let output = std::process::Command::new("reg")
            .args(&["QUERY", key, "/V", value_name])
            .output()
            .map_err(|e| e.to_string())?;
        Ok(output.status.success())
    } else {
        Ok(false)
    }
}
