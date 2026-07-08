/**
 * Sprint 4 — Treino do modelo de recomendação (TensorFlow.js).
 *
 * Pipeline (conforme DDD):
 *   makeContext() → encodeMovie() → encodeUser() → createTrainingData()
 *     → model.fit() → salva modelo + contexto
 *
 * Sinal de treino: avaliações do MovieLens (rating >= 4 → "gostou" = 1, senão 0).
 * O perfil do usuário em cada exemplo exclui o próprio filme avaliado (evita
 * vazamento de rótulo).
 *
 * Uso (dentro do container, com Postgres e Qdrant no ar e a coleção indexada):
 *     docker compose exec ml-service npm run train
 */

import * as tf from "@tensorflow/tfjs-node";

import {
  newPgClient,
  newQdrant,
  loadMovies,
  loadRatings,
  fetchEmbeddings,
} from "../src/data.js";
import { makeContext } from "../src/context.js";
import { encodeMovie, concatUserMovie } from "../src/encode.js";
import { buildModel, saveModel } from "../src/model.js";

const LIKED_THRESHOLD = 4.0;
const EPOCHS = Number(process.env.EPOCHS || 10);
const BATCH = 256;
const VAL_SPLIT = 0.1;
const SHUFFLE_BUFFER = 10000;

/** Embaralhamento in-place (Fisher-Yates). */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Perfil do usuário para um exemplo de treino.
 * Se o filme é curtido (label 1) ele participa do somatório → removemos para
 * não vazar o rótulo.
 */
function userVectorForExample(stat, movieVec, label, dim) {
  const out = new Float32Array(dim);
  if (!stat || stat.count === 0) return out; // cold-start
  if (label === 1) {
    if (stat.count <= 1) return out; // o único curtido é o próprio filme
    for (let i = 0; i < dim; i++) out[i] = (stat.sum[i] - movieVec[i]) / (stat.count - 1);
  } else {
    for (let i = 0; i < dim; i++) out[i] = stat.sum[i] / stat.count;
  }
  return out;
}

async function main() {
  console.log("→ Conectando ao Postgres e Qdrant…");
  const db = await newPgClient();
  const qdrant = newQdrant();

  // 1) makeContext() a partir do catálogo completo.
  console.log("→ makeContext(): lendo catálogo…");
  const allMovies = await loadMovies(db);
  const context = makeContext(allMovies);
  console.log(
    `   contexto: ${context.genres.length} gêneros, ${context.languages.length} idiomas, ` +
      `movieDim=${context.movieDim}, inputDim=${context.inputDim}`
  );
  const movieById = new Map(allMovies.map((m) => [m.id, m]));

  // 2) Avaliações + embeddings dos filmes avaliados.
  console.log("→ Carregando avaliações…");
  const ratings = await loadRatings(db);
  console.log(`   ${ratings.length} avaliações.`);

  const ratedIds = [...new Set(ratings.map((r) => Number(r.movie_id)))];
  console.log(`→ Buscando embeddings de ${ratedIds.length} filmes avaliados no Qdrant…`);
  const embeddings = await fetchEmbeddings(qdrant, ratedIds);

  // 3) encodeMovie() para cada filme avaliado que tem embedding.
  const movieEnc = new Map();
  for (const id of ratedIds) {
    const movie = movieById.get(id);
    const emb = embeddings.get(id);
    if (movie && emb) movieEnc.set(id, encodeMovie(movie, context, emb));
  }
  console.log(`   ${movieEnc.size} filmes codificados (com embedding).`);

  // 4) Somatório do perfil por usuário (apenas filmes curtidos).
  const userStats = new Map(); // userId → { sum: Float32Array, count }
  for (const r of ratings) {
    if (Number(r.rating) < LIKED_THRESHOLD) continue;
    const movieVec = movieEnc.get(Number(r.movie_id));
    if (!movieVec) continue;
    let stat = userStats.get(Number(r.user_id));
    if (!stat) {
      stat = { sum: new Float32Array(context.movieDim), count: 0 };
      userStats.set(Number(r.user_id), stat);
    }
    for (let i = 0; i < context.movieDim; i++) stat.sum[i] += movieVec[i];
    stat.count++;
  }

  // 5) createTrainingData(): lista de exemplos (userId, movieId, label).
  const examples = [];
  let positives = 0;
  for (const r of ratings) {
    const movieId = Number(r.movie_id);
    if (!movieEnc.has(movieId)) continue;
    const label = Number(r.rating) >= LIKED_THRESHOLD ? 1 : 0;
    positives += label;
    examples.push({ userId: Number(r.user_id), movieId, label });
  }
  shuffle(examples);
  const nVal = Math.floor(examples.length * VAL_SPLIT);
  const valEx = examples.slice(0, nVal);
  const trainEx = examples.slice(nVal);
  console.log(
    `   ${examples.length} exemplos (${positives} positivos / ` +
      `${examples.length - positives} negativos) → treino ${trainEx.length}, val ${valEx.length}`
  );

  // Gerador tf.data (streaming — evita materializar todos os xs em memória).
  const makeGen = (list) =>
    function* () {
      for (const ex of list) {
        const movieVec = movieEnc.get(ex.movieId);
        const userVec = userVectorForExample(
          userStats.get(ex.userId),
          movieVec,
          ex.label,
          context.movieDim
        );
        yield { xs: Array.from(concatUserMovie(userVec, movieVec)), ys: [ex.label] };
      }
    };

  const trainDs = tf.data.generator(makeGen(trainEx)).shuffle(SHUFFLE_BUFFER).batch(BATCH);
  const valDs = tf.data.generator(makeGen(valEx)).batch(BATCH);

  // 6) Treino.
  console.log(`→ Treinando (${EPOCHS} épocas, batch ${BATCH})…`);
  const model = buildModel(context.inputDim);
  model.summary();
  await model.fitDataset(trainDs, {
    epochs: EPOCHS,
    validationData: valDs,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(
          `   época ${epoch + 1}/${EPOCHS} — loss ${logs.loss.toFixed(4)} ` +
            `acc ${logs.acc.toFixed(4)} | val_loss ${logs.val_loss.toFixed(4)} ` +
            `val_acc ${logs.val_acc.toFixed(4)}`
        );
      },
    },
  });

  // 7) Persistência.
  await saveModel(model, context);
  console.log("\n✅ Modelo treinado e salvo. Use POST /recommend para recomendar.");

  await db.end();
}

main().catch((err) => {
  console.error("Falha no treino:", err);
  process.exit(1);
});
