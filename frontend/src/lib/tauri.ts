import { invoke } from '@tauri-apps/api/core';

export interface AppConfig {
  workers: number;
  batch_size: number;
  delay_ms: number;
  save_empty: boolean;
  api_url: string;
  telegram_token: string;
  telegram_chat_id: string;
  network: string;
  address_type: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  workers: 2,
  batch_size: 100,
  delay_ms: 15000,
  save_empty: true,
  api_url: 'https://blockchain.info/multiaddr',
  telegram_token: '',
  telegram_chat_id: '',
  network: 'mainnet',
  address_type: 'legacy',
};

export interface ScanStats {
  running: boolean;
  workers: number;
  total_checked: number;
  hits: number;
  empty: number;
  received_but_empty: number;
  checks_per_hour: number;
  uptime_seconds: number;
  last_address: string;
  last_mnemonic: string;
  last_balance: number;
}

export interface HitRecord {
  id: string;
  address: string;
  mnemonic: string;
  balance: number;
  received: number;
  network: string;
  timestamp: string;
}

export interface BalanceProbe {
  ok: boolean;
  message: string;
}

export async function loadConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('load_config');
}

export async function saveConfig(config: AppConfig): Promise<string> {
  return invoke<string>('save_config', { config });
}

export async function startScanner(config: AppConfig): Promise<string> {
  return invoke<string>('start_scanner', { config });
}

export async function stopScanner(): Promise<string> {
  return invoke<string>('stop_scanner');
}

export async function getStats(): Promise<ScanStats> {
  return invoke<ScanStats>('get_stats');
}

export async function getHits(): Promise<HitRecord[]> {
  return invoke<HitRecord[]>('get_hits');
}

export async function clearHits(): Promise<string> {
  return invoke<string>('clear_hits');
}

export async function toggleWindow(): Promise<string> {
  return invoke<string>('toggle_window');
}

export async function testApi(config: AppConfig): Promise<BalanceProbe> {
  return invoke<BalanceProbe>('test_api', { config });
}

export function formatBalance(satoshis: number): string {
  return (satoshis / 1e8).toFixed(8);
}

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}
