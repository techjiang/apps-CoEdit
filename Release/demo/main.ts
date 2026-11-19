import { Document, MemoryStorage, SyncManager, assignColor } from 'coedit';
import type { RemoteUser } from 'coedit';

const storage = new MemoryStorage();
const doc = new Document({ type: 'richtext', encrypted: true, documentId: 'roadmap-demo', storage });
const sync = new SyncManager(doc, { server: 'wss://sync.example.com', room: 'demo', autoSync: false });
const editor = document.querySelector<HTMLDivElement>('#editor')!;
const historyList = document.querySelector<HTMLOListElement>('#history')!;
const eventsList = document.querySelector<HTMLUListElement>('#events')!;
const marksBox = document.querySelector<HTMLDivElement>('#marks')!;
const presenceBox = document.querySelector<HTMLDivElement>('#presence')!;

const users: RemoteUser[] = [
  { id: 'u1', name: 'Lin', color: assignColor('Lin'), online: true, cursor: 12 },
  { id: 'u2', name: 'Tang', color: assignColor('Tang'), online: true, cursor: 38 },
  { id: 'u3', name: 'Mei', color: assignColor('Mei'), online: false },
];

let applyingRemote = false;
let lastText = '';
let dedupedCount = 0;

function escapeHtml(value: string): string {
  return value.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]!);
}

function renderEditor(): void {
  if (applyingRemote) return;
  if (doc.toString() !== lastText) {
    editor.textContent = doc.toString();
    lastText = doc.toString();
  }
  const marks = doc.formatMarks();
  if (!marks.length) {
    marksBox.textContent = '暂无格式标记';
    return;
  }
  marksBox.innerHTML = marks
    .map((mark) => {
      const label = Object.keys(mark.attrs).join(' + ') || 'plain';
      return `<span class="mark-chip">${label} · ${mark.from}–${mark.to}</span>`;
    })
    .join('');
}

function renderHistory(): void {
  const entries = doc.history().entries();
  historyList.innerHTML = entries
    .map((entry) => {
      const preview = entry.content.length > 22 ? `${entry.content.slice(0, 22)}…` : entry.content || '空文档';
      const current = entry.version === doc.version ? ' current' : '';
      return `<li><button data-version="${entry.version}" class="${current}">
        <span>v${entry.version} · ${escapeHtml(preview)}</span><span>${entry.marks.length} 格式</span>
      </button></li>`;
    })
    .reverse()
    .join('');
}

function log(message: string): void {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  eventsList.insertAdjacentHTML('afterbegin', `<li class="new"><time>${time}</time>${escapeHtml(message)}</li>`);
  const first = eventsList.firstElementChild;
  if (first) window.setTimeout(() => first.classList.remove('new'), 320);
  while (eventsList.children.length > 7) eventsList.lastElementChild?.remove();
}

function renderSync(): void {
  const status = sync.getStatus();
  const state = document.querySelector<HTMLSpanElement>('#sync-state')!;
  state.textContent = status.state === 'online' ? '已连接 · WebSocket' : '离线 · 本地优先';
  state.className = `pill ${status.state === 'online' ? 'pill-online' : 'pill-warn'}`;
  document.querySelector('#pending')!.textContent = `${status.pendingChanges} 项待同步`;
  document.querySelector('#version')!.textContent = `v${doc.version}`;
  document.querySelector('#metric-version')!.textContent = String(doc.version);
  document.querySelector('#metric-history')!.textContent = String(doc.history().entries().length);
  document.querySelector('#metric-pending')!.textContent = String(status.pendingChanges);
  document.querySelector('#dedupe-state')!.textContent = `去重 ${dedupedCount} 项`;
  const storageState = document.querySelector<HTMLSpanElement>('#storage-state')!;
  const saved = storage.load(doc.documentId ?? 'roadmap-demo');
  storageState.textContent = saved ? `已持久化 · v${saved.version}` : '未持久化';
  storageState.className = `pill ${saved ? 'pill-online' : ''}`;
  presenceBox.innerHTML = users
    .map((user) => `<span class="avatar" title="${user.name} · ${user.online ? '在线' : '离线'}" style="background:${user.color}">${user.name[0]}</span>`)
    .join('');
}

