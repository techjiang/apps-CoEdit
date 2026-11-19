use crate::doc::{DocError, Document};
use crate::sync::delta::SyncDelta;
use crate::doc::operations::Operation;

pub fn apply_delta(doc: &mut Document, delta: &SyncDelta) -> Result<(), DocError> {
    for op in &delta.operations {
        doc.apply(Operation::RemoteText(op.clone()))?;
    }
    Ok(())
}

pub fn merge_documents(target: &mut Document, source: &Document) -> Result<(), DocError> {
    for op in source.raw_ops() {
        target.apply(Operation::RemoteText(op.clone()))?;
    }
    Ok(())
}
