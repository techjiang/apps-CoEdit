import type { DocumentStorage, PersistedDocument } from './traits';

export class MemoryStorage implements DocumentStorage {
  private readonly snapshots = new Map<string, PersistedDocument>();

  load(documentId: string): PersistedDocument | undefined {
    const snapshot = this.snapshots.get(documentId);
    return snapshot ? structuredClone(snapshot) : undefined;
  }

  save(snapshot: PersistedDocument): void {
    this.snapshots.set(snapshot.documentId, structuredClone(snapshot));
  }

  remove(documentId: string): void {
    this.snapshots.delete(documentId);
  }
}
