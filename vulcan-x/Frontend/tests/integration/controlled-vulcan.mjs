// TEST HARNESS ONLY. Never imported by the application or deployed as a route.
// Forwards successful answers from the actual local Vulcan-X; does not invent any.
import { createServer } from "node:http";

let active = 0;
let disconnected = 0;
createServer(async (request, response) => {
  if (request.url === "/metrics") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ active, disconnected })); return;
  }
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString();
  const json = JSON.parse(body);
  if (Object.keys(json).sort().join(",") !== "environment,question") throw new Error("Upstream contract changed");
  active++;
  const controller = new AbortController();
  response.on("close", () => { active--; if (!response.writableEnded) disconnected++; controller.abort(); });
  if (json.question.includes("M6_BLOCK")) return; // Wait until the caller/AI deadline closes the connection.
  try {
    if (json.question.includes("M6_DELAY")) await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 11_000);
      controller.signal.addEventListener("abort", () => { clearTimeout(timer); reject(controller.signal.reason); }, { once: true });
    });
    const upstream = await fetch("http://127.0.0.1:4000/api/v1/ai/query", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: controller.signal });
    response.writeHead(upstream.status, { "Content-Type": "application/json" });
    response.end(await upstream.text());
  } catch { if (!controller.signal.aborted) { response.writeHead(503); response.end(); } }
}).listen(4011, "127.0.0.1", () => console.log("Controlled upstream TEST HARNESS on loopback 4011; no fabricated answers"));
