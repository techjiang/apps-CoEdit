import type { Document } from '../document';

export interface EditorAdapter {
  bind(doc: Document): () => void;
}

export function textFromChange(change: { from: number; to: number; text: string }): { index: number; text: string } {
  return { index: change.from, text: change.text };
}
