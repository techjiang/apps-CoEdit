use std::collections::HashMap;

#[derive(Debug, Default)]
pub struct RoomRegistry {
    rooms: HashMap<String, Vec<String>>,
}

impl RoomRegistry {
    pub fn join(&mut self, room: impl Into<String>, peer: impl Into<String>) {
        self.rooms.entry(room.into()).or_default().push(peer.into());
    }

    pub fn peers(&self, room: &str) -> &[String] {
        self.rooms.get(room).map(|v| v.as_slice()).unwrap_or_default()
    }
}
