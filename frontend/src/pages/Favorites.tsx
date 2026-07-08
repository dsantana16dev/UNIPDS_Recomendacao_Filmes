import { Link } from "react-router-dom";
import { MovieGrid } from "../components/MovieGrid";
import { EmptyState } from "../components/states";
import { useFavorites } from "../hooks/useFavorites";

export function Favorites() {
  const { favorites } = useFavorites();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Seus favoritos</h1>
        <p className="text-sm text-slate-400">
          Salvos localmente neste navegador.
        </p>
      </div>

      {favorites.length === 0 ? (
        <EmptyState
          title="Nenhum favorito ainda"
          hint="Toque no ♡ em qualquer filme para salvá-lo aqui."
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
        <MovieGrid movies={favorites} />
      )}
    </div>
  );
}
