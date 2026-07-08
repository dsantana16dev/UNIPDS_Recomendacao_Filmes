import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, listMovies } from "../api/client";
import type { MovieSummary } from "../api/types";
import { MovieGrid } from "../components/MovieGrid";
import { ErrorState, Spinner } from "../components/states";
import { useAuth } from "../context/AuthContext";

const PAGE = 24;

export function Home() {
  const { user } = useAuth();
  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (offset: number) => {
    const isFirst = offset === 0;
    if (isFirst) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const data = await listMovies({ limit: PAGE, offset });
      setTotal(data.total);
      setMovies((prev) => (isFirst ? data.items : [...prev, ...data.items]));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao carregar.");
    } finally {
      if (isFirst) setLoading(false);
      else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
        <h1 className="text-2xl font-bold">
          Olá, {user?.name?.split(" ")[0] ?? "cinéfilo"} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Explore o catálogo, marque o que já assistiu e receba{" "}
          <Link to="/recommendations" className="text-emerald-400 hover:underline">
            recomendações personalizadas
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Populares</h2>
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={() => load(0)} />
        ) : (
          <>
            <MovieGrid movies={movies} />
            {movies.length < total && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => load(movies.length)}
                  disabled={loadingMore}
                  className="rounded-lg border border-slate-700 px-6 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  {loadingMore ? "Carregando…" : "Carregar mais"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
