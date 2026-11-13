use reqwest::Client;

/// Send a Telegram message about a found wallet (balance > 0 or activity).
pub async fn send_telegram(token: &str, chat_id: &str, text: &str) -> Result<(), String> {
    if token.is_empty() || chat_id.is_empty() {
        return Ok(()); // not configured — silently skip
    }
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("https://api.telegram.org/bot{}/sendMessage", token);
    let body = serde_json::json!({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": true,
    });
    client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    Ok(())
}
