/**
 * Sprint 4 — encodeMovie() / encodeUser()
 *
 * encodeMovie: transforma um filme (metadados + embedding 512d) num vetor denso.
 * encodeUser:  perfil de gosto = média dos vetores dos filmes assistidos
 *              (cold-start = vetor de zeros).
 */

import { EMBEDDING_DIM } from "./embedder.js";
import { NUMERIC_FIELDS } from "./context.js";

/**
 * Codifica um filme num Float32Array de tamanho `context.movieDim`.
 *
 * Layout: [ numéricos(z-score) | gêneros(multi-hot) | idioma(one-hot)+outros | embedding(512) ]
 *
 * @param {object} movie      metadados do filme
 * @param {object} context    saída de makeContext()
 * @param {number[]} embedding vetor USE 512d (ou null → zeros)
 * @returns {Float32Array}
 */
export function encodeMovie(movie, context, embedding) {
  const { numeric, genres, languages } = context;
  const out = new Float32Array(context.movieDim);
  let k = 0;

  // Numéricos normalizados (z-score, com clipping p/ conter outliers).
  for (const field of NUMERIC_FIELDS) {
    const v = movie[field];
    if (v === null || v === undefined || Number.isNaN(Number(v))) {
      out[k++] = 0; // ausente → média (0 no espaço z-score)
    } else {
      const { mean, std } = numeric[field];
      let z = (Number(v) - mean) / (std || 1);
      out[k++] = Math.max(-5, Math.min(5, z));
    }
  }

  // Gêneros (multi-hot).
  const movieGenres = new Set(movie.genres || []);
  for (const g of genres) out[k++] = movieGenres.has(g) ? 1 : 0;

  // Idioma (one-hot) + dimensão "outros".
  let matched = false;
  for (const lang of languages) {
    const hit = movie.original_language === lang;
    if (hit) matched = true;
    out[k++] = hit ? 1 : 0;
  }
  out[k++] = matched ? 0 : 1;

  // Embedding semântico (512d).
  const emb = embedding || EMPTY_EMBEDDING;
  for (let i = 0; i < EMBEDDING_DIM; i++) out[k++] = emb[i] ?? 0;

  return out;
}

const EMPTY_EMBEDDING = new Float32Array(EMBEDDING_DIM);

/**
 * Média elemento-a-elemento de vários vetores de filme.
 * Retorna zeros (cold-start) quando não há filmes.
 */
export function meanVectors(vectors, dim) {
  const out = new Float32Array(dim);
  if (!vectors.length) return out;
  for (const v of vectors) for (let i = 0; i < dim; i++) out[i] += v[i];
  for (let i = 0; i < dim; i++) out[i] /= vectors.length;
  return out;
}

/** Perfil do usuário = média dos vetores dos filmes que ele curtiu. */
export function encodeUser(movieVectors, dim) {
  return meanVectors(movieVectors, dim);
}

/** Concatena o vetor do usuário com o vetor do filme (entrada do modelo). */
export function concatUserMovie(userVec, movieVec) {
  const out = new Float32Array(userVec.length + movieVec.length);
  out.set(userVec, 0);
  out.set(movieVec, userVec.length);
  return out;
}
