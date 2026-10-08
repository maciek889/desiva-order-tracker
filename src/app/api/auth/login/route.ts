import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler } from "@/lib/utils";

export const POST = apiHandler(async (req) => {
  const { login, password } = await req.json();
  if (!login || !password) return errorResponse("Login i hasło są wymagane");

  const user = await prisma.user.findUnique({ where: { login } });
  if (!user) return errorResponse("Nieprawidłowy login lub hasło", 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return errorResponse("Nieprawidłowy login lub hasło", 401);

  const token = signToken({ id: user.id, login: user.login, role: user.role, hourlyRate: user.hourlyRate });

  const response = jsonResponse({
    user: { id: user.id, login: user.login, role: user.role, hourlyRate: user.hourlyRate },
  });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.set("Set-Cookie", `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}${secure}`);
  return response;
});
