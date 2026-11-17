import { useEffect, useState } from 'react';
import PanelContenido from "../components/PanelContenido";

function Perfil() {
  const [usuario, setUsuario] = useState({ name: "Usuario", email: "correo@ejemplo.com", role: "user" });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUsuario(JSON.parse(userStr));
    }
  }, []);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Mi Perfil</h2>
        <p className="text-gray-600 mt-1">Gestiona tu información personal</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PanelContenido titulo="Información Personal" colSpan={2}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre completo</label>
              <input type="text" value={usuario.name} disabled className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Correo electrónico</label>
              <input type="email" value={usuario.email} disabled className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de cuenta</label>
              <input 
                type="text" 
                value={usuario.role === 'admin' ? 'Administrador' : 'Cliente'} 
                disabled 
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" 
              />
            </div>
          </div>
        </PanelContenido>

        <PanelContenido titulo="Acciones" colSpan={1}>
          <div className="space-y-3">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2">
              <i className="fa-solid fa-key"></i>
              <span>Cambiar Contraseña</span>
            </button>
            <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2">
              <i className="fa-solid fa-history"></i>
              <span>Historial de Pedidos</span>
            </button>
          </div>
        </PanelContenido>
      </div>
    </>
  );
}

export default Perfil;