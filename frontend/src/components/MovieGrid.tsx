import type { MovieSummary, ScoredMovie } from "../api/types";
import { MovieCard } from "./MovieCard";

type Item = MovieSummary | ScoredMovie;

function hasScore(m: Item): m is ScoredMovie {
  return "score" in m && typeof (m as ScoredMovie).score === "number";
}

export function MovieGrid({
  movies,
  scoreLabel,
}: {
  movies: Item[];
  scoreLabel?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {movies.map((m) => (
        <MovieCard
          key={m.id}
          movie={m}
          score={hasScore(m) ? m.score : undefined}
          scoreLabel={scoreLabel}
        />
      ))}
    </div>
  );
}
