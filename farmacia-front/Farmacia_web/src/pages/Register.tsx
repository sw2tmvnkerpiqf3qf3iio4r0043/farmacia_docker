import { useState } from "react";
import apiClient from "../api/apiClient";
import { getApiErrorMessage } from "../api/apiErrors";
import type { AuthResponse } from "../types/farmacia";

interface RegisterProps {
  onRegisterSuccess: (name: string, role: "user") => void;
  onGoToLogin: () => void;
}

export default function Register({ onRegisterSuccess, onGoToLogin }: RegisterProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    ci: "",
    telefono: "",
    fechaNacimiento: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiClient.post<AuthResponse>("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "user",
        ci: form.ci.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        fechaNacimiento: form.fechaNacimiento || undefined,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      onRegisterSuccess(response.data.user.name, "user");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "No se pudo crear la cuenta. Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500"></div>
      <div className="absolute top-10 left-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-10 right-10 w-72 h-72 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10 animate-fadeIn">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-3">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Crear cuenta</h1>
          <p className="text-blue-100 mt-1 text-sm">Regístrate para comprar en línea</p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-500/20 border border-red-400/30 rounded-xl">
            <p className="text-red-100 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-blue-100 mb-1 ml-1">Nombre completo</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Tu nombre"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-blue-100 mb-1 ml-1">Correo electrónico</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-blue-100 mb-1 ml-1">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-blue-100 mb-1 ml-1">CI (opcional)</label>
              <input
                type="text"
                value={form.ci}
                onChange={(e) => handleChange("ci", e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-100 mb-1 ml-1">Teléfono (opcional)</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-blue-100 mb-1 ml-1">Fecha de nacimiento (opcional)</label>
            <input
              type="date"
              value={form.fechaNacimiento}
              onChange={(e) => handleChange("fechaNacimiento", e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="mt-5 text-sm text-center text-blue-100">
          ¿Ya tienes cuenta?{" "}
          <button onClick={onGoToLogin} className="text-white font-bold hover:text-purple-300 hover:underline">
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}
