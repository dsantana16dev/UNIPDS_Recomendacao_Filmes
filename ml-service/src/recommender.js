/**
 * Sprint 4 — recommend()
 *
 * Gera recomendações personalizadas para um usuário:
 *   1. monta o perfil do usuário (encodeUser) a partir dos filmes que ele curtiu;
 *   2. pontua um pool de filmes candidatos com o modelo treinado;
 *   3. remove os já vistos e devolve o top-N ranqueado.
 *
 * Modelo, contexto e o pool de candidatos são carregados uma única vez (lazy)
 * e reaproveitados entre requisições.
 */

import * as tf from "@tensorflow/tfjs-node";

import {
  getPgPool,
  newQdrant,
  loadMovies,
  loadPopularMovies,
  loadUserRatings,
  fetchEmbeddings,
} from "./data.js";
import { encodeMovie, encodeUser, concatUserMovie } from "./encode.js";
import { loadModel, modelExists } from "./model.js";

const LIKED_THRESHOLD = 4.0; // rating >= 4 → "gostou"
const DEFAULT_CANDIDATES = Number(process.env.REC_CANDIDATES || 3000);

let recommender = null; // { model, context }
let candidates = null; // { matrix: tf.Tensor2D, meta: [], size }

class ModelNotTrainedError extends Error {
  constructor() {
    super("Modelo de recomendação não treinado.");
    this.code = "MODEL_NOT_TRAINED";
  }
}

async function ensureLoaded() {
  if (recommender) return recommender;
  if (!modelExists()) throw new ModelNotTrainedError();
  recommender = await loadModel();
  return recommender;
}

/** Monta (uma vez) a matriz de vetores dos filmes candidatos. */
async function ensureCandidates(context, poolSize) {
  if (candidates && candidates.size === poolSize) return candidates;

  const pool = getPgPool();
  const qdrant = newQdrant();

  const movies = await loadPopularMovies(pool, poolSize);
  const embeddings = await fetchEmbeddings(qdrant, movies.map((m) => m.id));

  const meta = [];
  const rows = [];
  for (const m of movies) {
    const emb = embeddings.get(m.id);
    if (!emb) continue; // sem embedding → fora do pool
    rows.push(encodeMovie(m, context, emb));
    meta.push({
      id: m.id,
      title: m.title,
      release_year: m.release_year,
      popularity: m.popularity,
      poster_path: m.poster_path,
    });
  }

  const flat = new Float32Array(rows.length * context.movieDim);
  rows.forEach((v, i) => flat.set(v, i * context.movieDim));

  candidates?.matrix.dispose();
  candidates = {
    matrix: tf.tensor2d(flat, [rows.length, context.movieDim]),
    meta,
    size: poolSize,
  };
  return candidates;
}

/** Perfil do usuário a partir dos filmes que ele curtiu (rating >= 4). */
async function buildUserVector(context, likedIds) {
  if (!likedIds.length) return encodeUser([], context.movieDim); // cold-start

  const pool = getPgPool();
  const qdrant = newQdrant();
  const [movies, embeddings] = await Promise.all([
    loadMovies(pool, likedIds),
    fetchEmbeddings(qdrant, likedIds),
  ]);

  const vecs = [];
  for (const m of movies) {
    const emb = embeddings.get(m.id);
    if (emb) vecs.push(encodeMovie(m, context, emb));
  }
  return encodeUser(vecs, context.movieDim);
}

/** Pontua o pool de candidatos com o perfil do usuário e devolve o top-N. */
async function scoreCandidates(model, context, userVec, seen, limit, poolSize) {
  const { matrix, meta } = await ensureCandidates(context, poolSize);

  // Pontua todos os candidatos de uma vez: concat(userVec, movieVec) → sigmoid.
  const scoresT = tf.tidy(() => {
    const u = tf.tensor2d([Array.from(userVec)]); // [1, movieDim]
    const input = tf.concat([u.tile([matrix.shape[0], 1]), matrix], 1);
    return model.predict(input).squeeze(); // [N]
  });
  const scores = await scoresT.data();
  scoresT.dispose();

  return meta
    .map((m, i) => ({ ...m, score: scores[i] }))
    .filter((m) => !seen.has(m.id)) // não recomenda o que já viu
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((m) => ({ ...m, score: Number(m.score.toFixed(4)) }));
}

/**
 * Recomenda a partir de listas explícitas de filmes curtidos/vistos.
 * Usado pelo backend para usuários reais do app (desacoplado do storage).
 *
 * @param {number[]} likedIds filmes que compõem o perfil de gosto
 * @param {number[]} seenIds  filmes a excluir do resultado
 * @param {{limit?: number, candidatePool?: number}} opts
 */
export async function recommendForLiked(likedIds, seenIds = [], opts = {}) {
  const limit = opts.limit ?? 10;
  const poolSize = opts.candidatePool ?? DEFAULT_CANDIDATES;

  const { model, context } = await ensureLoaded();
  const userVec = await buildUserVector(context, (likedIds || []).map(Number));
  const seen = new Set((seenIds || []).map(Number));
  return scoreCandidates(model, context, userVec, seen, limit, poolSize);
}

/**
 * Recomenda para um usuário do dataset MovieLens (lê o gosto da tabela ratings).
 * Mantido para testes; o app usa recommendForLiked().
 *
 * @param {number} userId
 * @param {{limit?: number, candidatePool?: number}} opts
 */
export async function recommend(userId, opts = {}) {
  const pool = getPgPool();
  const ratings = await loadUserRatings(pool, userId);
  const seenIds = ratings.map((r) => Number(r.movie_id));
  const likedIds = ratings
    .filter((r) => Number(r.rating) >= LIKED_THRESHOLD)
    .map((r) => Number(r.movie_id));
  return recommendForLiked(likedIds, seenIds, opts);
}
