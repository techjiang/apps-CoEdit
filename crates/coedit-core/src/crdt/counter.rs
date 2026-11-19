use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CounterCrdt {
    increments: BTreeMap<String, i64>,
}

impl CounterCrdt {
    pub fn increment(&mut self, replica: &str, amount: i64) {
        *self.increments.entry(replica.to_string()).or_default() += amount;
    }

    pub fn merge(&mut self, other: &CounterCrdt) {
        for (replica, amount) in &other.increments {
            let entry = self.increments.entry(replica.clone()).or_default();
            *entry = (*entry).max(*amount);
        }
    }

    pub fn value(&self) -> i64 {
        self.increments.values().sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn concurrent_increments_merge_once() {
        let mut a = CounterCrdt::default();
        let mut b = CounterCrdt::default();
        a.increment("a", 2);
        b.increment("b", 3);
        a.merge(&b);
        b.merge(&a);
        assert_eq!(a.value(), 5);
        assert_eq!(b.value(), 5);
    }
}
