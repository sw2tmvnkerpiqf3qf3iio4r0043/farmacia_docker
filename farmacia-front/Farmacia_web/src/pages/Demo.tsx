import BarraEstadistica from "../components/BarraEstadistica";
import PanelContenido from "../components/PanelContenido";
import { useState } from "react";
import Listado from "../components/listado";
import miImagen from "../assets/react.svg";
import Titulo from "../components/titulo";

function Demo() {
  const usuario = "KitiDay";
  const targetasEstadisticas = [
    {
      title: "Ingresos Totales",
      value: "$70,500",
      icon: "dollar-sign",
      color: "green",
    },
    { title: "Usuarios Activos", value: "1,240", icon: "users", color: "blue" },
    {
      title: "Nuevos Pedidos",
      value: "85",
      icon: "shopping-cart",
      color: "yellow",
    },
    { title: "Reportes", value: "12", icon: "alert-triangle", color: "red" },
    // { title: "Aprobados", value: "8", icon: "alert-triangle", color: "blue" },
  ];

  const [count, setCount] = useState(0);
  const lista = [
    { id: 1, name: "Producto uno" },
    { id: 2, name: "Producto 2" },
    { id: 3, name: "Producto 3" },
  ];
  return (
    <>
      <BarraEstadistica targetasEstadisticas={targetasEstadisticas} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PanelContenido titulo="Practicas de React" colSpan={3}>
          {usuario ? (
            <>
              <Titulo
                texto="Bienvenido a mi aplicación"
                texto2={usuario}
                imagen="/favicon.svg"
              />
              <img src={miImagen} alt="react" />
              <button onClick={() => alert("Botón clicado")}>Click</button>
              <button
                type="button"
                className="counter"
                onClick={() => setCount((count) => count + 1)}
              >
                Count is {count}
              </button>
              <Listado
                lista={lista}
                onSelectedItemChange={(id, index) =>
                  console.log(`Item seleccionado: ${id}, Índice: ${index}`)
                }
              />
            </>
          ) : (
            <>
              <Titulo texto="Variable no está definida" />
              <p>Variable no está definida</p>
            </>
          )}{" "}
        </PanelContenido>

        <PanelContenido titulo="Acción Rápida">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Título
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del elemento"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Categoría
              </label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Opción 1</option>
                <option>Opción 2</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
            >
              Guardar
            </button>
          </form>
        </PanelContenido>
      </div>
    </>
  );
}

export default Demo;
