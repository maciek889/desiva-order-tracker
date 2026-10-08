import { getAuthUser } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return errorResponse("Unauthorized", 401);
  return jsonResponse({ user });
}
