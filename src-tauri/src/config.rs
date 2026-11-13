use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;

/// Defaults match the behaviour of the reference Python script but exposed
/// through a nice UI so the user can tune load level and behaviour.
const DEFAULT_WORKERS: u32 = 2;
const DEFAULT_BATCH_SIZE: usize = 100;
const DEFAULT_DELAY_MS: u64 = 15_000;
const DEFAULT_NETWORK: &str = "mainnet";
const DEFAULT_ADDRESS_TYPE: &str = "legacy";
const DEFAULT_API_URL: &str = "https://blockchain.info/multiaddr";

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
        }
    }
}

/// Returns the per-user config path: %APPDATA%\Happiness Scanner\config.json
pub fn config_path(handle: &AppHandle) -> std::io::Result<std::path::PathBuf> {
    let dir = handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "app data dir"))?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("config.json"))
}

/// Persist config to disk.
pub fn save(handle: &AppHandle, config: &AppConfig) -> Result<String, String> {
    let path = config_path(handle).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(format!("Config saved to {:?}", path))
}

/// Load config from disk, falling back to defaults.
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
