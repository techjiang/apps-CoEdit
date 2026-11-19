export interface PersistedDocument {
  documentId: string;
  version: number;
  content: string;
  changes: unknown[];
}

export interface DocumentStorage {
  load(documentId: string): PersistedDocument | undefined;
  save(snapshot: PersistedDocument): void;
  remove(documentId: string): void;
}
