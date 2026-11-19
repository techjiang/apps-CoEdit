import type { RemoteUser } from './types';

export function assignColor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return `hsl(${hash} 70% 55%)`;
}

export function anonymize(users: RemoteUser[]): RemoteUser[] {
  return users.map((user) => ({ ...user, name: user.name.slice(0, 1) + '***' }));
}
