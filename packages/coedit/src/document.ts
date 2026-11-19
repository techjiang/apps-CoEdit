import type {
  ChangeEvent,
  DocChange,
  DocumentOptions,
  FormatAttributes,
  FormatMark,
  HistoryEntry,
  Listener,
} from './types';

interface StoredMark {
  id: string;
  from: number;
  to: number;
  attrs: FormatAttributes;
  anchorBefore: string;
  anchorAfter: string;
}

const EMPTY_ATTRS: FormatAttributes = {};

export class Document {
  readonly options: Required<Pick<DocumentOptions, 'type' | 'encrypted'>> & DocumentOptions;
  private text = '';
  private marks: StoredMark[] = [];
  private stored: DocChange[][] = [[]];
  private entries: HistoryEntry[] = [];
  private readonly listeners = new Set<Listener<ChangeEvent>>();
  private markSeq = 0;

  constructor(options: DocumentOptions = {}) {
    this.options = { type: 'text', encrypted: false, ...options };
    this.entries.push(this.snapshot(0));
  }

  get length(): number {
    return this.text.length;
  }

  get version(): number {
    return this.stored.length - 1;
  }

  toString(): string {
    return this.text;
  }

  formatMarks(): FormatMark[] {
    return this.marks.map(({ from, to, attrs }) => ({ from, to, attrs: { ...attrs } }));
  }

  insert(index: number, text: string): void {
    this.assertRange(index, this.text.length);
    if (!text) return;
    const change = { type: 'insert' as const, index, text };
    this.text = this.text.slice(0, index) + text + this.text.slice(index);
    this.applyPositionChange(change);
    this.commit([change]);
  }

  delete(index: number, len: number): void {
    this.assertRange(index, this.text.length);
    if (len <= 0) return;
    const bounded = Math.min(len, this.text.length - index);
    const change = { type: 'delete' as const, index, len: bounded };
    this.text = this.text.slice(0, index) + this.text.slice(index + bounded);
    this.applyPositionChange(change);
    this.commit([change]);
  }

  format(from: number, to: number, attrs: FormatAttributes): void {
    this.assertRange(from, this.text.length);
    this.assertRange(to, this.text.length);
    if (to <= from || Object.keys(attrs).length === 0) return;
    const change = { type: 'format' as const, from, to, attrs: { ...attrs } };
    const id = `mark-${this.version}-${this.markSeq++}`;
    this.marks.push({
      id,
      from,
      to,
      attrs: change.attrs,
      anchorBefore: this.text.slice(Math.max(0, from - 4), from),
      anchorAfter: this.text.slice(to, to + 4),
    });
    this.commit([change]);
  }

  history() {
    return {
      entries: () => this.entries.map((entry) => this.cloneEntry(entry)),
      get: (version: number) => {
        const entry = this.entries.find((item) => item.version === version);
        return entry ? this.cloneEntry(entry) : undefined;
      },
      restore: (version: number) => this.restore(version),
    };
  }

  restore(version: number): void {
    const entry = this.entries.find((item) => item.version === version);
    if (!entry) throw new RangeError(`version ${version} not found`);
    this.replay(entry.version);
  }

  changesSince(version: number): DocChange[] {
    return this.stored.slice(version + 1).flat();
  }

  applyChanges(changes: DocChange[], targetVersion = this.version + changes.length): void {
    if (!changes.length) return;
    const firstVersion = this.version + 1;
    const committed: DocChange[] = [];
    for (const change of changes) {
      const bucket = { ...structuredClone(change) };
      committed.push(bucket);
      this.applyLocalChange(bucket);
    }
    const bucketVersion = Math.max(firstVersion, targetVersion);
    this.stored[bucketVersion] = committed;
    for (let version = firstVersion; version < bucketVersion; version += 1) {
      this.stored[version] = [];
    }
    this.entries[bucketVersion] = this.snapshot(bucketVersion);
    this.emit(committed);
  }

