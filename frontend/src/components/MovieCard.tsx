import { Link } from "react-router-dom";
import type { MovieSummary } from "../api/types";
import { posterUrl } from "../lib/poster";
import { useFavorites } from "../hooks/useFavorites";

/** Formata um score 0..1 como porcentagem inteira. */
function pct(score: number) {
  return `${Math.round(score * 100)}%`;
}

export function MovieCard({
  movie,
  score,
  scoreLabel = "match",
  onRemove,
}: {
  movie: MovieSummary;
  /** Score opcional (similaridade ou recomendação), 0..1. */
  score?: number;
  scoreLabel?: string;
  /** Se definido, mostra um botão de remover (usado no histórico). */
  onRemove?: (movie: MovieSummary) => void;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const poster = posterUrl(movie.poster_path);
  const fav = isFavorite(movie.id);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition hover:border-slate-600 hover:shadow-lg hover:shadow-black/30">
      <button
        type="button"
        aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        onClick={(e) => {
          e.preventDefault();
          toggleFavorite(movie);
        }}
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-lg backdrop-blur transition hover:bg-black/70"
      >
        <span className={fav ? "text-rose-400" : "text-slate-300"}>
          {fav ? "♥" : "♡"}
        </span>
      </button>

      {score != null && (
        <div className="absolute left-2 top-2 z-10 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-semibold text-emerald-950">
          {pct(score)} {scoreLabel}
        </div>
      )}

      <Link to={`/movies/${movie.id}`} className="block">
        <div className="aspect-[2/3] w-full bg-slate-800">
          {poster ? (
            <img
              src={poster}
              alt={movie.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-3 text-center text-sm text-slate-500">
              {movie.title}
            </div>
          )}
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-1 text-sm font-medium text-slate-100">
            {movie.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {movie.release_year && <span>{movie.release_year}</span>}
            {movie.vote_average != null && movie.vote_average > 0 && (
              <span className="text-amber-400">
                ★ {movie.vote_average.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {onRemove && (
        <button
          onClick={() => onRemove(movie)}
          className="w-full border-t border-slate-800 py-2 text-xs text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400"
        >
          Remover
        </button>
      )}
    </div>
  );
}
