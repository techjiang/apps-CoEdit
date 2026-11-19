use super::text::{OpId, TextCrdt, TextOp};

#[derive(Debug, Clone, Default)]
pub struct ListCrdt {
    inner: TextCrdt,
}

impl ListCrdt {
    pub fn insert_local(&mut self, index: usize, value: char) -> Result<TextOp, super::text::TextError> {
        self.inner.insert_local(index, value)
    }

    pub fn apply_remote(&mut self, op: TextOp) -> Result<(), super::text::TextError> {
        self.inner.apply_remote(op)
    }

    pub fn values(&self) -> Vec<char> {
        self.inner.to_string().chars().collect()
    }

    pub fn site(&self) -> OpId {
        OpId::new(0, self.inner.replica)
    }
}
