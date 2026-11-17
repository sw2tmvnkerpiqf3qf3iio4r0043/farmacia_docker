import { useState } from "react";

interface ListadoProps {
  lista: { id: number; name: string }[];
  onSelectedItemChange?: (id: number, index: number) => void;
}
function Listado({ lista, onSelectedItemChange }: ListadoProps) {
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const handleItemClick = (id: number, index: number) => {
    setSelectedItem(id);
    onSelectedItemChange?.(id, index);
  };
  return (
    <ul>
      {lista.map((item, index) => (
        <li
          key={item.id}
          className={`cursor-pointer ${selectedItem === item.id ? "bg-green-500 text-white" : "hover:bg-gray-200"}`}
          onClick={() => handleItemClick(item.id, index)}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}
export default Listado;
