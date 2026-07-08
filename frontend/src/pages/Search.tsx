import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError, listMovies } from "../api/client";
import type { MovieSummary } from "../api/types";
import { MovieGrid } from "../components/MovieGrid";
import { EmptyState, ErrorState, Spinner } from "../components/states";

export function Search() {
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";

  const [movies, setMovies] = useState<MovieSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q) {
      setMovies([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    listMovies({ q, limit: 48 })
      .then((data) => {
        if (!active) return;
        setMovies(data.items);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Falha na busca.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [q]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">
        {q ? (
          <>
            Resultados para “<span className="text-emerald-400">{q}</span>”
          </>
        ) : (
          "Pesquisar"
        )}
      </h1>

      {!q ? (
        <EmptyState
          title="Digite algo na barra de busca"
          hint="Pesquise por título de filme no campo acima."
        />
      ) : loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} />
      ) : movies.length === 0 ? (
        <EmptyState
          title="Nenhum filme encontrado"
          hint={`Não achamos nada para “${q}”. Tente outro termo.`}
        />
      ) : (
        <MovieGrid movies={movies} />
      )}
    </div>
  );
}
