use std::fs;
use std::io::Write;
use std::path::Path;
use std::sync::Arc;

use chrono::Utc;
use tauri::AppHandle;

use crate::state::AppState;

/// A wallet that had balance (or activity).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct HitRecord {
    pub id: String,
    pub address: String,
    pub mnemonic: String,
    pub balance: u64,
    pub received: u64,
    pub network: String,
    pub timestamp: String,
}

/// results directory: %APPDATA%\Happiness Scanner\results\
pub fn results_dir(handle: &AppHandle) -> std::io::Result<std::path::PathBuf> {
    let dir = handle
        .path_resolver()
        .app_data_dir()
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "app data dir"))?
        .join("results");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub fn hits_path(handle: &AppHandle) -> std::io::Result<std::path::PathBuf> {
    results_dir(handle).map(|d| d.join("hits.jsonl"))
}

pub fn empty_path(handle: &AppHandle) -> std::io::Result<std::path::PathBuf> {
    results_dir(handle).map(|d| d.join("empty.jsonl"))
}

/// Append a single hit record to a JSONL file.
pub fn append_hit_to_file(path: &Path, record: &HitRecord) -> std::io::Result<()> {
    let line = serde_json::to_string(record)?;
    fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)?
        .write_all(format!("{}\n", line).as_bytes())?;
    Ok(())
}

/// Append a zero-balance (empty) address to a JSONL file.
pub fn append_empty_to_file(
    path: &Path,
    address: &str,
    mnemonic: &str,
    balance: u64,
) -> std::io::Result<()> {
    let line = serde_json::to_string(&serde_json::json!({
        "address": address,
        "mnemonic": mnemonic,
        "balance": balance,
        "timestamp": Utc::now().to_rfc3339(),
    }))?;
    fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)?
        .write_all(format!("{}\n", line).as_bytes())?;
    Ok(())
}

/// Return in-memory hits for the UI.
pub fn list(state: Arc<AppState>) -> Vec<HitRecord> {
    state.hits.lock().unwrap().clone()
}

pub fn clear(state: Arc<AppState>) -> Result<(), String> {
    state.hits.lock().map_err(|e| e.to_string())?.clear();
    Ok(())
}

/// Flush in-memory hits to results/hits.jsonl so they survive restarts.
pub fn flush_hits(handle: &AppHandle, state: Arc<AppState>) -> std::io::Result<()> {
    let hits = state.hits.lock().unwrap().clone();
    let path = hits_path(handle)?;
    let mut out = String::new();
    for h in &hits {
        out.push_str(&serde_json::to_string(h)?);
        out.push('\n');
    }
    fs::write(&path, out)?;
    Ok(())
}

#[allow(dead_code)]
fn now_rfc3339() -> String {
    Utc::now().to_rfc3339()
}
