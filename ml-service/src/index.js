import express from "express";
import * as tf from "@tensorflow/tfjs-node";

import { embed, EMBEDDING_DIM } from "./embedder.js";

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

// Placeholder do pipeline de recomendação — implementação real no Sprint 4.
app.post("/recommend", (_req, res) => {
  res.status(501).json({
    status: "not_implemented",
    message: "Pipeline de recomendação será implementado no Sprint 4.",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ml-service ouvindo na porta ${PORT} — TensorFlow.js ${tf.version.tfjs}`);
});
