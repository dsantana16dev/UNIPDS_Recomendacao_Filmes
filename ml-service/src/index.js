import express from "express";
import * as tf from "@tensorflow/tfjs-node";

import { embed, EMBEDDING_DIM } from "./embedder.js";
import { recommend, recommendForLiked } from "./recommender.js";
import { modelExists } from "./model.js";

const app = express();
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3001;

// Healthcheck — confirma que o runtime TensorFlow.js está ativo.
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ml-service",
    tfjs_version: tf.version.tfjs,
    backend: tf.getBackend(),
    embedding_dim: EMBEDDING_DIM,
    model_trained: modelExists(),
  });
});

// Gera embeddings (512d) para textos — usado na indexação e por outros serviços.
app.post("/embed", async (req, res) => {
  const texts = req.body?.texts;
  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: "Envie { texts: string[] }" });
  }
  try {
    const vectors = await embed(texts);
    res.json({ dim: EMBEDDING_DIM, vectors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Falha ao gerar embeddings" });
  }
});

// Recomendações personalizadas (Sprint 4/5).
// Aceita { likedMovieIds, seenMovieIds } (usuário real, via backend) OU
// { userId } (usuário do dataset MovieLens, para testes).
app.post("/recommend", async (req, res) => {
  const { userId, likedMovieIds, seenMovieIds } = req.body || {};
  const limit = Number(req.body?.limit) || 10;
  try {
    if (Array.isArray(likedMovieIds)) {
      const items = await recommendForLiked(likedMovieIds, seenMovieIds || [], { limit });
      return res.json({ count: items.length, items });
    }
    if (Number.isInteger(Number(userId))) {
      const items = await recommend(Number(userId), { limit });
      return res.json({ userId: Number(userId), count: items.length, items });
    }
    return res
      .status(400)
      .json({ error: "Envie { likedMovieIds: number[] } ou { userId: number }" });
  } catch (err) {
    if (err.code === "MODEL_NOT_TRAINED") {
      return res.status(503).json({
        error: "Modelo não treinado — rode: docker compose exec ml-service npm run train",
      });
    }
    console.error(err);
    res.status(500).json({ error: "Falha ao gerar recomendações" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ml-service ouvindo na porta ${PORT} — TensorFlow.js ${tf.version.tfjs}`);
});
