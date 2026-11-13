import { catalogDetail } from "@/lib/server/fire-safety-routes";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return catalogDetail(request, "/api/technologies", id);
}
