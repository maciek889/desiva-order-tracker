import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler } from "@/lib/utils";

export const GET = apiHandler(async () => {
  await requireAuth(["Admin"]);
  const users = await prisma.user.findMany({
    select: { id: true, login: true, role: true, hourlyRate: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return jsonResponse(users);
});

export const POST = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { login, password, role, hourlyRate } = await req.json();
  if (!login || !password) return errorResponse("Login i hasło są wymagane");
  if (typeof login !== "string" || login.length < 2 || login.length > 50) return errorResponse("Login musi mieć 2-50 znaków");
  if (typeof password !== "string" || password.length < 4) return errorResponse("Hasło musi mieć min. 4 znaki");
  if (role && !["Admin", "Office", "Worker"].includes(role)) return errorResponse("Nieprawidłowa rola");
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { login, password: hashed, role: role || "Worker", hourlyRate: parseFloat(hourlyRate) || 0 },
    select: { id: true, login: true, role: true, hourlyRate: true },
  });
  return jsonResponse(user, 201);
});

export const PUT = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { id, login, password, role, hourlyRate } = await req.json();
  if (!id) return errorResponse("ID jest wymagane");
  if (login !== undefined && (typeof login !== "string" || login.length < 2 || login.length > 50)) return errorResponse("Login musi mieć 2-50 znaków");
  if (password && (typeof password !== "string" || password.length < 4)) return errorResponse("Hasło musi mieć min. 4 znaki");
  if (role && !["Admin", "Office", "Worker"].includes(role)) return errorResponse("Nieprawidłowa rola");
  const data: Prisma.UserUpdateInput = {};
  if (login) data.login = login;
  if (password) data.password = await bcrypt.hash(password, 10);
  if (role) data.role = role;
  if (hourlyRate !== undefined) data.hourlyRate = parseFloat(hourlyRate) || 0;
  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, login: true, role: true, hourlyRate: true },
  });
  return jsonResponse(user);
});

export const DELETE = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { id } = await req.json();
  if (!id || typeof id !== "string") return errorResponse("ID jest wymagane");
  // Logged work time is part of order history and cost reports, so it must not disappear
  const entryCount = await prisma.timeEntry.count({ where: { userId: id } });
  if (entryCount > 0) {
    return errorResponse(`Nie można usunąć użytkownika — ma zarejestrowany czas pracy (${entryCount} wpisów)`, 409);
  }
  await prisma.user.delete({ where: { id } });
  return jsonResponse({ ok: true });
});
