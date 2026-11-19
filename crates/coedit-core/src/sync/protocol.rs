use serde::{Deserialize, Serialize};

pub const PROTOCOL_VERSION: u8 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SyncMessage {
    Hello { version: u8, replica: String },
    Delta { from_version: u64, to_version: u64, operations: Vec<crate::crdt::text::TextOp> },
    Presence { user_id: String, name: String, color: String },
    Ping,
}
