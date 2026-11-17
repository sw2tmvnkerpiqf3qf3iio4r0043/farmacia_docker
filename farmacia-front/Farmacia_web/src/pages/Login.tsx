import { useState } from "react";
import { login } from "../api/apiAuth";
import { getApiErrorMessage } from "../api/apiErrors";
import type { UserRole } from "../types/farmacia";

interface LoginProps {
  onLoginSuccess: (name: string, role: UserRole) => void;
}

function Login({ onLoginSuccess }: LoginProps) {
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500"></div>

      <div className="absolute top-10 left-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-10 right-10 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4 transform hover:scale-105 transition-transform duration-300">
            <i className="fa-solid fa-pills text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Panel Farmacia</h1>
          <p className="text-blue-100 mt-2 text-sm">Gestión inteligente de medicamentos</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-300"></i>
              <p className="text-red-100 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-blue-100 mb-2 ml-1">
              Correo electrónico
            </label>
            <div className="relative group">
              <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-purple-400 transition-colors"></i>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@agenda.com"
                required
                className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-blue-100 mb-2 ml-1">
              Contraseña
            </label>
            <div className="relative group">
              <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-purple-400 transition-colors"></i>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/30 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-2"
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

        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
          <p className="text-xs text-blue-200 font-semibold mb-2 flex items-center gap-2">
            <i className="fa-solid fa-info-circle"></i>
            Credenciales de prueba:
          </p>
          <div className="space-y-2">
            <div className="bg-black/20 p-2 rounded-lg">
              <p className="text-xs text-blue-100 font-mono">Admin: demo@agenda.com</p>
              <p className="text-xs text-blue-100 font-mono">Pass: demo1234</p>
            </div>
            <div className="bg-black/20 p-2 rounded-lg">
              <p className="text-xs text-blue-100 font-mono">Cliente: cliente@farmacia.com</p>
              <p className="text-xs text-blue-100 font-mono">Pass: demo1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;