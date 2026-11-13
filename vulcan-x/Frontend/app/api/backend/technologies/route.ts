import { catalogCollection } from "@/lib/server/fire-safety-routes";

export async function GET(request: Request) {
  return catalogCollection(request, "/api/technologies", ["search", "category", "domain", "page", "pageSize"]);
}
