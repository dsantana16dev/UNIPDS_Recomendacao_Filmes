import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { ApiError, listWatched, unmarkWatched } from "../api/client";
import type { MovieSummary } from "../api/types";
import { MovieCard } from "../components/MovieCard";
import { EmptyState, ErrorState, Spinner } from "../components/states";
import { useAuth } from "../context/AuthContext";

export function History() {
  const { user } = useAuth();
  const [items, setItems] = useState<MovieSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listWatched(user.id);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(movie: MovieSummary) {
    if (!user) return;
    const prev = items;
    setItems((cur) => cur.filter((m) => m.id !== movie.id)); // otimista
    try {
      await unmarkWatched(user.id, movie.id);
    } catch {
      setItems(prev); // reverte
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Seu histórico</h1>
        <p className="text-sm text-slate-400">
          Filmes que você marcou como assistidos — a base das suas{" "}
          <Link to="/recommendations" className="text-emerald-400 hover:underline">
            recomendações
          </Link>
          .
        </p>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum filme assistido ainda"
          hint="Abra um filme e toque em “Marcar assistido” para começar."
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((m) => (
            <MovieCard key={m.id} movie={m} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
