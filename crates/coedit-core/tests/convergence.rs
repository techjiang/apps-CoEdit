use coedit_core::crdt::text::TextCrdt;
use coedit_core::sync::merge_documents;
use coedit_core::{Document, DocumentOptions};
use uuid::Uuid;

#[test]
fn documents_converge_after_offline_edits() {
    let mut a = Document::with_replica(DocumentOptions::default(), Uuid::from_u128(10));
    let mut b = Document::with_replica(DocumentOptions::default(), Uuid::from_u128(20));

    a.insert(0, "hello ").unwrap();
    b.insert(0, "world").unwrap();

    let delta_a = a.delta(0);
    let delta_b = b.delta(0);
    a.apply_delta(&delta_b).unwrap();
    b.apply_delta(&delta_a).unwrap();

    assert_eq!(a.to_string(), b.to_string());
}

#[test]
fn merge_document_replays_operations() {
    let mut source = Document::default();
    source.insert(0, "abc").unwrap();
    let mut target = Document::default();
    merge_documents(&mut target, &source).unwrap();
    assert_eq!(target.to_string(), source.to_string());
}

#[test]
fn crdt_manual_convergence() {
    let mut a = TextCrdt::new(Uuid::from_u128(1));
    let mut b = TextCrdt::new(Uuid::from_u128(2));
    let oa1 = a.insert_local(0, 'a').unwrap();
    let oa2 = a.insert_local(1, 'b').unwrap();
    let ob = b.insert_local(0, 'c').unwrap();
    for op in [oa1, oa2] {
        b.apply_remote(op).unwrap();
    }
    a.apply_remote(ob).unwrap();
    assert_eq!(a.to_string(), b.to_string());
}
