import { useUsers } from "../hooks/useUsers";

export const UserList = () => {
  const { data: users, isLoading, error } = useUsers();

  if (isLoading) return <p>Cargando usuarios...</p>;
  if (error) return <p>Hubo un error: {error.message}</p>;
  if (!Array.isArray(users) || users.length === 0)
    return <p>No se encontraron usuarios.</p>;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
};
