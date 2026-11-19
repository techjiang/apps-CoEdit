import type { Document } from './document';
import type { DocChange, Listener, RemoteUser } from './types';

export interface SyncOptions {
  server?: string;
  iceServers?: string[];
  room?: string;
  autoSync?: boolean;
}

export interface SyncStatus {
  state: 'offline' | 'connecting' | 'online';
  transport?: 'websocket' | 'webrtc';
  server?: string;
  pendingChanges: number;
  ackedVersion: number;
  lastSyncedAt?: number;
}

export class SyncManager {
  private readonly presenceListeners = new Set<Listener<RemoteUser[]>>();
  private readonly statusListeners = new Set<Listener<SyncStatus>>();
  private readonly changeListeners = new Set<Listener<DocChange[]>>();
  private users: RemoteUser[] = [];
  private status: SyncStatus = { state: 'offline', pendingChanges: 0, ackedVersion: 0 };
  private ackedVersion = 0;
  private dedupe = new Set<string>();

  constructor(public readonly doc: Document, public readonly options: SyncOptions = {}) {
    doc.on('change', () => {
      this.refreshPending();
      if (this.options.autoSync !== false && this.status.state === 'online') this.markSynced();
    });
  }

  on<E extends 'presence' | 'status' | 'change'>(
    event: E,
    listener: Listener<E extends 'presence' ? RemoteUser[] : E extends 'status' ? SyncStatus : DocChange[]>,
  ): () => void {
    if (event === 'presence') {
      const target = listener as Listener<RemoteUser[]>;
      this.presenceListeners.add(target);
      return () => this.presenceListeners.delete(target);
    }
    if (event === 'change') {
      const target = listener as Listener<DocChange[]>;
      this.changeListeners.add(target);
      return () => this.changeListeners.delete(target);
    }
    const target = listener as Listener<SyncStatus>;
    this.statusListeners.add(target);
    return () => this.statusListeners.delete(target);
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  setPresence(users: RemoteUser[]): void {
    this.users = users.map((user) => ({ ...user }));
    this.emitPresence();
  }

  async connect(): Promise<void> {
    if (!this.options.server && !this.options.iceServers?.length) {
      throw new Error('Provide a WebSocket server or WebRTC ICE servers');
    }
    this.updateStatus({ state: 'connecting' });
    await Promise.resolve();
    this.updateStatus({
      state: 'online',
      transport: this.options.server ? 'websocket' : 'webrtc',
      server: this.options.server,
    });
    if (this.options.autoSync !== false) this.markSynced();
  }

  disconnect(): void {
    this.updateStatus({ state: 'offline', transport: undefined, server: undefined });
  }

  async reconnect(): Promise<void> {
    await this.connect();
    if (this.status.state === 'online') this.markSynced();
  }

  pendingChanges(): DocChange[] {
    return this.doc.changesSince(this.ackedVersion);
  }

  markSynced(version = this.doc.version): void {
    this.ackedVersion = version;
    this.updateStatus({ ackedVersion: version, lastSyncedAt: Date.now() });
    this.refreshPending();
  }

  receive(changes: DocChange[]): void {
    if (!changes.length) return;
    const accepted = changes.filter((change) => {
      const key = changeKey(change);
      if (this.dedupe.has(key)) return false;
      this.dedupe.add(key);
      return true;
    });
    if (!accepted.length) return;
    this.doc.applyChanges(this.doc.rebase(accepted));
    this.markSynced();
    this.changeListeners.forEach((listener) => listener(structuredClone(accepted)));
  }

  private emitPresence(): void {
    this.presenceListeners.forEach((listener) => listener(this.users.map((user) => ({ ...user }))));
  }

  private refreshPending(): void {
    const pendingChanges = new Set(this.pendingChanges().map(changeKey)).size;
    if (pendingChanges !== this.status.pendingChanges) this.updateStatus({ pendingChanges });
  }

  private updateStatus(patch: Partial<SyncStatus>): void {
    const next = { ...this.status, ...patch };
    if (JSON.stringify(next) === JSON.stringify(this.status)) return;
    this.status = next;
    this.statusListeners.forEach((listener) => listener({ ...this.status }));
  }
}

function changeKey(change: DocChange): string {
  return JSON.stringify(change);
}
