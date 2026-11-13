import { buildStressTestResult, parseStressTestRequest } from "@/lib/stress-test";

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

  return Response.json(buildStressTestResult(input), { headers });
}
