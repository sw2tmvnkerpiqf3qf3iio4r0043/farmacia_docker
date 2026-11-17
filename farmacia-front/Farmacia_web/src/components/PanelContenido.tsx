import Titulo from "./titulo";

interface PropsPanelContenido {
  titulo: string;
  children?: React.ReactNode;
  colSpan?: number; // Nueva propiedad opcional para controlar el colspan
}
function PanelContenido(props: PropsPanelContenido) {
  const { titulo, children, colSpan } = props;
  return (
    <div
      className={`bg-white p-6 rounded-xl shadow-sm${` lg:col-span-${colSpan}` || ""}`}
    >
      <Titulo texto={titulo} />
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
export default PanelContenido;