editor.addEventListener('input', () => {
  applyingRemote = true;
  const next = editor.textContent ?? '';
  const common = [...lastText].findIndex((char, index) => char !== next[index]);
  if (common >= 0) {
    let end = 0;
    while (end < lastText.length - common && end < next.length - common && lastText[common + end] === next[common + end]) end += 1;
    if (lastText.length - common - end > 0) doc.delete(common, lastText.length - common - end);
    if (next.length - common - end > 0) doc.insert(common, next.slice(common, common + next.length - common - end));
  } else if (next.length > lastText.length) {
    doc.insert(lastText.length, next.slice(lastText.length));
  }
  lastText = next;
  applyingRemote = false;
});

function applyFormat(type: 'bold' | 'italic' | 'heading'): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    doc.format(0, Math.min(6, doc.length), { [type]: true });
    return;
  }
  const range = selection.getRangeAt(0);
  const from = range.toString().length ? range.toString().length : Math.min(6, doc.length);
  const start = doc.length ? 0 : 0;
  doc.format(start, from, { [type]: true });
}

document.querySelector('#btn-bold')!.addEventListener('click', () => applyFormat('bold'));
document.querySelector('#btn-italic')!.addEventListener('click', () => applyFormat('italic'));
document.querySelector('#btn-heading')!.addEventListener('click', () => applyFormat('heading'));

async function connectSync(): Promise<void> {
  await sync.connect();
  sync.setPresence(users.filter((user) => user.online));
  sync.markSynced();
  log('已连接 wss://sync.example.com，在线成员 2 人');
  renderSync();
}

async function reconnectSync(): Promise<void> {
  await sync.reconnect();
  sync.setPresence(users.filter((user) => user.online));
  log('重连完成，离线队列已一次性确认');
  renderSync();
}

function simulateRemoteChange(): void {
  const change = { type: 'insert' as const, index: doc.length, text: doc.length ? ' [远端已合并]' : '远端变更已合并' };
  sync.receive([change]);
  const before = doc.length;
  sync.receive([change]);
  if (doc.length === before) dedupedCount += 1;
  editor.textContent = doc.toString();
  lastText = doc.toString();
  log('远端增量已合并，重复消息已幂等丢弃');
  renderEditor();
  renderHistory();
  renderSync();
}

function resetDemo(): void {
  doc.restore(0);
  sync.disconnect();
  sync.markSynced(0);
  dedupedCount = 0;
  eventsList.innerHTML = '';
  editor.textContent = doc.toString();
  lastText = doc.toString();
  log('演示状态已重置');
  renderEditor();
  renderHistory();
  renderSync();
}

function simulateOffline(): void {
  doc.insert(doc.length, doc.length ? ' [离线编辑]' : '离线编辑仍可继续');
  editor.textContent = doc.toString();
  lastText = doc.toString();
  sync.disconnect();
  log('模拟断网：本地 CRDT 继续记录操作');
  renderEditor();
  renderHistory();
  renderSync();
}

for (const selector of ['#btn-connect', '#btn-hero-connect']) {
  document.querySelector(selector)!.addEventListener('click', () => void connectSync());
}
for (const selector of ['#btn-offline', '#btn-hero-offline']) {
  document.querySelector(selector)!.addEventListener('click', simulateOffline);
}
for (const selector of ['#btn-remote', '#btn-hero-remote']) {
  document.querySelector(selector)!.addEventListener('click', simulateRemoteChange);
}
for (const selector of ['#btn-reset', '#btn-hero-reset']) {
  document.querySelector(selector)!.addEventListener('click', resetDemo);
}
document.querySelector('#btn-sync')?.addEventListener('click', () => void reconnectSync());

document.querySelector('#btn-clear-events')!.addEventListener('click', () => {
  eventsList.innerHTML = '';
  log('同步事件已清空');
});

historyList.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-version]');
  if (!button) return;
  const version = Number(button.dataset.version);
  doc.history().restore(version);
  editor.textContent = doc.toString();
  lastText = doc.toString();
  log(`已恢复到 v${version}`);
  renderEditor();
  renderHistory();
  renderSync();
});

doc.on('change', () => {
  renderEditor();
  renderHistory();
  renderSync();
});
sync.on('status', renderSync);
sync.on('presence', renderSync);

doc.insert(0, '# CoEdit 开发路线图\n\nM1 CRDT 核心引擎已完成：文本操作、富文本标记、增量同步与历史快照。\nM2 正在推进：WebSocket 协议、端到端加密与浏览器持久化。');
doc.format(0, 13, { heading: 1 });
doc.format(22, 31, { bold: true });
editor.textContent = doc.toString();
lastText = doc.toString();
sync.setPresence(users);
renderEditor();
renderHistory();
renderSync();
log('演示文档已加载，CRDT 引擎就绪');
