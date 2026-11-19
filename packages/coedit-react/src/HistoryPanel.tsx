export interface HistoryEntry {
  version: number;
  label: string;
}

export function HistoryPanel({ entries, onRestore }: { entries: HistoryEntry[]; onRestore: (version: number) => void }) {
  return (
    <ol data-testid="coedit-history">
      {entries.map((entry) => (
        <li key={entry.version}>
          <button onClick={() => onRestore(entry.version)}>{entry.label}</button>
        </li>
      ))}
    </ol>
  );
}
