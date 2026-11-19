use crate::crdt::text::TextOp;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SyncDelta {
    pub from_version: u64,
    pub to_version: u64,
    pub operations: Vec<TextOp>,
}
