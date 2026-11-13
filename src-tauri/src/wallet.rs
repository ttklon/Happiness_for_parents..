use bip32::{DerivationPath, XPrv};
use bip39::{Language, Mnemonic, Seed};
use bitcoin::{Address, Network, PublicKey};
use secp256k1::Secp256k1;

#[derive(Debug, thiserror::Error)]
pub enum WalletError {
    #[error("invalid mnemonic")]
    InvalidMnemonic,
    #[error("derivation error: {0}")]
    Derivation(String),
    #[error("address encoding error: {0}")]
    Address(String),
    #[error("unknown address type {0}")]
    UnknownAddressType(String),
}

/// Generates a fresh 12-word BIP39 mnemonic from 128 bits of entropy.
/// Every call uses fresh randomness, so mnemonics never repeat in practice.
pub fn generate_mnemonic() -> String {
    Mnemonic::generate(Language::English).to_string()
}

/// Derives a Bitcoin address for a BIP39 mnemonic at path m/44'/0'/0'/0/0
/// (same derivation as the reference Python script).
pub fn mnemonic_to_address(
    mnemonic: &str,
    network: Network,
    address_type: &str,
) -> Result<String, WalletError> {
    let words: Vec<&str> = mnemonic.split_whitespace().collect();
    let mnemonic =
        Mnemonic::from_phrase(&words, Language::English).map_err(|_| WalletError::InvalidMnemonic)?;
    let seed = Seed::new(&mnemonic, "");

    let secp = Secp256k1::new();
    let path = DerivationPath::from_str("m/44'/0'/0'/0/0")
        .map_err(|e| WalletError::Derivation(e.to_string()))?;
    let xprv = XPrv::new(&secp, network, seed.as_bytes(), &path)
        .map_err(|e| WalletError::Derivation(e.to_string()))?;
    let xpub = xprv.public_key(&secp);

    let public_key =
        PublicKey::from_slice(&xpub.public_key.serialize())
            .map_err(|e| WalletError::Address(e.to_string()))?;

    let address = match address_type {
        "legacy" => Address::p2pkh(&public_key, network),
        "segwit" => Address::p2wpkh_p2sh(&public_key, network)
            .ok_or_else(|| WalletError::Address("p2wpkh_p2sh unavailable".into()))?,
        "native" | "bech32" => Address::p2wpkh(&public_key, network)
            .ok_or_else(|| WalletError::Address("p2wpkh unavailable".into()))?,
        other => return Err(WalletError::UnknownAddressType(other.to_string())),
    };

    Ok(address.to_string())
}

/// Convenience: mnemonic -> legacy mainnet address (matches reference behaviour).
pub fn mnemonic_to_legacy_mainnet(mnemonic: &str) -> Result<String, WalletError> {
    mnemonic_to_address(mnemonic, Network::Bitcoin, "legacy")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn derives_mainnet_legacy_address() {
        let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        let addr = mnemonic_to_legacy_mainnet(mnemonic).expect("derivation should work");
        assert!(!addr.is_empty());
        assert!(addr.starts_with('1'));
    }
}
