use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};

use rand::RngCore;
use tokio::sync::broadcast;

use crate::config::AppConfig;
use crate::results::{append_empty_to_file, append_hit_to_file, HitRecord};
use crate::state::AppState;
use crate::wallet::{generate_mnemonic, mnemonic_to_address};
use crate::balance::check_balances;

/// Live statistics shown in the UI.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct ScanStats {
    pub running: bool,
    pub workers: u32,
    pub total_checked: u64,
    pub hits: u64,
    pub empty: u64,
    pub received_but_empty: u64,
    pub checks_per_hour: f64,
    pub uptime_seconds: u64,
    pub last_address: String,
    pub last_mnemonic: String,
    pub last_balance: u64,
}

/// Spawn `config.workers` background workers. Each worker endlessly:
///   1. draws fresh 128-bit entropy -> 12-word mnemonic (never repeated),
///   2. derives the address(es),
///   3. queries the balance API in batches,
///   4. records hits / empties and writes hits to disk.
pub fn start(
    handle: tauri::AppHandle,
    state: Arc<AppState>,
    config: AppConfig,
) -> Result<String, String> {
    {
        let mut st = state.stats.lock().map_err(|e| e.to_string())?;
        if st.running {
            return Ok("scanner already running".to_string());
        }
        *st = ScanStats {
            running: true,
            workers: config.workers,
            ..Default::default()
        };
        *state.started_at.lock().map_err(|e| e.to_string())? = Some(Instant::now());
        *state.config.lock().map_err(|e| e.to_string())? = Some(config.clone());
    }

    // Persist file paths so workers can append hits/empties to disk.
    let hits_path = crate::results::hits_path(&handle).unwrap_or_default();
    let empty_path = crate::results::empty_path(&handle).unwrap_or_default();
    *state.hits_path.lock().map_err(|e| e.to_string())? = Some(hits_path);
    *state.empty_path.lock().map_err(|e| e.to_string())? = Some(empty_path);

    // Broadcast channel used to ask every worker to stop.
    let (tx, _rx) = broadcast::channel::<()>(16);
    *state.stop_tx.lock().map_err(|e| e.to_string())? = Some(tx.clone());

    let network: bitcoin::Network = config
        .network
        .parse()
        .unwrap_or(bitcoin::Network::Bitcoin);
    let address_type = config.address_type.clone();
    let batch_size = config.batch_size;
    let delay_ms = config.delay_ms;
    let api_url = config.api_url.clone();
    let save_empty = config.save_empty;
    let network_str = config.network.clone();

    for worker_id in 0..config.workers {
        let state = Arc::clone(&state);
        let hits_path = hits_path.clone();
        let empty_path = empty_path.clone();
        let mut stop_rx = tx.subscribe();

        tokio::spawn(async move {
            worker_loop(
                worker_id,
                state,
                network,
                address_type.clone(),
                batch_size,
                delay_ms,
                &api_url,
                save_empty,
                &network_str,
                &hits_path,
                &empty_path,
                &mut stop_rx,
            )
            .await;
        });
    }

    Ok(format!("scanner started with {} workers", config.workers))
}

/// Ask all workers to stop and mark stats as not running.
pub fn stop(state: Arc<AppState>) -> Result<String, String> {
    if let Some(tx) = state.stop_tx.lock().map_err(|e| e.to_string())?.take() {
        let _ = tx.send(());
    }
    {
        let mut st = state.stats.lock().map_err(|e| e.to_string())?;
        st.running = false;
    }
    Ok("scanner stopping".to_string())
}

