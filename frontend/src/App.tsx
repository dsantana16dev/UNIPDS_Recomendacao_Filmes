import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type Health = {
  status: string;
  service: string;
  database: string;
};

function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setError("Backend indisponível"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">
        🎬 UNIPDS · Recomendação de Filmes
      </h1>
      <p className="text-slate-400">Sprint 1 — Infraestrutura no ar</p>

      <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-4 min-w-72">
        <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-2">
          Status do backend
        </h2>
        {error && <p className="text-red-400">{error}</p>}
        {!error && !health && <p className="text-slate-400">Verificando…</p>}
        {health && (
          <ul className="space-y-1 text-sm">
            <li>
              API: <span className="text-emerald-400">{health.status}</span>
            </li>
            <li>
              Banco:{" "}
              <span
                className={
                  health.database === "up"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }
              >
                {health.database}
              </span>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
