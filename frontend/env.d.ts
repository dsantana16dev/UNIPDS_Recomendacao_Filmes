// O pacote @tailwindcss/vite (4.3.2) publica um `exports.types` apontando para
// ./dist/index.d.mts, mas esse arquivo não vem no tarball instalado — só o
// index.mjs. Sem isto, `tsc -b` (tsconfig.node → vite.config.ts) trata o import
// como `any` implícito e quebra o build. Declaração mínima para destravar.
declare module "@tailwindcss/vite" {
  import type { Plugin } from "vite";
  const tailwindcss: () => Plugin[];
  export default tailwindcss;
}
