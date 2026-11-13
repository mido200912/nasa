import { proxyFireSafetyApi } from "@/lib/server/fire-safety-api";
export async function GET(request: Request) {
  const response = await proxyFireSafetyApi(request, { method: "GET", path: "/health/ready" });
  // Public readiness never discloses dependency names, addresses or exception details.
  return Response.json({ status: response.ok ? "ready" : "unavailable" }, {
    status: response.ok ? 200 : 503, headers: { "Cache-Control": "no-store" },
  });
}
