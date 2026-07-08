import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email.trim().toLowerCase());
      } else {
        await register(name.trim(), email.trim().toLowerCase());
      }
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) setError("Usuário não encontrado. Cadastre-se.");
        else if (err.status === 409) setError("E-mail já cadastrado. Faça login.");
        else setError(err.message);
      } else {
        setError("Falha inesperada. Tente novamente.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            🎬 UNIPDS · Filmes
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Recomendações de filmes personalizadas
          </p>
        </div>

        <div className="mb-4 flex rounded-lg border border-slate-800 p-1 text-sm">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`flex-1 rounded-md py-2 transition ${
                mode === m
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m === "login" ? "Entrar" : "Cadastrar"}
            </button>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-xs text-slate-400">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-slate-400">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? "…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Auth leve, sem senha — só o e-mail identifica o usuário (MVP).
        </p>
      </div>
    </div>
  );
}
