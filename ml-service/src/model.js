/**
 * Sprint 4 — definição, persistência e carregamento do modelo (TensorFlow.js).
 *
 * Rede (conforme DDD):
 *   Input → Dense(128) → Dense(64) → Dense(32) → Dense(1, sigmoid)
 *   Loss: Binary Crossentropy   Optimizer: Adam
 *
 * O modelo e o contexto (context.json) são salvos em MODEL_DIR — montado como
 * volume no docker-compose para sobreviver a rebuilds do container.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as tf from "@tensorflow/tfjs-node";

const HERE = path.dirname(fileURLToPath(import.meta.url)); // .../src
export const MODEL_DIR =
  process.env.MODEL_DIR || path.resolve(HERE, "..", "models", "recommender");
export const CONTEXT_PATH = path.join(MODEL_DIR, "context.json");
export const MODEL_JSON = path.join(MODEL_DIR, "model.json");

/** Constrói a rede de classificação binária "gostou / não gostou". */
export function buildModel(inputDim) {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [inputDim], units: 128, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.compile({
    optimizer: tf.train.adam(1e-3),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });
  return model;
}

/** Salva modelo + contexto no disco. */
export async function saveModel(model, context) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
  await model.save("file://" + MODEL_DIR);
  fs.writeFileSync(CONTEXT_PATH, JSON.stringify(context));
}

/** Há um modelo treinado disponível? */
export function modelExists() {
  return fs.existsSync(MODEL_JSON) && fs.existsSync(CONTEXT_PATH);
}

/** Carrega modelo + contexto do disco. */
export async function loadModel() {
  const model = await tf.loadLayersModel("file://" + MODEL_JSON);
  const context = JSON.parse(fs.readFileSync(CONTEXT_PATH, "utf8"));
  return { model, context };
}
