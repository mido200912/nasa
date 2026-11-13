import { buildStressTestResult, parseStressTestRequest, parseStressTestResult } from "@/lib/stress-test";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Simulation-Mode": "illustrative" };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });

async function boundedJson(body: ReadableStream<Uint8Array> | null, limit: number) {
  if (!body) throw new SyntaxError("Missing JSON");
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new RangeError("Body too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return error("Use application/json.", 415);
  let body: unknown;
  try { body = await boundedJson(request.body, 2048); }
  catch (cause) { return error(cause instanceof RangeError ? "Request body exceeds 2 KB." : "Invalid JSON body.", cause instanceof RangeError ? 413 : 400); }
  const input = parseStressTestRequest(body);
  if (!input) return error("Invalid scenario: check environment, material, and supported parameter ranges.", 400);

  // Set NEXT_PUBLIC_API_URL to the FastAPI origin (e.g. http://localhost:8000).
  // Keep the browser same-origin; proxying avoids CORS and never forwards cookies.
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!base) return Response.json(buildStressTestResult(input), { headers });
  let target: URL;
  try {
    target = new URL(`${base.replace(/\/+$/, "")}/api/v1/simulator/stress-test`);
    if (!["http:", "https:"].includes(target.protocol) || target.username || target.password || target.search || target.hash || target.href === request.url) throw new Error("Invalid backend");
  } catch { return error("Stress-test backend configuration is invalid.", 503); }
  try {
    const upstream = await fetch(target.href, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(input), cache: "no-store", redirect: "error", signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)]) });
    if (!upstream.ok) { await upstream.body?.cancel(); return error("Stress-test backend is unavailable.", 502); }
    const result = parseStressTestResult(await boundedJson(upstream.body, 32768));
    if (!result) return error("Stress-test backend returned an invalid result.", 502);
    return Response.json({ ...result, illustrative: true, disclaimer: "Unvalidated teaching preview. Suppression values are animation settings, not operational guidance. Research references are reading context, not validation." }, { headers });
  } catch { return error("Stress-test backend is unavailable or timed out.", 502); }
}
