import type { ChangeEvent, DocumentOptions, FormatAttributes, Listener } from './types';

export class Document {
  readonly options: Required<Pick<DocumentOptions, 'type' | 'encrypted'>> & DocumentOptions;
  private text = '';
  private currentVersion = 0;
  private readonly listeners = new Set<Listener<ChangeEvent>>();

  constructor(options: DocumentOptions = {}) {
    this.options = { type: 'text', encrypted: false, ...options };
  }

  get length(): number {
    return this.text.length;
  }

  get version(): number {
    return this.currentVersion;
  }

  toString(): string {
    return this.text;
  }

  insert(index: number, text: string): void {
    this.assertRange(index, this.text.length);
    this.text = this.text.slice(0, index) + text + this.text.slice(index);
    this.emit();
  }

  delete(index: number, len: number): void {
    this.assertRange(index, this.text.length);
    this.text = this.text.slice(0, index) + this.text.slice(index + len);
    this.emit();
  }

  format(_from: number, _to: number, _attrs: FormatAttributes): void {
    this.emit();
  }

  history() {
    return {
      get: (version: number) => ({ version, content: this.text }),
      restore: (_version: number) => this.emit(),
    };
  }

  on(event: 'change', listener: Listener<ChangeEvent>): () => void {
    if (event !== 'change') return () => undefined;
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.currentVersion += 1;
    const event: ChangeEvent = { version: this.currentVersion, delta: { from: this.currentVersion - 1, to: this.currentVersion } };
    this.listeners.forEach((listener) => listener(event));
  }

  private assertRange(index: number, max: number): void {
    if (index < 0 || index > max) throw new RangeError(`index ${index} out of bounds`);
  }
}
