mod delta;
mod merge;
mod protocol;

pub use delta::SyncDelta;
pub use merge::{apply_delta, merge_documents};
pub use protocol::{SyncMessage, PROTOCOL_VERSION};
