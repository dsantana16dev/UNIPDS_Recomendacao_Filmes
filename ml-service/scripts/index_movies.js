/**
 * Sprint 3 — Indexação vetorial.
 *
 * Lê os filmes do PostgreSQL, gera embeddings (Universal Sentence Encoder, 512d)
 * a partir do texto do filme e faz upsert dos vetores na coleção do Qdrant.
 *
 * Uso (dentro do container, com Postgres e Qdrant no ar):
 *     docker compose exec ml-service npm run index
 *
 * Variáveis de ambiente:
 *     DATABASE_URL   (default: postgres://movies:movies@postgres:5432/movies)
 *     QDRANT_URL     (default: http://qdrant:6333)
 */

import pg from "pg";
import { QdrantClient } from "@qdrant/js-client-rest";

import { embed, EMBEDDING_DIM, loadModel } from "../src/embedder.js";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://movies:movies@postgres:5432/movies";
const QDRANT_URL = process.env.QDRANT_URL || "http://qdrant:6333";
const COLLECTION = "movies";
const BATCH = 128; // textos embutidos por lote

/** Monta o "documento" textual do filme para o embedding. */
function movieText(m) {
  const parts = [
    m.title,
    m.overview || "",
    m.genres?.length ? `Gêneros: ${m.genres.join(", ")}.` : "",
    m.keywords?.length ? `Temas: ${m.keywords.slice(0, 10).join(", ")}.` : "",
    m.director ? `Diretor: ${m.director}.` : "",
    m.cast?.length ? `Elenco: ${m.cast.slice(0, 5).join(", ")}.` : "",
  ];
  return parts.filter(Boolean).join(" ").slice(0, 1000);
}

async function main() {
  console.log("Conectando ao Postgres…");
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  const qdrant = new QdrantClient({ url: QDRANT_URL });

  // (Re)cria a coleção — idempotente.
  console.log(`Recriando coleção '${COLLECTION}' (${EMBEDDING_DIM}d, Cosine)…`);
  await qdrant.deleteCollection(COLLECTION).catch(() => {});
  await qdrant.createCollection(COLLECTION, {
    vectors: { size: EMBEDDING_DIM, distance: "Cosine" },
  });

  await loadModel(); // baixa o USE antes de começar

  const { rows } = await client.query(
    `SELECT id, title, overview, genres, keywords, director, "cast",
            release_year, popularity, poster_path
       FROM movies`
  );
  console.log(`${rows.length} filmes para indexar.`);

  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const vectors = await embed(batch.map(movieText));

    await qdrant.upsert(COLLECTION, {
      points: batch.map((m, j) => ({
        id: m.id,
        vector: vectors[j],
        payload: {
          title: m.title,
          release_year: m.release_year,
          popularity: m.popularity,
          poster_path: m.poster_path,
          genres: m.genres,
        },
      })),
    });

    done += batch.length;
    if (done % (BATCH * 10) === 0 || done === rows.length) {
      console.log(`  ${done}/${rows.length} indexados`);
    }
  }

  const info = await qdrant.getCollection(COLLECTION);
  console.log(`\n✅ Indexação concluída — ${info.points_count} pontos na coleção '${COLLECTION}'.`);

  await client.end();
}

main().catch((err) => {
  console.error("Falha na indexação:", err);
  process.exit(1);
});
