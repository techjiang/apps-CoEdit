use crate::crdt::text::TextOp;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Snapshot {
    pub version: u64,
    pub content: String,
    pub operations: Vec<TextOp>,
}
