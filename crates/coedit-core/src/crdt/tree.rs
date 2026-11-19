use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TreeNode {
    pub id: String,
    pub parent: Option<String>,
    pub deleted: bool,
}

#[derive(Debug, Clone, Default)]
pub struct TreeCrdt {
    nodes: BTreeMap<String, TreeNode>,
    tombstones: BTreeSet<String>,
}

impl TreeCrdt {
    pub fn upsert(&mut self, node: TreeNode) {
        if let Some(parent) = &node.parent {
            if self.tombstones.contains(parent) {
                return;
            }
        }
        if node.deleted {
            self.tombstones.insert(node.id.clone());
        }
        self.nodes.insert(node.id.clone(), node);
    }

    pub fn children(&self, parent: Option<&str>) -> Vec<&TreeNode> {
        self.nodes
            .values()
            .filter(|node| node.parent.as_deref() == parent && !self.tombstones.contains(&node.id))
            .collect()
    }

    pub fn get(&self, id: &str) -> Option<&TreeNode> {
        self.nodes.get(id).filter(|_| !self.tombstones.contains(id))
    }
}
