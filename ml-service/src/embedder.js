import "@tensorflow/tfjs-node";
import * as use from "@tensorflow-models/universal-sentence-encoder";

// Universal Sentence Encoder → vetores de 512 dimensões.
export const EMBEDDING_DIM = 512;

let modelPromise = null;

/** Carrega o modelo USE uma única vez (lazy singleton). */
export function loadModel() {
  if (!modelPromise) {
    console.log("Carregando Universal Sentence Encoder…");
    modelPromise = use.load().then((m) => {
      console.log("USE carregado.");
      return m;
    });
  }
  return modelPromise;
}

/**
 * Gera embeddings para um array de textos.
 * @param {string[]} texts
 * @returns {Promise<number[][]>} matriz [n][512]
 */
export async function embed(texts) {
  const model = await loadModel();
  const embeddings = await model.embed(texts);
  const arr = await embeddings.array();
  embeddings.dispose();
  return arr;
}
