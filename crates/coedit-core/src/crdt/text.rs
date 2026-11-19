use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use uuid::Uuid;

pub type ReplicaId = Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct OpId {
    pub counter: u64,
    pub replica: ReplicaId,
}

impl OpId {
    pub fn new(counter: u64, replica: ReplicaId) -> Self {
        Self { counter, replica }
    }
}

impl Ord for OpId {
    fn cmp(&self, other: &Self) -> Ordering {
        self.counter
            .cmp(&other.counter)
            .then_with(|| self.replica.as_u128().cmp(&other.replica.as_u128()))
    }
}

impl PartialOrd for OpId {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TextOp {
    pub id: OpId,
    pub origin: Option<OpId>,
    pub ch: char,
    pub deleted: bool,
}

/// Minimal RGA-style sequence CRDT.
/// Inserts are ordered by causal origin plus deterministic OpId ordering.
#[derive(Debug, Clone)]
pub struct TextCrdt {
    pub replica: ReplicaId,
    counter: u64,
    ops: Vec<TextOp>,
}

impl Default for TextCrdt {
    fn default() -> Self {
        Self::new(Uuid::nil())
    }
}

impl TextCrdt {
    pub fn new(replica: ReplicaId) -> Self {
        Self { replica, counter: 0, ops: Vec::new() }
    }

    fn next_id(&mut self) -> OpId {
        let id = OpId::new(self.counter, self.replica);
        self.counter += 1;
        id
    }

    pub fn len(&self) -> usize {
        self.visible_ids().len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    pub fn to_string(&self) -> String {
        self.visible_ids()
            .into_iter()
            .filter_map(|id| self.ops.iter().find(|op| op.id == id))
            .map(|op| op.ch)
            .collect()
    }

    fn visible_ids(&self) -> Vec<OpId> {
        let mut ids: Vec<OpId> = self.ops.iter().filter(|op| !op.deleted).map(|op| op.id.clone()).collect();
        ids.sort_by(|a, b| self.order_cmp(a, b));
        ids
    }

    fn order_cmp(&self, a: &OpId, b: &OpId) -> Ordering {
        let op_a = self.ops.iter().find(|op| &op.id == a).unwrap();
        let op_b = self.ops.iter().find(|op| &op.id == b).unwrap();
        match (&op_a.origin, &op_b.origin) {
            (None, None) => a.cmp(b),
            (None, Some(_)) => Ordering::Less,
            (Some(_), None) => Ordering::Greater,
            (Some(oa), Some(ob)) => {
                let ca = self.ancestor_chain(a);
                let cb = self.ancestor_chain(b);
                match Self::first_difference(&ca, &cb) {
                    Some((x, y)) => x.cmp(y),
                    None => {
                        let na = self.ops.iter().find(|op| &op.id == oa);
                        let nb = self.ops.iter().find(|op| &op.id == ob);
                        match (na, nb) {
                            (Some(na), Some(nb)) => na.ch.cmp(&nb.ch).then_with(|| a.cmp(b)),
                            _ => a.cmp(b),
                        }
                    }
                }
            }
        }
    }

    fn ancestor_chain(&self, id: &OpId) -> Vec<OpId> {
        let mut chain = Vec::new();
        let mut current = Some(id.clone());
        while let Some(cid) = current {
            if let Some(op) = self.ops.iter().find(|op| op.id == cid) {
                chain.push(cid);
                current = op.origin.clone();
            } else {
                break;
            }
        }
        chain.reverse();
        chain
    }

    fn first_difference<'a>(a: &'a [OpId], b: &'a [OpId]) -> Option<(&'a OpId, &'a OpId)> {
        let mut i = 0;
        while i < a.len() && i < b.len() {
            if a[i] != b[i] {
                return Some((&a[i], &b[i]));
            }
            i += 1;
        }
        if a.len() == b.len() { None } else { a.get(i).zip(b.get(i)) }
    }

    pub fn insert_local(&mut self, index: usize, ch: char) -> Result<TextOp, TextError> {
        let ids = self.visible_ids();
        if index > ids.len() {
            return Err(TextError::IndexOutOfBounds);
        }
        let origin = if index == 0 { None } else { Some(ids[index - 1].clone()) };
        let op = TextOp { id: self.next_id(), origin, ch, deleted: false };
        self.ops.push(op.clone());
        Ok(op)
    }

    pub fn delete_local(&mut self, index: usize) -> Result<TextOp, TextError> {
        let ids = self.visible_ids();
        let id = ids.get(index).ok_or(TextError::IndexOutOfBounds)?.clone();
        let op = self.ops.iter_mut().find(|op| op.id == id).unwrap();
        op.deleted = true;
        Ok(op.clone())
    }

    pub fn apply_remote(&mut self, op: TextOp) -> Result<(), TextError> {
        if self.ops.iter().any(|existing| existing.id == op.id) {
            return Ok(());
        }
        if let Some(origin) = &op.origin {
            if !self.ops.iter().any(|existing| &existing.id == origin) {
                return Err(TextError::MissingOrigin);
            }
        }
        self.counter = self.counter.max(op.id.counter + 1);
        self.ops.push(op);
        Ok(())
    }

    pub fn ops(&self) -> &[TextOp] {
        &self.ops
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TextError {
    #[error("index out of bounds")]
    IndexOutOfBounds,
    #[error("missing causal origin")]
    MissingOrigin,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn concurrent_inserts_converge() {
        let mut a = TextCrdt::new(Uuid::from_u128(1));
        let mut b = TextCrdt::new(Uuid::from_u128(2));
        let oa = a.insert_local(0, 'A').unwrap();
        let ob = b.insert_local(0, 'B').unwrap();
        a.apply_remote(ob.clone()).unwrap();
        b.apply_remote(oa.clone()).unwrap();
        assert_eq!(a.to_string(), b.to_string());
        assert_eq!(a.len(), 2);
    }

    #[test]
    fn delete_is_idempotent() {
        let mut a = TextCrdt::new(Uuid::from_u128(3));
        let op = a.insert_local(0, 'x').unwrap();
        let mut b = TextCrdt::new(Uuid::from_u128(4));
        b.apply_remote(op).unwrap();
        let del_a = a.delete_local(0).unwrap();
        b.apply_remote(del_a.clone()).unwrap();
        b.apply_remote(del_a).unwrap();
        assert!(a.is_empty());
        assert!(b.is_empty());
    }
}
