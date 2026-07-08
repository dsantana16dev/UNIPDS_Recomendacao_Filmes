import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { ApiError, getRecommendations } from "../api/client";
import type { ScoredMovie } from "../api/types";
import { MovieGrid } from "../components/MovieGrid";
import { EmptyState, ErrorState, Spinner } from "../components/states";
import { useAuth } from "../context/AuthContext";

export function Recommendations() {
  const { user } = useAuth();
  const [items, setItems] = useState<ScoredMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notTrained, setNotTrained] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setNotTrained(false);
    try {
      const data = await getRecommendations(user.id, 18);
      setItems(data.items);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setNotTrained(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Falha ao recomendar.");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Recomendados para você</h1>
        <p className="text-sm text-slate-400">
          Baseado nos filmes que você marcou como assistidos.
        </p>
      </div>

      {loading ? (
        <Spinner label="Gerando recomendações…" />
      ) : notTrained ? (
        <EmptyState
          title="Modelo ainda não treinado"
          hint="O serviço de recomendação (ml-service) precisa do modelo treinado do Sprint 4. Rode o treino e tente de novo."
          action={
            <button
              onClick={load}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Tentar de novo
            </button>
          }
        />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Sem recomendações ainda"
          hint="Marque alguns filmes como assistidos para o modelo aprender seu gosto."
          action={
            <Link
              to="/"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Explorar catálogo
            </Link>
          }
        />
      ) : (
        <MovieGrid movies={items} scoreLabel="match" />
      )}
    </div>
  );
}
