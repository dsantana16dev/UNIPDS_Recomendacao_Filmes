// O dataset guarda o `poster_path` da TMDB (ex.: "/abc123.jpg").
// Montamos a URL da imagem no CDN público da TMDB.

const TMDB_IMG_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(
  path: string | null | undefined,
  size: "w185" | "w342" | "w500" = "w342",
): string | null {
  if (!path) return null;
  return `${TMDB_IMG_BASE}/${size}${path}`;
}
