import { useState } from "react";
import { login } from "../api/apiAuth";
import { getApiErrorMessage } from "../api/apiErrors";
import type { UserRole } from "../types/farmacia";

interface LoginProps {
  onLoginSuccess: (name: string, role: UserRole) => void;
  onGoToRegister: () => void;
}

function Login({ onLoginSuccess, onGoToRegister }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      onLoginSuccess(result.user.name, result.user.role);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Credenciales incorrectas. Intenta de nuevo."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-linear-to-br from-[#f5f7fa] via-white to-[#e4eef5]">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.08)] p-6 sm:p-10 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl mb-4">
            <i className="fa-solid fa-pills text-blue-600 text-2xl"></i>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Panel Farmacia</h1>
          <p className="text-slate-500 mt-2 text-sm">Gestión inteligente de medicamentos</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-600"></i>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
              Correo electrónico
            </label>
            <div className="relative group">
              <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"></i>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@agenda.com"
                required
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
              Contraseña
            </label>
            <div className="relative group">
              <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"></i>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                Iniciando sesión...
              </span>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-slate-500">
          ¿No tienes cuenta?{" "}
          <button
            onClick={onGoToRegister}
            className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
          >
            Regístrate aquí
          </button>
        </p>

        <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-600 font-semibold mb-2 flex items-center gap-2">
            <i className="fa-solid fa-info-circle text-blue-600"></i>
            Credenciales de prueba:
          </p>
          <div className="space-y-2">
            <div className="bg-white border border-slate-200 p-2 rounded-lg">
              <p className="text-xs text-slate-600 font-mono">Admin: demo@agenda.com</p>
              <p className="text-xs text-slate-600 font-mono">Pass: admin123</p>
            </div>
            <div className="bg-white border border-slate-200 p-2 rounded-lg">
              <p className="text-xs text-slate-600 font-mono">Cliente: cliente@farmacia.com</p>
              <p className="text-xs text-slate-600 font-mono">Pass: cliente123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;