#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CipherSuite {
    XChaCha20Poly1305,
}

pub fn suite() -> CipherSuite {
    CipherSuite::XChaCha20Poly1305
}
