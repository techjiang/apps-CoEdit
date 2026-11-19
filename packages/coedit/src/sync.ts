import type { Document } from './document';
import type { DocChange, Listener, RemoteUser } from './types';

export interface SyncOptions {
  server?: string;
  iceServers?: string[];
  room?: string;
}

export interface SyncStatus {
  state: 'offline' | 'connecting' | 'online';
  transport?: 'websocket' | 'webrtc';
  server?: string;
  pendingChanges: number;
}

export class SyncManager {
  private readonly presenceListeners = new Set<Listener<RemoteUser[]>>();
  private readonly statusListeners = new Set<Listener<SyncStatus>>();
  private users: RemoteUser[] = [];
  private status: SyncStatus = { state: 'offline', pendingChanges: 0 };

  constructor(public readonly doc: Document, public readonly options: SyncOptions = {}) {
    doc.on('change', () => this.refreshPending());
  }

  on<E extends 'presence' | 'status'>(event: E, listener: Listener<E extends 'presence' ? RemoteUser[] : SyncStatus>): () => void {
    if (event === 'presence') {
      this.presenceListeners.add(listener as Listener<RemoteUser[]>);
      return () => this.presenceListeners.delete(listener as Listener<RemoteUser[]>);
    }
    this.statusListeners.add(listener as Listener<SyncStatus>);
    return () => this.statusListeners.delete(listener as Listener<SyncStatus>);
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  setPresence(users: RemoteUser[]): void {
    this.users = users.map((user) => ({ ...user }));
    this.presenceListeners.forEach((listener) => listener(this.users.map((user) => ({ ...user }))));
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
  }

  disconnect(): void {
    this.updateStatus({ state: 'offline', transport: undefined, server: undefined });
  }

  pendingChanges(): DocChange[] {
    return this.doc.changesSince(this.ackedVersion);
  }

  markSynced(version = this.doc.version): void {
    this.ackedVersion = version;
    this.refreshPending();
  }

  private ackedVersion = 0;

  private refreshPending(): void {
    const pendingChanges = this.pendingChanges().length;
    if (pendingChanges !== this.status.pendingChanges) this.updateStatus({ pendingChanges });
  }

  private updateStatus(patch: Partial<SyncStatus>): void {
    const next = { ...this.status, ...patch };
    if (JSON.stringify(next) === JSON.stringify(this.status)) return;
    this.status = next;
    this.statusListeners.forEach((listener) => listener({ ...this.status }));
  }
}
