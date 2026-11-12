import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const publicDirectory = new URL("../public/", import.meta.url);
await Promise.all(["models/", "textures/"].map((directory) => mkdir(new URL(directory, publicDirectory), { recursive: true })));

// Solar System Scope's 2K maps are CC BY 4.0. Procedural rendering needs none of these files.
const assets = [
  { name: "moon", url: "https://www.solarsystemscope.com/textures/download/2k_moon.jpg" },
  { name: "mars", url: "https://www.solarsystemscope.com/textures/download/2k_mars.jpg" },
  { name: "earth", url: "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg" },
];

const manifest = await Promise.all(assets.map(async ({ name, url }) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.headers.get("content-type")?.startsWith("image/")) throw new Error("Response is not an image");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 12_000_000) throw new Error("Asset exceeds 12 MB limit");
    const destination = new URL(`textures/${name}.jpg`, publicDirectory);
    await writeFile(destination, bytes);
    console.log(`Downloaded ${name}: ${bytes.length} bytes → ${fileURLToPath(destination)}`);
    return { name, url, status: "downloaded", bytes: bytes.length };
  } catch (error) {
    console.warn(`${name}: ${error instanceof Error ? error.message : "download failed"}; procedural shader remains available.`);
    return { name, url, status: "procedural-fallback" };
  }
}));

await writeFile(new URL("textures/download-manifest.json", publicDirectory), JSON.stringify({
  attribution: "Solar System Scope, CC BY 4.0, https://www.solarsystemscope.com/textures/",
  rendering: "Procedural GLSL is always primary; downloaded assets are optional reference maps.",
  assets: manifest,
}, null, 2));
