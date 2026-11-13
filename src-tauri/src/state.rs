use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use crate::config::AppConfig;
use crate::scanner::ScanStats;
use crate::results::HitRecord;

/// Shared runtime state, owned by Tauri and handed to commands via `State`.
pub struct AppState {
    pub stats: Mutex<ScanStats>,
    pub hits: Mutex<Vec<HitRecord>>,
    /// Entropies already checked in this session (16 bytes each) — guarantees
    /// we never repeat the same mnemonic ("по новым всегда").
    pub seen: Mutex<HashSet<[u8; 16]>>,
    pub started_at: Mutex<Option<Instant>>,
    pub config: Mutex<Option<AppConfig>>,
    /// Handle used to signal the scanner loop to stop.
    pub stop_tx: Mutex<Option<tokio::sync::broadcast::Sender<()>>>,
    /// Where hit records are persisted on disk.
    pub hits_path: Mutex<Option<PathBuf>>,
    /// Where zero-balance addresses are persisted on disk.
    pub empty_path: Mutex<Option<PathBuf>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            stats: Mutex::new(ScanStats::default()),
            hits: Mutex::new(Vec::new()),
            seen: Mutex::new(HashSet::new()),
            started_at: Mutex::new(None),
            config: Mutex::new(None),
            stop_tx: Mutex::new(None),
            hits_path: Mutex::new(None),
            empty_path: Mutex::new(None),
        }
    }
}
