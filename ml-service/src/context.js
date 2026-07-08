/**
 * Sprint 4 — makeContext()
 *
 * Constrói o "contexto" de feature engineering a partir do catálogo:
 *   - estatísticas dos campos numéricos (média/desvio) para normalização (z-score);
 *   - vocabulário de gêneros (multi-hot);
 *   - vocabulário dos idiomas mais frequentes (one-hot + "outros").
 *
 * O contexto é serializável (JSON) e é salvo junto do modelo treinado, para que
 * o encode em produção use exatamente a mesma normalização/vocabulário do treino.
 */

import { EMBEDDING_DIM } from "./embedder.js";

// Campos numéricos normalizados por z-score.
export const NUMERIC_FIELDS = ["release_year", "popularity", "vote_average", "runtime"];

// Quantos idiomas mais frequentes recebem dimensão própria (o resto vira "outros").
export const MAX_LANGUAGES = 15;

/**
 * @param {Array<object>} movies linhas do Postgres (id, release_year, popularity,
 *   vote_average, runtime, genres[], original_language)
 * @returns {object} contexto serializável
 */
export function makeContext(movies) {
  // --- Estatísticas numéricas (média/desvio) ---
  const numeric = {};
  for (const field of NUMERIC_FIELDS) {
    const values = movies
      .map((m) => m[field])
      .filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)))
      .map(Number);

    const n = values.length || 1;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance) || 1; // evita divisão por zero
    numeric[field] = { mean, std };
  }

  // --- Vocabulário de gêneros (ordenado, estável) ---
  const genreSet = new Set();
  for (const m of movies) for (const g of m.genres || []) genreSet.add(g);
  const genres = [...genreSet].sort();

  // --- Idiomas mais frequentes ---
  const langCount = new Map();
  for (const m of movies) {
    const l = m.original_language;
    if (l) langCount.set(l, (langCount.get(l) || 0) + 1);
  }
  const languages = [...langCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_LANGUAGES)
    .map(([lang]) => lang);

  // Dimensão do vetor de um filme: numéricos + gêneros + idiomas + "outros" + embedding.
  const movieDim =
    NUMERIC_FIELDS.length + genres.length + languages.length + 1 + EMBEDDING_DIM;

  return {
    numeric,
    genres,
    languages,
    embeddingDim: EMBEDDING_DIM,
    movieDim,
    inputDim: movieDim * 2, // concat(userVector, movieVector)
  };
}
