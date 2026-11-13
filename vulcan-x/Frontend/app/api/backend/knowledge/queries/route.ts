import { jsonPost } from "@/lib/server/fire-safety-routes";

export async function POST(request: Request) {
  return jsonPost(request, "/api/knowledge/queries");
}
