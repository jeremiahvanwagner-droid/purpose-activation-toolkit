// Lets `node --test` load the app's TypeScript modules as written: extensionless
// relative imports and the "@/..." alias resolve to .ts files. Node strips the
// types itself (Node 22.18+/24). Used by `npm test`.
import { register } from "node:module";

register("./ts-resolve-hooks.mjs", import.meta.url);
