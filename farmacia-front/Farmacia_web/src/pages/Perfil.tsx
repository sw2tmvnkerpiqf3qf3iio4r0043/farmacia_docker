import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword, getProfile, updateProfile } from "../api/apiAuth";
import { getMiCliente, updateMiCliente } from "../api/apiCliente";
import { getApiErrorMessage } from "../api/apiErrors";
import type { Cliente, UserSession } from "../types/farmacia";

function leerUsuario(): UserSession | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

function Perfil() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<UserSession | null>(leerUsuario());
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const [formCuenta, setFormCuenta] = useState({ name: "", email: "" });
  const [formCliente, setFormCliente] = useState({
    ci: "",
    telefono: "",
    fechaNacimiento: "",
    condicionesCronicas: "",
  });
  const [formPass, setFormPass] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  const [guardandoCuenta, setGuardandoCuenta] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [guardandoPass, setGuardandoPass] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      let u = leerUsuario();
      try {
        u = await getProfile();
        localStorage.setItem("user", JSON.stringify(u));
      } catch {
        // fallback a localStorage
      }
      setUsuario(u);
      setFormCuenta({ name: u?.name || "", email: u?.email || "" });
      try {
        const c = await getMiCliente();
        setCliente(c);
        setFormCliente({
          ci: c.ci || "",
          telefono: c.telefono || "",
          fechaNacimiento: (c.fechaNacimiento || "").slice(0, 10),
          condicionesCronicas: c.condicionesCronicas || "",
        });
      } catch {
        setCliente(null);
      } finally {
        setCargando(false);
      }
    };
    void cargar();
  }, []);

  const guardarCuenta = async () => {
    setError("");
    setMsg("");
    setGuardandoCuenta(true);
    try {
      const updated = await updateProfile({ name: formCuenta.name, email: formCuenta.email });
      const merged = { ...(usuario || {}), ...updated } as UserSession;
      localStorage.setItem("user", JSON.stringify(merged));
      setUsuario(merged);
      setMsg("Datos de cuenta actualizados.");
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo actualizar la cuenta"));
    } finally {
      setGuardandoCuenta(false);
    }
  };

  const guardarCliente = async () => {
    setError("");
    setMsg("");
    setGuardandoCliente(true);
    try {
      const updated = await updateMiCliente({
        ci: formCliente.ci || undefined,
        telefono: formCliente.telefono || undefined,
        fechaNacimiento: formCliente.fechaNacimiento || null,
        condicionesCronicas: formCliente.condicionesCronicas || null,
      });
      setCliente(updated);
      setMsg("Datos de perfil de cliente actualizados.");
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo actualizar el perfil de cliente"));
    } finally {
      setGuardandoCliente(false);
    }
  };

  const guardarPassword = async () => {
    setError("");
    setMsg("");
    if (!formPass.currentPassword || !formPass.newPassword) {
      setError("Completa la contraseña actual y la nueva.");
      return;
    }
    if (formPass.newPassword !== formPass.confirm) {
      setError("La confirmación no coincide.");
      return;
    }
    setGuardandoPass(true);
    try {
      await changePassword(formPass.currentPassword, formPass.newPassword);
      setFormPass({ currentPassword: "", newPassword: "", confirm: "" });
      setMsg("Contraseña actualizada correctamente.");
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo cambiar la contraseña"));
    } finally {
      setGuardandoPass(false);
    }
  };

  if (cargando) {
    return <div className="flex items-center justify-center h-64"><p className="text-lg text-gray-600">Cargando perfil...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Mi Perfil</h2>
        <p className="text-gray-600 mt-1">Gestiona tu información personal y seguridad</p>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">{msg}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Cuenta</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
            <input type="text" value={formCuenta.name} onChange={(e) => setFormCuenta((p) => ({ ...p, name: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Correo electrónico</label>
            <input type="email" value={formCuenta.email} onChange={(e) => setFormCuenta((p) => ({ ...p, email: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="text-sm text-gray-600">
            Rol: <span className="font-semibold">{usuario?.role || "usuario"}</span>
          </div>
          <button type="button" onClick={guardarCuenta} disabled={guardandoCuenta} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition">
            {guardandoCuenta ? "Guardando..." : "Guardar cuenta"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Datos de cliente</h3>
          {!usuario?.idCliente && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
              Tu cuenta no tiene ficha de cliente asociada. Algunas funciones (compras/recetas) pueden no estar disponibles.
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">CI</label>
            <input type="text" value={formCliente.ci} onChange={(e) => setFormCliente((p) => ({ ...p, ci: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
            <input type="text" value={formCliente.telefono} onChange={(e) => setFormCliente((p) => ({ ...p, telefono: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de nacimiento</label>
            <input type="date" value={formCliente.fechaNacimiento} onChange={(e) => setFormCliente((p) => ({ ...p, fechaNacimiento: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Condiciones crónicas</label>
            <textarea value={formCliente.condicionesCronicas} onChange={(e) => setFormCliente((p) => ({ ...p, condicionesCronicas: e.target.value }))} rows={3} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          {cliente && <p className="text-xs text-gray-500">Cliente #{cliente.idCliente}{cliente.nombreCompleto || cliente.nombre ? ` · ${cliente.nombreCompleto || cliente.nombre}` : ""}</p>}
          <button type="button" onClick={guardarCliente} disabled={guardandoCliente || !usuario?.idCliente} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition">
            {guardandoCliente ? "Guardando..." : "Guardar datos de cliente"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Cambiar contraseña</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña actual</label>
            <input type="password" value={formPass.currentPassword} onChange={(e) => setFormPass((p) => ({ ...p, currentPassword: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nueva contraseña</label>
            <input type="password" value={formPass.newPassword} onChange={(e) => setFormPass((p) => ({ ...p, newPassword: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmar nueva contraseña</label>
            <input type="password" value={formPass.confirm} onChange={(e) => setFormPass((p) => ({ ...p, confirm: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <button type="button" onClick={guardarPassword} disabled={guardandoPass} className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition">
            {guardandoPass ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Acciones</h3>
          <button type="button" onClick={() => navigate("/mis-pedidos")} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition">
            Historial de Pedidos
          </button>
          <p className="text-sm text-gray-500">Consulta el estado y detalle de tus compras anteriores.</p>
        </div>
      </div>
    </div>
  );
}

export default Perfil;
