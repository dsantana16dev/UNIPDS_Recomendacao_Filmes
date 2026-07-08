import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ApiError,
  getMovie,
  getSimilar,
  listWatched,
  markWatched,
  unmarkWatched,
} from "../api/client";
import type { MovieDetail as Movie, ScoredMovie } from "../api/types";
import { MovieGrid } from "../components/MovieGrid";
import { ErrorState, Spinner } from "../components/states";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../hooks/useFavorites";
import { posterUrl } from "../lib/poster";

function runtimeLabel(min: number | null) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function money(v: number | null) {
  if (!v || v <= 0) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

export function MovieDetail() {
  const { id } = useParams<{ id: string }>();
  const movieId = Number(id);
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [similar, setSimilar] = useState<ScoredMovie[]>([]);
  const [watched, setWatched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingWatched, setSavingWatched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, sim, watchedList] = await Promise.all([
        getMovie(movieId),
        getSimilar(movieId, 12).catch(() => ({ items: [] as ScoredMovie[] })),
        user ? listWatched(user.id) : Promise.resolve({ items: [] }),
      ]);
      setMovie(detail);
      setSimilar(sim.items);
      setWatched(watchedList.items.some((m) => m.id === movieId));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Falha ao carregar o filme.",
      );
    } finally {
      setLoading(false);
    }
  }, [movieId, user]);

  useEffect(() => {
    if (Number.isNaN(movieId)) return;
    load();
  }, [movieId, load]);

  async function toggleWatched() {
    if (!user || !movie) return;
    setSavingWatched(true);
    try {
      if (watched) {
        await unmarkWatched(user.id, movie.id);
        setWatched(false);
      } else {
        await markWatched(user.id, movie.id);
        setWatched(true);
      }
    } catch {
      /* mantém o estado anterior em caso de erro */
    } finally {
      setSavingWatched(false);
    }
  }

  if (loading) return <Spinner label="Carregando filme…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!movie) return null;

  const poster = posterUrl(movie.poster_path, "w500");
  const fav = isFavorite(movie.id);

  return (
    <div className="space-y-10">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="aspect-[2/3] w-full bg-slate-800">
            {poster ? (
              <img src={poster} alt={movie.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-500">
                {movie.title}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">
              {movie.title}{" "}
              {movie.release_year && (
                <span className="font-normal text-slate-400">
                  ({movie.release_year})
                </span>
              )}
            </h1>
            {movie.tagline && (
              <p className="mt-1 italic text-slate-400">{movie.tagline}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            {movie.vote_average != null && movie.vote_average > 0 && (
              <span className="text-amber-400">
                ★ {movie.vote_average.toFixed(1)}
                {movie.vote_count ? (
                  <span className="text-slate-500"> ({movie.vote_count})</span>
                ) : null}
              </span>
            )}
            {runtimeLabel(movie.runtime) && <span>{runtimeLabel(movie.runtime)}</span>}
            {movie.status && <span className="text-slate-500">{movie.status}</span>}
          </div>

          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={toggleWatched}
              disabled={savingWatched}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                watched
                  ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                  : "border border-slate-700 text-slate-200 hover:bg-slate-800"
              }`}
            >
              {watched ? "✓ Assistido" : "+ Marcar assistido"}
            </button>
            <button
              onClick={() => toggleFavorite(movie)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                fav
                  ? "border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
                  : "border-slate-700 text-slate-200 hover:bg-slate-800"
              }`}
            >
              {fav ? "♥ Favorito" : "♡ Favoritar"}
            </button>
          </div>

          {movie.overview && (
            <div>
              <h2 className="mb-1 text-sm font-semibold text-slate-200">Sinopse</h2>
              <p className="text-sm leading-relaxed text-slate-300">
                {movie.overview}
              </p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {movie.director && (
              <Meta label="Direção" value={movie.director} />
            )}
            {movie.original_language && (
              <Meta label="Idioma" value={movie.original_language.toUpperCase()} />
            )}
            {money(movie.budget) && <Meta label="Orçamento" value={money(movie.budget)!} />}
            {money(movie.revenue) && <Meta label="Receita" value={money(movie.revenue)!} />}
            {movie.release_date && (
              <Meta label="Lançamento" value={movie.release_date} />
            )}
          </dl>

          {movie.cast.length > 0 && (
            <div>
              <h2 className="mb-1 text-sm font-semibold text-slate-200">Elenco</h2>
              <p className="text-sm text-slate-400">
                {movie.cast.slice(0, 8).join(", ")}
              </p>
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Parecidos</h2>
        {similar.length === 0 ? (
          <p className="text-sm text-slate-500">
            Sem filmes parecidos disponíveis (índice vetorial indisponível).
          </p>
        ) : (
          <MovieGrid movies={similar} scoreLabel="similar" />
        )}
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}
