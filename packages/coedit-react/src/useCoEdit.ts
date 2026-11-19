import { useMemo, useRef, useState } from 'react';
import { Document, SyncManager } from 'coedit';
import type { RemoteUser } from 'coedit';

export interface UseCoEditOptions {
  documentId: string;
  server?: string;
  iceServers?: string[];
}

export function useCoEdit(options: UseCoEditOptions) {
  const doc = useMemo(() => new Document({ documentId: options.documentId }), [options.documentId]);
  const sync = useMemo(() => new SyncManager(doc, { server: options.server, iceServers: options.iceServers }), [doc, options.server, options.iceServers]);
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);
  sync.on('presence', setUsers);
  return { doc, sync, users, ref };
}
