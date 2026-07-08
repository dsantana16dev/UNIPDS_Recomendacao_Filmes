// Tipos espelhando os schemas do backend (app/api/schemas.py).

export type MovieSummary = {
  id: number;
  title: string;
  release_year: number | null;
  popularity: number | null;
  vote_average: number | null;
  poster_path: string | null;
  genres: string[];
};

export type MovieDetail = MovieSummary & {
  imdb_id: string | null;
  original_title: string | null;
  original_language: string | null;
  overview: string | null;
  tagline: string | null;
  release_date: string | null;
  runtime: number | null;
  budget: number | null;
  revenue: number | null;
  vote_count: number | null;
  status: string | null;
  director: string | null;
  cast: string[];
  keywords: string[];
};

export type MovieList = {
  total: number;
  limit: number;
  offset: number;
  items: MovieSummary[];
};

/** Filme com score (similaridade do Qdrant ou probabilidade do modelo). */
export type ScoredMovie = MovieSummary & { score: number };

export type SimilarList = {
  movie_id: number;
  items: ScoredMovie[];
};

export type RecommendationList = {
  user_id: number;
  items: ScoredMovie[];
};

export type WatchedList = {
  user_id: number;
  items: MovieSummary[];
};

export type User = {
  id: number;
  name: string;
  email: string;
  created_at: string | null;
};
