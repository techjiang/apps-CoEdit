use super::traits::{DocumentStorage, StorageError};
use crate::doc::{Document, DocumentOptions};
use std::collections::HashMap;

#[derive(Debug, Default)]
pub struct MemoryStorage {
    docs: HashMap<String, Vec<u8>>,
}

impl DocumentStorage for MemoryStorage {
    fn save(&mut self, id: &str, doc: &Document) -> Result<(), StorageError> {
        let snapshot = serde_json::to_vec(&doc.snapshot()).map_err(|_| StorageError::NotFound)?;
        self.docs.insert(id.to_string(), snapshot);
        Ok(())
    }

    fn load(&self, id: &str) -> Result<Document, StorageError> {
        let bytes = self.docs.get(id).ok_or(StorageError::NotFound)?;
        let _snapshot: crate::doc::Snapshot = serde_json::from_slice(bytes).map_err(|_| StorageError::NotFound)?;
        Ok(Document::new(DocumentOptions::default()))
    }
}
