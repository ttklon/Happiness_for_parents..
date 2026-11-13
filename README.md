# Happiness Scanner

A **Rust + Tauri** desktop application that endlessly searches for Bitcoin wallets with a balance in the background on Windows 11 — a desktop re-imagining of the [bitgen-by-congrammer](https://github.com/Congrammer/bitgen-by-congrammer) scanner.

## What it does

- Generates random **BIP39 12-word mnemonics** and derives **BIP44 Bitcoin addresses** (`m/44'/0'/0'/0/0`), exactly like the reference Python script.
- Checks balances in batches via the **blockchain.info** `multiaddr` API.
- Saves every wallet with a balance (`results/hits.jsonl`) and optionally zero-balance addresses (`results/empty.jsonl`).
- Sends **Telegram notifications** when a hit is found.
- Runs **endlessly in the background** on Windows 11 via a system tray icon; closing the window minimizes to tray instead of quitting.
- **Never repeats**: each mnemonic is drawn from fresh 128-bit entropy and checked mnemonics are fingerprinted, so it always searches *new* wallets ("по новым всегда").
- **Configurable load level**: number of worker threads, batch size, and delay between batches — run several workers at once for higher throughput.

## Repository layout

```
src-tauri/              Rust backend (Tauri v2)
  Cargo.toml            Rust dependencies
  tauri.conf.json       Tauri app/bundle config
  src/
    main.rs             App entry, tray icon, minimize-to-tray, commands
    config.rs           Settings persistence (%APPDATA%\Happiness Scanner\config.json)
    state.rs            Shared runtime state (stats, hits, seen-mnemonics set)
    wallet.rs           BIP39 mnemonic + BIP32/BIP44 derivation -> Bitcoin address
    scanner.rs          Infinite background worker loop (never repeats)
    balance.rs          Balance API client (blockchain.info multiaddr)
    results.rs          Hit/empty record persistence (JSONL)
    notifier.rs         Telegram notifications
frontend/               React + Vite + TypeScript + Tailwind UI
  src/                  UI source (dashboard, settings, hits)
  tailwind.config.cjs   Tailwind config (CommonJS)
  input.css             Tailwind source + custom component CSS
  output.css            Generated utility CSS (produced by `npm run css`)
  dist/                 Production build output
```

## Prerequisites (Windows 11)

To build and run the `.msi` installer you need on your Windows machine:

- **Rust toolchain** (stable): https://rustup.rs/
  ```powershell
  # install rustup, then:
  rustup default stable
  ```
- **Tauri CLI**:
  ```powershell
  cargo install tauri-cli
  ```
- **Node.js** (for the frontend): https://nodejs.org/
- Windows build tools (C++ build tools / Visual Studio Build Tools) — Tauri/MSI bundling needs them.

> **Important:** This sandbox could *not* install the Rust toolchain (outbound network is restricted to `github.com`, `npm`, and `pypi`; `static.rust-lang.org` / `sh.rustup.rs` are blocked), so the Rust binary was **not compiled here**. The Rust source is complete and ready to compile on your Windows 11 machine. The frontend (TypeScript + Vite) *was* compiled and verified in this sandbox.

## Build & run on Windows 11

1. Clone the repo and open PowerShell in the repo root:
   ```powershell
   cd src-tauri
   ```

2. Install frontend dependencies and build the UI:
   ```powershell
   cd ../frontend
   npm install
   npm run build       # generates frontend/dist (Tailwind CSS + Vite bundle)
   cd ../src-tauri
   ```

3. Build the Tauri app (produces an MSI installer in `src-tauri/target/release/bundle/`):
   ```powershell
   cargo tauri build
   ```

4. Install the MSI and launch "Happiness Scanner".

### First run
- Open **Настройки** (Settings), tune the load level:
  - **Рабочих потоков** — how many parallel scanner workers (1–32). More = higher CPU/network load, faster searching.
  - **Размер批量** — addresses checked per API request.
  - **Задержка между批量** — pause between batches (ms), to avoid an IP ban from the API.
  - **Сохранять пустые адреса** — write zero-balance wallets to `results/empty.jsonl`.
- Optionally add your **Telegram bot token** and **chat ID** (create a bot via @BotFather, get your ID via @userinfobot) to receive hit notifications.
- Click **Проверить API** to confirm blockchain.info is reachable.
- Save, then go to **Панель** and click **Запустить сканер**.
- The scanner runs endlessly in the background. You can close the window — it minimizes to the system tray and keeps scanning.

## Where results are stored

- Config: `%APPDATA%\Happiness Scanner\config.json`
- Hits: `%APPDATA%\Happiness Scanner\results\hits.jsonl` (wallets with balance)
- Empties: `%APPDATA%\Happiness Scanner\results\empty.jsonl` (optional)
- Logs: via Tauri plugin-log in `%APPDATA%\Happiness Scanner\`

## Notes / disclaimer

- This is a **statistical search tool**: the chance of randomly hitting a funded Bitcoin address is astronomically small. It is intended as a learning/experiment project, not a guaranteed way to find funds.
- Only search addresses you derive yourself; do not scan addresses belonging to others.
- Respect the balance API's rate limits (use the delay setting) to avoid IP bans.
- Frontend dependencies were verified with `npm run build` in this sandbox; the Rust backend must be compiled with `cargo tauri build` on Windows.

## License

GPL-3.0 (same spirit as the reference `bitgen-by-congrammer` project).
