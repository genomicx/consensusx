/// <reference types="vite/client" />

declare module '*.css' {}

declare module '/wasm/sparrowhawk.js' {
  const module: unknown
  export default module
}
