import type { Document } from './document';
import type { Listener, RemoteUser } from './types';

export interface SyncOptions {
  server?: string;
  iceServers?: string[];
}

export class SyncManager {
  private readonly presenceListeners = new Set<Listener<RemoteUser[]>>();
  private users: RemoteUser[] = [];

  constructor(public readonly doc: Document, public readonly options: SyncOptions = {}) {}

  on(event: 'presence', listener: Listener<RemoteUser[]>): () => void {
    if (event !== 'presence') return () => undefined;
    this.presenceListeners.add(listener);
    return () => this.presenceListeners.delete(listener);
  }

  setPresence(users: RemoteUser[]): void {
    this.users = users;
    this.presenceListeners.forEach((listener) => listener(this.users));
  }

  async connect(): Promise<void> {
    if (!this.options.server && !this.options.iceServers?.length) {
      throw new Error('Provide a WebSocket server or WebRTC ICE servers');
    }
  }
}
