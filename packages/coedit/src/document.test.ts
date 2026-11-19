import { describe, expect, it } from 'vitest';
import { Document } from './document';

describe('Document', () => {
  it('mutates text and emits changes', () => {
    const doc = new Document({ type: 'richtext' });
    const versions: number[] = [];
    doc.on('change', (event) => versions.push(event.version));
    doc.insert(0, 'Hello');
    doc.format(0, 5, { bold: true });
    doc.delete(0, 1);
    expect(doc.toString()).toBe('ello');
    expect(versions).toEqual([1, 2, 3]);
  });

  it('restores exact content and format marks', () => {
    const doc = new Document({ type: 'richtext' });
    doc.insert(0, 'Hello CoEdit');
    doc.format(6, 12, { bold: true });
    const markedVersion = doc.version;
    doc.insert(0, '>> ');
    expect(doc.toString()).toBe('>> Hello CoEdit');
    expect(doc.formatMarks()[0]).toMatchObject({ from: 9, to: 15, attrs: { bold: true } });

    doc.history().restore(markedVersion);
    expect(doc.toString()).toBe('Hello CoEdit');
    expect(doc.formatMarks()[0]).toMatchObject({ from: 6, to: 12, attrs: { bold: true } });
  });

  it('replays incremental changes to another document', () => {
    const source = new Document();
    source.insert(0, 'offline first');
    source.delete(8, 6);
    source.insert(8, 'ready');

    const target = new Document();
    target.applyChanges(source.changesSince(0), source.version);
    expect(target.toString()).toBe(source.toString());
    expect(target.version).toBe(source.version);
  });

  it('rejects invalid ranges', () => {
    const doc = new Document();
    expect(() => doc.insert(2, 'x')).toThrow(RangeError);
    expect(() => doc.delete(0, 99)).not.toThrow();
    expect(doc.toString()).toBe('');
  });
});
