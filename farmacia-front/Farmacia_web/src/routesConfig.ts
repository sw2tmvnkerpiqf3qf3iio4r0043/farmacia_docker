import React from "react";

const Home = React.lazy(() => import("./pages/Home"));
const About = React.lazy(() => import("./pages/About"));
const Demo = React.lazy(() => import("./pages/Demo"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const DashboardDemo = React.lazy(() => import("./pages/DashboardDemo"));
const DashboardCliente = React.lazy(() => import("./pages/DashboardCliente"));
const Medicamento = React.lazy(() => import("./pages/Medicamento"));
const Categoria = React.lazy(() => import("./pages/Categoria"));
const Oferta = React.lazy(() => import("./pages/Oferta"));
const Usuarios = React.lazy(() => import("./pages/Usuarios"));
const Catalogo = React.lazy(() => import("./pages/Catalogo"));
const Perfil = React.lazy(() => import("./pages/Perfil"));
const Ventas = React.lazy(() => import("./pages/Ventas"));
const Compras = React.lazy(() => import("./pages/Compras"));
const Carrito = React.lazy(() => import("./pages/Carrito"));
const MisPedidos = React.lazy(() => import("./pages/MisPedidos"));
const OfertasCliente = React.lazy(() => import("./pages/OfertasCliente"));
const Default = React.lazy(() => import("./pages/Default"));

export const componentRegistry: Record<string, React.ComponentType> = {
  Home,
  About,
  Demo,
  Dashboard,
  DashboardDemo,
  DashboardCliente,
  Medicamento,
  Categoria,
  Oferta,
  Usuarios,
  Catalogo,
  Perfil,
  Ventas,
  Compras,
  Carrito,
  MisPedidos,
  OfertasCliente,
  Default,
};