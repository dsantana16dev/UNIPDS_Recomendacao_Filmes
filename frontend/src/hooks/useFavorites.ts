import { useCallback, useEffect, useState } from "react";
import type { MovieSummary } from "../api/types";
import { useAuth } from "../context/AuthContext";

// Favoritos são locais ao navegador (sem endpoint no backend — 2ª leva).
// Guardamos o resumo do filme para renderizar a página sem novo fetch.

function keyFor(userId: number) {
  return `unipds.favorites.${userId}`;
}

function read(userId: number): MovieSummary[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as MovieSummary[]) : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [favorites, setFavorites] = useState<MovieSummary[]>([]);

  useEffect(() => {
    setFavorites(userId == null ? [] : read(userId));
  }, [userId]);

  const persist = useCallback(
    (next: MovieSummary[]) => {
      setFavorites(next);
      if (userId != null) {
        localStorage.setItem(keyFor(userId), JSON.stringify(next));
      }
    },
    [userId],
  );

  const isFavorite = useCallback(
    (movieId: number) => favorites.some((m) => m.id === movieId),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (movie: MovieSummary) => {
      if (favorites.some((m) => m.id === movie.id)) {
        persist(favorites.filter((m) => m.id !== movie.id));
      } else {
        persist([movie, ...favorites]);
      }
    },
    [favorites, persist],
  );

  return { favorites, isFavorite, toggleFavorite };
}
