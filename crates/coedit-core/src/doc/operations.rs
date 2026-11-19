use crate::crdt::text::TextOp;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Operation {
    Insert { index: usize, text: String },
    Delete { index: usize, len: usize },
    Format { from: usize, to: usize, bold: bool, italic: bool, link: Option<String> },
    RemoteText(TextOp),
    Noop,
}