async fn worker_loop(
    worker_id: u32,
    state: Arc<AppState>,
    network: bitcoin::Network,
    address_type: String,
    batch_size: usize,
    delay_ms: u64,
    api_url: &str,
    save_empty: bool,
    network_str: &str,
    hits_path: &PathBuf,
    empty_path: &PathBuf,
    stop_rx: &mut broadcast::Receiver<()>,
) {
    let mut batch: Vec<String> = Vec::with_capacity(batch_size);
    let mut batch_mnemonics: Vec<String> = Vec::with_capacity(batch_size);

    loop {
        // Stop requested?
        if stop_rx.try_recv().is_ok() {
            break;
        }

        // Generate a fresh mnemonic, skip if we already checked this entropy.
        let mnemonic = generate_mnemonic();
        let entropy = mnemonic_entropy(&mnemonic);
        {
            let mut seen = state.seen.lock().unwrap();
            if !seen.insert(entropy) {
                continue; // already checked — choose a new one
            }
        }

        let address = match mnemonic_to_address(&mnemonic, network, &address_type) {
            Ok(a) => a,
            Err(_) => continue,
        };

        batch.push(address.clone());
        batch_mnemonics.push(mnemonic.clone());

        if batch.len() < batch_size {
            tokio::time::sleep(Duration::from_millis(50)).await;
            continue;
        }

        // Query balances for the whole batch in one API call.
        match check_balances(api_url, &batch).await {
            Ok(balances) => process_results(
                state,
                save_empty,
                &batch,
                &batch_mnemonics,
                &balances,
                network_str,
                hits_path,
                empty_path,
            ),
            Err(e) => {
                log::warn!(target: "scanner", "worker {} balance api error: {}", worker_id, e);
                tokio::time::sleep(Duration::from_secs(10)).await;
            }
        }

        batch.clear();
        batch_mnemonics.clear();

        if delay_ms > 0 {
            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
        }

        update_stats(&state);
    }
}

fn process_results(
    state: &Arc<AppState>,
    save_empty: bool,
    addresses: &[String],
    mnemonics: &[String],
    balances: &[crate::balance::AddressBalance],
    network_str: &str,
    hits_path: &PathBuf,
    empty_path: &PathBuf,
) {
    let mut hits = state.hits.lock().unwrap();
    let mut stats = state.stats.lock().unwrap();

    for (i, addr) in addresses.iter().enumerate() {
        let mnemonic = mnemonics.get(i).cloned().unwrap_or_default();
        let bal = balances.get(i).cloned().unwrap_or_default();

        stats.total_checked += 1;
        stats.last_address = addr.clone();
        stats.last_mnemonic = mnemonic.clone();
        stats.last_balance = bal.final_balance;

        if bal.final_balance > 0 {
            stats.hits += 1;
            let record = HitRecord {
                id: uuid::Uuid::new_v4().to_string(),
                address: addr.clone(),
                mnemonic,
                balance: bal.final_balance,
                received: bal.total_received,
                network: network_str.to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
            };
            hits.push(record.clone());
            let _ = append_hit_to_file(hits_path, &record);
        } else if bal.total_received > 0 {
            stats.received_but_empty += 1;
        } else {
            stats.empty += 1;
            if save_empty {
                let _ = append_empty_to_file(empty_path, addr, &mnemonic, bal.final_balance);
            }
        }
    }

    if hits.len() > 5000 {
        hits.drain(0..hits.len() - 5000);
    }
}

fn update_stats(state: &Arc<AppState>) {
    let mut stats = state.stats.lock().unwrap();
    if let Some(started) = state.started_at.lock().unwrap().as_ref() {
        let elapsed = started.elapsed().as_secs_f64();
        if elapsed > 0.0 {
            stats.checks_per_hour = stats.total_checked as f64 / elapsed * 3600.0;
            stats.uptime_seconds = elapsed as u64;
        }
    }
}

/// Deterministic fingerprint of the mnemonic so the same phrase is never re-checked.
fn mnemonic_entropy(mnemonic: &str) -> [u8; 16] {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(mnemonic.as_bytes());
    let out = hasher.finalize();
    let mut entropy = [0u8; 16];
    entropy.copy_from_slice(&out[..16]);
    entropy
}
