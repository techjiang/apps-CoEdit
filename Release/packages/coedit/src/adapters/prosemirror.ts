import type { EditorAdapter } from './base';
import type { Document } from '../document';

export const prosemirrorAdapter: EditorAdapter = {
  bind(doc: Document) {
    return doc.on('change', () => undefined);
  },
};
