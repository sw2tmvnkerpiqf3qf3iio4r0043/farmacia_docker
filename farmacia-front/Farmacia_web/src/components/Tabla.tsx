interface PropsTabla {
  titulos: { nombre: string; tipo: string; key: string }[];
  filas: Record<string, unknown>[];
}

function Tabla(props: PropsTabla) {
  const { titulos, filas } = props;
  const handleEstadoClick = (
    e: React.MouseEvent<HTMLSpanElement>,
    fila: Record<string, unknown>,
  ) => {
    alert(`Estado del usuario ${fila["nombre"]}: ${fila["estado"]}`);
    console.log(e, fila);
  };
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b text-gray-600 text-sm">
          {titulos.map((titulo, index) => (
            <th key={index} className="py-3">
              {titulo.nombre}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-sm text-gray-700">
        {filas.map((fila, index) => (
          <tr key={index + 1} className="border-b hover:bg-gray-100 transition">
            {titulos.map((titulo, index2) => (
              <td key={index * 1000 + index2 + 1} className="py-3">
                {titulo.tipo === "estado" ? (
                  <span
                    onClick={(e) => handleEstadoClick(e, fila)}
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      fila[titulo.key] === "Activo"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {String(fila[titulo.key])}
                  </span>
                ) : (
                  <span>{String(fila[titulo.key])}</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Tabla;
