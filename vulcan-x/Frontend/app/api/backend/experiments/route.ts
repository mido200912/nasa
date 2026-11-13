import { catalogCollection } from "@/lib/server/fire-safety-routes";

export async function GET(request: Request) {
  return catalogCollection(request, "/api/experiments", ["search", "discipline", "gravityCondition", "materialId", "page", "pageSize"]);
}
