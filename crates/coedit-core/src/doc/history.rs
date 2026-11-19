use super::snapshot::Snapshot;

#[derive(Debug, Clone, Default)]
pub struct History {
    snapshots: Vec<Snapshot>,
}

impl History {
    pub fn push(&mut self, snapshot: Snapshot) {
        self.snapshots.push(snapshot);
    }

    pub fn get(&self, version: u64) -> Option<&Snapshot> {
        self.snapshots.iter().find(|snapshot| snapshot.version == version)
    }

    pub fn latest(&self) -> Option<&Snapshot> {
        self.snapshots.last()
    }

    pub fn versions(&self) -> impl Iterator<Item = u64> + '_ {
        self.snapshots.iter().map(|snapshot| snapshot.version)
    }
}
