import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const standalone = resolve(".next/standalone");
const server = resolve(standalone, "server.js");
if (!existsSync(server)) throw new Error("Production build missing. Run npm run build first.");
// Generated output only; no environment files/configuration are copied.
cpSync(resolve(".next/static"), resolve(standalone, ".next/static"), { recursive: true });
cpSync(resolve("public"), resolve(standalone, "public"), { recursive: true });
process.env.HOSTNAME ??= "127.0.0.1";
await import(pathToFileURL(server).href);
