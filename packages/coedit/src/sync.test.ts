import { describe, expect, it } from 'vitest';
import { Document } from './document';
import { MemoryStorage } from './storage';
import { SyncManager } from './sync';

describe('SyncManager', () => {
  it('reports connection state and pending changes', async () => {
    const doc = new Document();
    const sync = new SyncManager(doc, { server: 'wss://sync.example.com', autoSync: false });
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

  it('auto-confirms changes while online', async () => {
    const sync = new SyncManager(new Document(), { server: 'wss://sync.example.com' });
    await sync.connect();
    sync.doc.insert(0, 'synced');
    expect(sync.getStatus().pendingChanges).toBe(0);
    expect(sync.getStatus().ackedVersion).toBe(1);
  });

  it('queues offline edits and replays them on reconnect', async () => {
    const sync = new SyncManager(new Document(), { server: 'wss://sync.example.com', autoSync: false });
    sync.doc.insert(0, 'offline');
    expect(sync.getStatus().pendingChanges).toBe(1);
    await sync.connect();
    sync.markSynced();
    expect(sync.getStatus().pendingChanges).toBe(0);
    expect(sync.getStatus().ackedVersion).toBe(1);
  });

  it('applies remote changes and emits them', () => {
    const sync = new SyncManager(new Document(), { autoSync: false });
    const received: unknown[] = [];
    sync.on('change', (changes) => received.push(changes));
    sync.receive([{ type: 'insert', index: 0, text: 'from peer' }]);
    expect(sync.doc.toString()).toBe('from peer');
    expect(received).toHaveLength(1);
    expect(sync.getStatus().pendingChanges).toBe(0);
  });

  it('reconnects and clears pending changes in one step', async () => {
    const sync = new SyncManager(new Document(), { server: 'wss://sync.example.com', autoSync: false });
    sync.doc.insert(0, 'queued');
    await sync.reconnect();
    expect(sync.getStatus()).toMatchObject({ state: 'online', pendingChanges: 0, ackedVersion: 1 });
  });

  it('dedupes repeated remote changes', () => {
    const sync = new SyncManager(new Document(), { autoSync: false });
    const remote = [{ type: 'insert' as const, index: 0, text: 'once' }];
    sync.receive(remote);
    sync.receive(remote);
    expect(sync.doc.toString()).toBe('once');
    expect(sync.getStatus().ackedVersion).toBe(1);
  });

  it('restores a document from memory storage', () => {
    const storage = new MemoryStorage();
    const first = new Document({ type: 'text', documentId: 'note', storage });
    first.insert(0, 'saved');
    const second = new Document({ type: 'text', documentId: 'note', storage });
    expect(second.toString()).toBe('saved');
    expect(second.version).toBe(first.version);
  });

  it('keeps a full replayable change log', () => {
    const doc = new Document();
    doc.insert(0, 'ab');
    doc.format(0, 2, { bold: true });
    const clone = new Document();
    clone.applyChanges(doc.changeLog, doc.version);
    expect(clone.toString()).toBe(doc.toString());
    expect(clone.formatMarks()).toEqual(doc.formatMarks());
  });
});
