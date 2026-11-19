import type { RemoteUser } from 'coedit';

export function UserList({ users }: { users: RemoteUser[] }) {
  return (
    <ul data-testid="coedit-users">
      {users.map((user) => (
        <li key={user.id}>
          <span style={{ background: user.color }} /> {user.name} {user.online ? 'online' : 'offline'}
        </li>
      ))}
    </ul>
  );
}
