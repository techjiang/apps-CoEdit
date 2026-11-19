use super::history::History;
use super::operations::Operation;
use super::snapshot::Snapshot;
use crate::crdt::text::{TextCrdt, TextError, TextOp};
use crate::sync::SyncDelta;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DocumentType {
    Text,
    RichText,
    Json,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentOptions {
    #[serde(default = "default_doc_type")]
    pub document_type: DocumentType,
    #[serde(default)]
    pub encrypted: bool,
}

fn default_doc_type() -> DocumentType {
    DocumentType::Text
}

impl Default for DocumentOptions {
    fn default() -> Self {
        Self { document_type: DocumentType::Text, encrypted: false }
    }
}

#[derive(Debug, Clone, Default)]
pub struct Document {
    pub options: DocumentOptions,
    crdt: TextCrdt,
    version: u64,
    history: History,
}

impl Document {
    pub fn new(options: DocumentOptions) -> Self {
        Self { options, crdt: TextCrdt::new(Uuid::new_v4()), version: 0, history: History::default() }
    }

    pub fn with_replica(options: DocumentOptions, replica: Uuid) -> Self {
        Self { options, crdt: TextCrdt::new(replica), version: 0, history: History::default() }
    }

    pub fn replica(&self) -> Uuid {
        self.crdt.replica
    }

    pub fn version(&self) -> u64 {
        self.version
    }

    pub fn len(&self) -> usize {
        self.crdt.len()
    }

    pub fn is_empty(&self) -> bool {
        self.crdt.is_empty()
    }

    pub fn to_string(&self) -> String {
        self.crdt.to_string()
    }

    pub fn insert(&mut self, index: usize, text: &str) -> Result<Vec<TextOp>, DocError> {
        let mut ops = Vec::new();
        for (offset, ch) in text.chars().enumerate() {
            ops.push(self.crdt.insert_local(index + offset, ch)?);
        }
        self.commit(&Operation::Insert { index, text: text.to_string() }, &ops);
        Ok(ops)
    }

    pub fn delete(&mut self, index: usize, len: usize) -> Result<Vec<TextOp>, DocError> {
        let mut ops = Vec::new();
        for offset in 0..len {
            let position = index + offset;
            if position >= self.crdt.len() {
                break;
            }
            ops.push(self.crdt.delete_local(position)?);
        }
        self.commit(&Operation::Delete { index, len }, &ops);
        Ok(ops)
    }

    pub fn apply(&mut self, op: Operation) -> Result<(), DocError> {
        match op {
            Operation::Insert { index, text } => { self.insert(index, &text)?; }
            Operation::Delete { index, len } => { self.delete(index, len)?; }
            Operation::RemoteText(text_op) => {
                self.crdt.apply_remote(text_op.clone())?;
                self.commit(&Operation::RemoteText(text_op), std::slice::from_ref(&text_op));
            }
            Operation::Format { .. } | Operation::Noop => self.commit(&op, &[]),
        }
        Ok(())
    }

    pub fn delta(&self, from_version: u64) -> SyncDelta {
        let operations: Vec<TextOp> = self
            .crdt
            .ops()
            .iter()
            .filter(|op| op.id.counter >= from_version)
            .cloned()
            .collect();
        SyncDelta { from_version, to_version: self.version, operations }
    }

    pub fn apply_delta(&mut self, delta: &SyncDelta) -> Result<(), DocError> {
        crate::sync::apply_delta(self, delta)
    }

    pub fn snapshot(&self) -> Snapshot {
        Snapshot {
            version: self.version,
            content: self.to_string(),
            operations: self.crdt.ops().to_vec(),
        }
    }

    pub fn history(&self) -> &History {
        &self.history
    }

    pub fn restore(&mut self, version: u64) -> Result<(), DocError> {
        let snapshot = self.history.get(version).cloned().ok_or(DocError::VersionNotFound)?;
        self.crdt = TextCrdt::new(self.crdt.replica);
        for op in snapshot.operations {
            self.crdt.apply_remote(op)?;
        }
        self.version = snapshot.version;
        Ok(())
    }

    pub fn raw_ops(&self) -> &[TextOp] {
        self.crdt.ops()
    }

    fn commit(&mut self, _operation: &Operation, _ops: &[TextOp]) {
        self.version += 1;
        self.history.push(self.snapshot());
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DocError {
    #[error(transparent)]
    Text(#[from] TextError),
    #[error("version not found")]
    VersionNotFound,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn insert_delete_and_history() {
        let mut doc = Document::default();
        doc.insert(0, "abc").unwrap();
        doc.delete(1, 1).unwrap();
        assert_eq!(doc.to_string(), "ac");
        assert!(doc.history().get(1).is_some());
        doc.restore(1).unwrap();
        assert_eq!(doc.to_string(), "abc");
    }
}
