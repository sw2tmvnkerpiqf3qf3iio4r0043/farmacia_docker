import { Link, Outlet } from "react-router-dom";
import BarraLateral from "../components/BarraLateral";
import BarraSuperior from "../components/BarraSuperior";
import { useCart } from "../context/useCart";

interface PropsLayout {
  usuario: string;
  menuItems: { name: string; icon: string; active?: boolean; url: string }[];
  onLogout?: () => void;
}

const Layout = ({ usuario, menuItems, onLogout }: PropsLayout) => {
  const { itemCount } = useCart();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("farmacia_cart");
    if (onLogout) {
      onLogout();
    }
    window.location.href = "/";
  };

  // Detectar si es cliente o admin
  const esCliente: boolean = menuItems.some((item) => item.name === "Catálogo" || item.name === "Catalogo");

  // VISTA DEL CLIENTE (Tienda Online)
  if (esCliente) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Farmacia</h1>
                  <p className="text-xs text-gray-500 -mt-1">Online</p>
                </div>
              </div>

              <nav className="hidden md:flex items-center gap-6">
                {menuItems
                  .filter((item) => item.name !== "Catálogo" && item.name !== "Ofertas")
                  .map((item, index) => (
                    <Link
                      key={index}
                      to={item.url}
                      className="text-gray-700 hover:text-blue-600 font-medium transition"
                    >
                      {item.name}
                    </Link>
                  ))}
              </nav>

              <div className="flex items-center gap-3">
                <Link
                  to="/carrito"
                  className="relative text-gray-600 hover:text-blue-600 transition p-2"
                  title="Ver carrito"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Link>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {usuario.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 hidden lg:inline">
                    Hola, <strong>{usuario}</strong>
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-600 transition"
                  title="Cerrar sesión"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Outlet />
        </main>

        <footer className="bg-gray-900 text-white mt-auto">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-400 text-sm">
              © 2026 Farmacia Online. Todos los derechos reservados.
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // VISTA DEL ADMINISTRADOR (Panel de Control)
  return (
    <div className="flex h-screen overflow-hidden animate-fadeIn">
      <BarraLateral items={menuItems} tituloPanel="Panel Farmacia" />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <BarraSuperior
          usuario={usuario}
          panelNombre="Panel Admin"
          onLogout={handleLogout}
        />

        <main className="p-6 space-y-6 animate-slideIn">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;