  on(event: 'change', listener: Listener<ChangeEvent>): () => void {
    if (event !== 'change') return () => undefined;
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private applyLocalChange(change: DocChange): void {
    if (change.type === 'insert') {
      this.text = this.text.slice(0, change.index) + change.text + this.text.slice(change.index);
      this.applyPositionChange(change);
    } else if (change.type === 'delete') {
      this.text = this.text.slice(0, change.index) + this.text.slice(change.index + change.len);
      this.applyPositionChange(change);
    } else {
      this.marks.push({
        id: `remote-${this.version}-${this.markSeq++}`,
        from: change.from,
        to: change.to,
        attrs: { ...change.attrs },
        anchorBefore: this.text.slice(Math.max(0, change.from - 4), change.from),
        anchorAfter: this.text.slice(change.to, change.to + 4),
      });
    }
  }

  private applyPositionChange(change: Extract<DocChange, { type: 'insert' | 'delete' }>): void {
    for (const mark of this.marks) {
      if (change.type === 'insert') {
        mark.from = advance(mark.from, change, this.text.length);
        mark.to = advance(mark.to, change, this.text.length);
      } else {
        mark.from = retreat(mark.from, change);
        mark.to = retreat(mark.to, change);
      }
    }
    this.marks = this.marks
      .filter((mark) => mark.to > mark.from)
      .map((mark) => this.reseat(mark));
  }

  private reseat(mark: StoredMark): StoredMark {
    const before = this.text.lastIndexOf(mark.anchorBefore, Math.max(0, mark.from));
    if (mark.anchorBefore && before >= 0) {
      const next = before + mark.anchorBefore.length;
      const shift = next - mark.from;
      return { ...mark, from: next, to: mark.to + shift };
    }
    const after = mark.anchorAfter ? this.text.indexOf(mark.anchorAfter, mark.to) : -1;
    if (after >= 0) {
      const shift = after - mark.to;
      return { ...mark, from: mark.from + shift, to: after };
    }
    return mark;
  }

  private commit(changes: DocChange[]): void {
    const version = this.version + 1;
    this.stored[version] = changes;
    this.entries[version] = this.snapshot(version);
    this.emit(changes);
  }

  private replay(target: number): void {
    this.text = '';
    this.marks = [];
    this.markSeq = 0;
    for (let version = 1; version <= target; version += 1) {
      for (const change of this.stored[version] ?? []) this.applyLocalChange(change);
    }
    const entry = this.entries[target];
    this.text = entry.content;
    this.marks = entry.marks.map((mark, index) => ({
      ...mark,
      id: `restored-${target}-${index}`,
      attrs: { ...mark.attrs },
      anchorBefore: this.text.slice(Math.max(0, mark.from - 4), mark.from),
      anchorAfter: this.text.slice(mark.to, mark.to + 4),
    }));
  }

  private snapshot(version: number): HistoryEntry {
    return {
      version,
      content: this.text,
      marks: this.marks.map(({ from, to, attrs }) => ({ from, to, attrs: { ...attrs } })),
      createdAt: Date.now(),
    };
  }

  private cloneEntry(entry: HistoryEntry): HistoryEntry {
    return {
      ...entry,
      marks: entry.marks.map((mark) => ({ ...mark, attrs: { ...mark.attrs } })),
    };
  }

  private emit(delta: DocChange[]): void {
    const event: ChangeEvent = { version: this.version, delta: structuredClone(delta) };
    this.listeners.forEach((listener) => listener(event));
  }

  private assertRange(index: number, max: number): void {
    if (index < 0 || index > max) throw new RangeError(`index ${index} out of bounds`);
  }
}

function advance(position: number, change: Extract<DocChange, { type: 'insert' | 'delete' }>, length: number): number {
  if (change.type === 'insert') {
    return position >= change.index ? Math.min(length, position + change.text.length) : position;
  }
  if (position <= change.index) return position;
  return Math.max(change.index, position - change.len);
}

function retreat(position: number, change: Extract<DocChange, { type: 'delete' }>): number {
  if (position <= change.index) return position;
  if (position >= change.index + change.len) return position - change.len;
  return change.index;
}

export const NO_ATTRS = EMPTY_ATTRS;
