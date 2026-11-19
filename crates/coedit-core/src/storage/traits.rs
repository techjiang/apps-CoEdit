use crate::doc::Document;

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("document not found")]
    NotFound,
}

pub trait DocumentStorage {
    fn save(&mut self, id: &str, doc: &Document) -> Result<(), StorageError>;
    fn load(&self, id: &str) -> Result<Document, StorageError>;
}
