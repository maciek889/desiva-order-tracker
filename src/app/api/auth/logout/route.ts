import { jsonResponse } from "@/lib/utils";

export async function POST() {
  const response = jsonResponse({ ok: true });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.set("Set-Cookie", `auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
  return response;
}
