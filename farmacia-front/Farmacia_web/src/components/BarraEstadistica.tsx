import { Icon } from "@iconify/react";
interface PropsBarraEstadistica {
  targetasEstadisticas: {
    title: string;
    value: string;
    icon: string;
    color: string;
  }[];
}

function BarraEstadistica(props: PropsBarraEstadistica) {
  const { targetasEstadisticas } = props;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {targetasEstadisticas.map((tarjeta, index) => (
        <div
          className="bg-white p-5 rounded-xl shadow-sm flex items-center justify-between"
          key={index}
        >
          <div>
            <p className="text-sm text-gray-500 font-medium">{tarjeta.title}</p>
            <h3 className="text-2xl font-bold text-gray-800">
              {tarjeta.value}
            </h3>
          </div>
          <div
            className={`p-3 bg-${tarjeta.color}-100 text-${tarjeta.color}-600 rounded-lg`}
          >
            {" "}
            <Icon
              icon={`lucide:${tarjeta.icon}`}
              className="fa-solid text-xl"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default BarraEstadistica;
