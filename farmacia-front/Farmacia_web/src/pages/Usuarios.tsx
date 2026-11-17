import PanelContenido from "../components/PanelContenido";
import Tabla from "../components/Tabla";

//import { useUsers } from '../hooks/useUsers';

function Usuarios() {
  /*
const { data: users, isLoading, error } = useUsers();

  if (isLoading) return <p>Cargando usuarios...</p>;
  if (error) return <p>Hubo un error al cargar.</p>;

  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
  /*/
  const usuarios = [
    { nombre: "María Gómez", correo: "maria@example.com", estado: "Activo" },
    {
      nombre: "Carlos Pérez",
      correo: "carlos@example.com",
      estado: "Pendiente",
    },
    { nombre: "Ana Torres", correo: "ana@example.com", estado: "Activo" },
  ];
  const titulos = [
    { nombre: "Estado", tipo: "estado", key: "estado" },
    { nombre: "Nombre", tipo: "string", key: "nombre" },
    { nombre: "Correo", tipo: "string", key: "correo" },
    { nombre: "Estado", tipo: "estado", key: "estado" },
  ];
  return (
    <PanelContenido titulo="Últimos Usuarios Registrados de React" colSpan={2}>
      <Tabla titulos={titulos} filas={usuarios} />
    </PanelContenido>
  );
  //*/
}
export default Usuarios;
