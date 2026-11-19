import { describe, expect, it } from 'vitest';
import { Document } from './document';
import { SyncManager } from './sync';

describe('SyncManager', () => {
  it('reports connection state and pending changes', async () => {
    const doc = new Document();
    const sync = new SyncManager(doc, { server: 'wss://sync.example.com' });
    const states: string[] = [];
    sync.on('status', (status) => states.push(status.state));

    await sync.connect();
    doc.insert(0, 'pending');
    expect(sync.getStatus()).toMatchObject({ state: 'online', transport: 'websocket', pendingChanges: 1 });

    sync.markSynced();
    expect(sync.getStatus().pendingChanges).toBe(0);
    expect(states).toContain('connecting');
    expect(states).toContain('online');

    sync.disconnect();
    expect(sync.getStatus().state).toBe('offline');
  });

  it('fails fast without a transport', async () => {
    const sync = new SyncManager(new Document());
    await expect(sync.connect()).rejects.toThrow('WebSocket server or WebRTC ICE');
  });
});
