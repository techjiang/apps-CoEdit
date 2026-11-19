import type { RemoteUser } from 'coedit';

export function CursorOverlay({ users }: { users: RemoteUser[] }) {
  return (
    <div data-testid="coedit-cursors">
      {users.filter((user) => user.cursor !== undefined).map((user) => (
        <span key={user.id} style={{ color: user.color }} data-position={user.cursor}>
          {user.name}
        </span>
      ))}
    </div>
  );
}
