import express from "express";
import * as tf from "@tensorflow/tfjs-node";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Healthcheck — confirma que o runtime TensorFlow.js está ativo.
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ml-service",
    tfjs_version: tf.version.tfjs,
    backend: tf.getBackend(),
  });
});

// Placeholder do pipeline de ML — implementação real entra no Sprint 4:
// makeContext() -> encodeMovie() -> encodeUser() -> createTrainingData() -> model.fit()
app.post("/recommend", (_req, res) => {
  res.status(501).json({
    status: "not_implemented",
    message: "Pipeline de recomendação será implementado no Sprint 4.",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ml-service ouvindo na porta ${PORT} — TensorFlow.js ${tf.version.tfjs}`);
});
