export type DocumentType = 'text' | 'richtext' | 'json';

export interface DocumentOptions {
  type?: DocumentType;
  encrypted?: boolean;
  documentId?: string;
}

export interface FormatAttributes {
  bold?: boolean;
  italic?: boolean;
  heading?: number;
  link?: string;
}

export interface FormatMark {
  from: number;
  to: number;
  attrs: FormatAttributes;
}

export interface RemoteUser {
  id: string;
  name: string;
  color: string;
  online: boolean;
  cursor?: number;
  selection?: [number, number];
}

export interface TextChange {
  type: 'insert';
  index: number;
  text: string;
}

export interface DeleteChange {
  type: 'delete';
  index: number;
  len: number;
}

export interface FormatChange {
  type: 'format';
  from: number;
  to: number;
  attrs: FormatAttributes;
}

export type DocChange = TextChange | DeleteChange | FormatChange;

export interface ChangeEvent {
  version: number;
  delta: DocChange[];
}

export interface HistoryEntry {
  version: number;
  content: string;
  marks: FormatMark[];
  createdAt: number;
}

export type Listener<T> = (payload: T) => void;
