import { describe, expect, it } from 'vitest';
import { Document } from './document';

describe('Document', () => {
  it('mutates text and emits changes', () => {
    const doc = new Document({ type: 'richtext' });
    let versions: number[] = [];
    doc.on('change', (event) => versions.push(event.version));
    doc.insert(0, 'Hello');
    doc.format(0, 5, { bold: true });
    doc.delete(0, 1);
    expect(doc.toString()).toBe('ello');
    expect(versions).toEqual([1, 2, 3]);
  });
});
