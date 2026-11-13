use reqwest::Client;
use serde::Deserialize;

/// Single address balance as returned by the API.
#[derive(Debug, Clone, Deserialize)]
pub struct AddressBalance {
    pub address: String,
    pub final_balance: u64,
    pub total_received: u64,
    pub n_tx: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BalanceProbe {
    pub ok: bool,
    pub message: String,
}

/// Query the blockchain.info multiaddr endpoint for many addresses at once.
/// blockchain.info returns: { addresses: [ { address, final_balance, total_received, n_tx, ... } ] }
#[derive(Debug, Deserialize)]
struct MultiAddrResponse {
    addresses: Vec<AddressBalance>,
}

/// Check balances for a batch of addresses. Returns results in the same order
/// as the input addresses (missing addresses default to zero balance).
pub async fn check_balances(api_url: &str, addresses: &[String]) -> Result<Vec<AddressBalance>, String> {
    if addresses.is_empty() {
        return Ok(Vec::new());
    }

    let active = addresses.join("|");
    let url = format!("{}?active={}&n=0", api_url, active);

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let resp: MultiAddrResponse = client
        .get(&url)
        .header("User-Agent", "HappinessScanner/0.1")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let by_address: std::collections::HashMap<&str, &AddressBalance> =
        resp.addresses.iter().map(|a| (a.address.as_str(), a)).collect();

    Ok(addresses
        .iter()
        .map(|a| {
            by_address
                .get(a.as_str())
                .cloned()
                .unwrap_or(AddressBalance {
                    address: a.clone(),
                    final_balance: 0,
                    total_received: 0,
                    n_tx: Some(0),
                })
        })
        .collect())
}

/// Quick probe to verify the API is reachable (used by the settings "Test API" button).
pub async fn probe(config: crate::config::AppConfig) -> Result<BalanceProbe, String> {
    let test = vec!["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa".to_string()];
    match check_balances(&config.api_url, &test).await {
        Ok(_) => Ok(BalanceProbe {
            ok: true,
            message: "API reachable".to_string(),
        }),
        Err(e) => Ok(BalanceProbe {
            ok: false,
            message: e,
        }),
    }
}
