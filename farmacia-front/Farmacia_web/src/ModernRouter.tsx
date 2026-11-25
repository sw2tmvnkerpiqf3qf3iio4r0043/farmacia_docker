import { useMemo, type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useLocation,
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

function RouteGuard({ allowedPaths, children }: { allowedPaths: string[]; children: ReactNode }) {
  const { pathname } = useLocation();
  if (!allowedPaths.includes(pathname)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function ModernRouter({ menuItems, usuario, onLogout }: DynamicRoute) {
  const router = useMemo(() => {
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
            Component: item.component ? componentRegistry[item.component] : Default,
          };
        })
      : [];

    const allowedPaths = Array.from(
      new Set(["/", ...menuItems.map((item) => (item.url === "/" ? "/" : `/${item.url.replace(/^\//, "")}`))])
    );

    return createBrowserRouter([
      {
        path: "/",
        element: (
          <RouteGuard allowedPaths={allowedPaths}>
            <Layout usuario={usuario} menuItems={menuItems} onLogout={onLogout} />
          </RouteGuard>
        ),
        children: [
          ...dynamicRoutes,
          {
            path: "*",
            Component: Default,
          },
        ],
      },
    ]);
  }, [menuItems, usuario, onLogout]);

  return <RouterProvider router={router} />;
}
