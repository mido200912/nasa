import { habitatDetail } from "@/lib/server/fire-safety-routes";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return habitatDetail(request, id);
}
