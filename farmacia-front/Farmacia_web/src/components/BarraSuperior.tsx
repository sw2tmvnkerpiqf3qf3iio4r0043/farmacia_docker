import { Icon } from "@iconify/react";

interface PropsBarraSuperior {
  panelNombre?: string;
  usuario: string;
  onLogout?: () => void;
}

function BarraSuperior(props: PropsBarraSuperior) {
  const { panelNombre, usuario, onLogout } = props;

  return (
    <header className="h-16 bg-white shadow flex items-center justify-between px-6 z-10">
      <div className="flex items-center">
        <button className="text-gray-500 md:hidden focus:outline-none">
          <Icon icon="fa7-solid:bars" className="fa-solid text-xl" />
        </button>
        {panelNombre && (
          <span className="ml-2 md:ml-0 font-semibold text-gray-700 text-lg">
            {panelNombre}
          </span>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-gray-600 text-sm hidden sm:inline">
          Hola, <strong>{usuario}</strong>
        </span>
        <div className="h-9 w-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
          {usuario.charAt(0).toUpperCase()}
        </div>
        <button
          onClick={onLogout}
          className="text-gray-500 hover:text-red-600 transition"
          title="Cerrar sesión"
        >
          <Icon icon="lucide:log-out" className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

export default BarraSuperior;