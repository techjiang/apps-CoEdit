export type DocumentType = 'text' | 'richtext' | 'json';

export interface DocumentOptions {
  type?: DocumentType;
  encrypted?: boolean;
  documentId?: string;
}

export interface FormatAttributes {
  bold?: boolean;
  italic?: boolean;
  link?: string;
}

export interface RemoteUser {
  id: string;
  name: string;
  color: string;
  online: boolean;
  cursor?: number;
  selection?: [number, number];
}

export interface ChangeEvent {
  version: number;
  delta: { from: number; to: number };
}

export type Listener<T> = (payload: T) => void;
