use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LwwValue<T> {
    pub value: T,
    pub timestamp: u64,
    pub replica: String,
}

#[derive(Debug, Clone, Default)]
pub struct MapCrdt<T> {
    values: BTreeMap<String, LwwValue<T>>,
}

impl<T: Clone> MapCrdt<T> {
    pub fn set(&mut self, key: impl Into<String>, value: T, timestamp: u64, replica: impl Into<String>) {
        let key = key.into();
        let replace = self
            .values
            .get(&key)
            .map(|current| (timestamp, replica.as_str()) > (current.timestamp, current.replica.as_str()))
            .unwrap_or(true);
        if replace {
            self.values.insert(key, LwwValue { value, timestamp, replica: replica.into() });
        }
    }

    pub fn get(&self, key: &str) -> Option<&T> {
        self.values.get(key).map(|v| &v.value)
    }
}
