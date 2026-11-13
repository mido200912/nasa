import { proxyFireSafetyApi } from "@/lib/server/fire-safety-api";

export async function GET(request: Request) {
  return proxyFireSafetyApi(request, { method: "GET", path: "/api/environments" });
}
