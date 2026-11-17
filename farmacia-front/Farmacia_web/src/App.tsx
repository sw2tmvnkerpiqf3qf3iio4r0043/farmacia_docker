import { Suspense, useState, useEffect } from "react";
import { ModernRouter, type MenuItem } from "./ModernRouter";
import Login from "./pages/Login";
import { useCart } from "./context/CartContext";
import type { UserRole } from "./types/farmacia";

const menuItemsAdmin: MenuItem[] = [
  { name: "Inicio", icon: "house", url: "/", active: true, component: "DashboardDemo" },
  { name: "Medicamentos", icon: "pills", url: "/medicamento", active: false, component: "Medicamento" },
  { name: "Categorías", icon: "tags", url: "/categoria", active: false, component: "Categoria" },
  { name: "Ofertas", icon: "percent", url: "/oferta", active: false, component: "Oferta" },
  { name: "Ventas", icon: "shopping-cart", url: "/ventas", active: false, component: "Ventas" },
  { name: "Compras", icon: "package", url: "/compras", active: false, component: "Compras" },
  { name: "Usuarios", icon: "users", url: "/usuarios", active: false, component: "Usuarios" },
];

const menuItemsRegente: MenuItem[] = [
  { name: "Inicio", icon: "house", url: "/", active: true, component: "DashboardDemo" },
  { name: "Medicamentos", icon: "pills", url: "/medicamento", active: false, component: "Medicamento" },
  { name: "Categorías", icon: "tags", url: "/categoria", active: false, component: "Categoria" },
  { name: "Ofertas", icon: "percent", url: "/oferta", active: false, component: "Oferta" },
  { name: "Ventas", icon: "shopping-cart", url: "/ventas", active: false, component: "Ventas" },
];

const menuItemsVendedor: MenuItem[] = [
  { name: "Inicio", icon: "house", url: "/", active: true, component: "DashboardDemo" },
  { name: "Medicamentos", icon: "pills", url: "/medicamento", active: false, component: "Medicamento" },
  { name: "Ofertas", icon: "percent", url: "/oferta", active: false, component: "Oferta" },
  { name: "Ventas", icon: "shopping-cart", url: "/ventas", active: false, component: "Ventas" },
];

const menuItemsAlmacenero: MenuItem[] = [
  { name: "Inicio", icon: "house", url: "/", active: true, component: "DashboardDemo" },
  { name: "Medicamentos", icon: "pills", url: "/medicamento", active: false, component: "Medicamento" },
  { name: "Categorías", icon: "tags", url: "/categoria", active: false, component: "Categoria" },
  { name: "Compras", icon: "package", url: "/compras", active: false, component: "Compras" },
];

const menuItemsUser: MenuItem[] = [
  { name: "Inicio", icon: "house", url: "/", active: true, component: "DashboardCliente" },
  { name: "Catálogo", icon: "pills", url: "/catalogo", active: false, component: "Catalogo" },
  { name: "Ofertas", icon: "percent", url: "/oferta", active: false, component: "Oferta" },
  { name: "Carrito", icon: "shopping-cart", url: "/carrito", active: false, component: "Carrito" },
  { name: "Mis Pedidos", icon: "package", url: "/mis-pedidos", active: false, component: "MisPedidos" },
  { name: "Mi Perfil", icon: "user", url: "/perfil", active: false, component: "Perfil" },
];

const ROLE_MENUS: Record<Exclude<UserRole, 'user'>, MenuItem[]> = {
  admin: menuItemsAdmin,
  regente: menuItemsRegente,
  vendedor: menuItemsVendedor,
  almacenero: menuItemsAlmacenero,
};

function normalizarRol(role: string | undefined): UserRole {
  if (role === 'admin' || role === 'regente' || role === 'vendedor' || role === 'almacenero') {
    return role;
  }
  return 'user';
}

function App() {
  const { clearCart } = useCart();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [userName, setUserName] = useState("Usuario");
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAuthenticated(true);
        setUserName(user.name || "Usuario");
        setUserRole(normalizarRol(user.role));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (name: string, role: UserRole) => {
    setUserName(name);
    setUserRole(role);
    setIsTransitioning(true);

    setTimeout(() => {
      setIsAuthenticated(true);
      setIsTransitioning(false);
    }, 500);
  };

  const handleLogout = () => {
    clearCart();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUserName("Usuario");
    setUserRole('user');
  };

  if (isLoading || isTransitioning) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl mb-4 animate-pulse">
            <i className="fa-solid fa-pills text-white text-3xl"></i>
          </div>
          <p className="text-white text-lg font-medium">
            {isTransitioning ? "Iniciando sesión..." : "Cargando aplicación..."}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const activeMenu = userRole === 'user' ? menuItemsUser : ROLE_MENUS[userRole];

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600 text-lg">Cargando módulo...</p>
          </div>
        </div>
      }
    >
      <ModernRouter 
        usuario={userName} 
        menuItems={activeMenu}
        onLogout={handleLogout}
      />
    </Suspense>
  );
}

export default App;