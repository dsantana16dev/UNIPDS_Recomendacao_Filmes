/**
 * Sprint 4 — acesso a dados (Postgres + Qdrant) para o pipeline de ML.
 *
 * Reúne as leituras necessárias para treino e inferência:
 *   - catálogo de filmes (metadados) do Postgres;
 *   - avaliações do MovieLens (sinal de treino) do Postgres;
 *   - embeddings 512d dos filmes do Qdrant.
 */

import pg from "pg";
import { QdrantClient } from "@qdrant/js-client-rest";

export const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://movies:movies@postgres:5432/movies";
export const QDRANT_URL = process.env.QDRANT_URL || "http://qdrant:6333";
export const COLLECTION = "movies";

// Colunas usadas por encodeMovie() + hidratação para exibição.
const MOVIE_COLUMNS = `id, title, release_year, popularity, vote_average, runtime,
                       genres, original_language, poster_path`;

export function newQdrant() {
  return new QdrantClient({ url: QDRANT_URL });
}

/** Cliente único (scripts de vida curta). */
export async function newPgClient() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  return client;
}

/** Pool reutilizável (serviço de vida longa). */
let pool = null;
export function getPgPool() {
  if (!pool) pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });
  return pool;
}

/** Carrega filmes: todos, ou apenas os `ids` informados. */
export async function loadMovies(db, ids = null) {
  const query = ids
    ? { text: `SELECT ${MOVIE_COLUMNS} FROM movies WHERE id = ANY($1)`, values: [ids] }
    : { text: `SELECT ${MOVIE_COLUMNS} FROM movies` };
  const { rows } = await db.query(query);
  return rows;
}

/** Top-N filmes por popularidade (candidatos à recomendação). */
export async function loadPopularMovies(db, limit) {
  const { rows } = await db.query(
    `SELECT ${MOVIE_COLUMNS} FROM movies
      WHERE popularity IS NOT NULL
      ORDER BY popularity DESC NULLS LAST
      LIMIT $1`,
    [limit]
  );
  return rows;
}

/** Todas as avaliações (user_id, movie_id, rating). */
export async function loadRatings(db) {
  const { rows } = await db.query(`SELECT user_id, movie_id, rating FROM ratings`);
  return rows;
}

/** Avaliações de um único usuário. */
export async function loadUserRatings(db, userId) {
  const { rows } = await db.query(
    `SELECT movie_id, rating FROM ratings WHERE user_id = $1`,
    [userId]
  );
  return rows;
}

/**
 * Busca embeddings 512d no Qdrant para uma lista de ids de filme.
 * @returns {Promise<Map<number, number[]>>} id → vetor
 */
export async function fetchEmbeddings(qdrant, ids) {
  const map = new Map();
  const BATCH = 256;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const points = await qdrant.retrieve(COLLECTION, {
      ids: chunk,
      with_vector: true,
      with_payload: false,
    });
    for (const p of points) map.set(Number(p.id), p.vector);
  }
  return map;
}
