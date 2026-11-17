import { Icon } from "@iconify/react";
import MainMenu from "./MainMenu";

interface PropsBarraLateral {
  items: { name: string; icon: string; active?: boolean; url: string }[];
  tituloPanel: string;
}

function BarraLateral(props: PropsBarraLateral) {
  const { items, tituloPanel } = props;

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/"; // Esto recarga la app y muestra el Login
  };

  return (
    <aside className="w-64 bg-slate-800 text-slate-300 hidden md:flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-center h-16 bg-slate-900 text-white font-bold text-xl">
          <Icon icon="lucide:gauge" className="fa-solid mr-2" /> {tituloPanel}
        </div>
        <MainMenu items={items} />
      </div>
      <div className="p-4 bg-slate-900">
        <button
          onClick={handleLogout}
          className="flex items-center text-red-400 hover:text-red-300 hover:bg-red-900/20 w-full px-3 py-2 rounded-lg transition cursor-pointer"
        >
          <Icon icon="ci:exit" className="fa-solid w-6 mr-2" /> 
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

export default BarraLateral;