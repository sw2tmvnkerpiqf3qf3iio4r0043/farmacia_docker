import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";

interface PropsMainMenu {
  items: { name: string; icon: string; active?: boolean; url: string }[];
}

function MainMenu(props: PropsMainMenu) {
  const { items } = props;
  return (
    <nav className="mt-4 px-2 space-y-1">
      {items.map((item, index) => (
        <Link
          key={index}
          to={item.url}
          className={`flex items-center px-4 py-2.5 rounded-lg ${
            item.active
              ? "bg-slate-700 text-white"
              : "hover:bg-slate-700 hover:text-white"
          } transition`}
        >
          <Icon icon={`lucide:${item.icon}`} className="w-6" /> {item.name}
        </Link>
      ))}
    </nav>
    /*<nav className="mt-4 px-2 space-y-1">
      {items.map((item, index) => (
        <a
          key={index}
          href={item.url}
          className={`flex items-center px-4 py-2.5 rounded-lg ${
            item.active
              ? "bg-slate-700 text-white"
              : "hover:bg-slate-700 hover:text-white"
          } transition`}
        >
          <Icon icon={`lucide:${item.icon}`} className="w-6" /> {item.name}
        </a>
      ))}
    </nav>*/
  );
}

export default MainMenu;
