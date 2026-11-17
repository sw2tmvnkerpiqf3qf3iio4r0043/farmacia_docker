import { useEffect, useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  type RouteObject,
} from "react-router-dom";
import { componentRegistry } from "./routesConfig";
import Layout from "./pages/Layout";
import Default from "./pages/Default";

export interface MenuItem {
  name: string;
  icon: string;
  active?: boolean;
  url: string;
  component?: string;
}

interface DynamicRoute {
  menuItems: MenuItem[];
  usuario: string;
  onLogout?: () => void;
}

export function ModernRouter({ menuItems, usuario, onLogout }: DynamicRoute) {
  const [router, setRouter] = useState<any>(null);

  useEffect(() => {
    function initRoutes() {
      const dynamicRoutes: RouteObject[] = Array.isArray(menuItems)
        ? menuItems.map((item) => {
            if (item.url === "/") {
              return {
                index: true,
                Component: item.component
                  ? componentRegistry[item.component]
                  : componentRegistry["DashboardDemo"] || Default,
              };
            }

            return {
              path: item.url.replace(/^\//, ""),
              Component: item.component
                ? componentRegistry[item.component]
                : Default,
            };
          })
        : [];

      const routerInstance = createBrowserRouter([
        {
          path: "/",
          element: <Layout usuario={usuario} menuItems={menuItems} onLogout={onLogout} />,
          children: [
            ...dynamicRoutes,
            {
              path: "*",
              Component: Default,
            },
          ],
        },
      ]);

      setRouter(routerInstance);
    }

    initRoutes();
  }, [menuItems, usuario, onLogout]);

  if (!router) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 text-lg">Preparando panel...</p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}