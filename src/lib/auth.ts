import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { UserRole } from "./types";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const SECRET = process.env.JWT_SECRET;

export interface AuthUser {
  id: string;
  login: string;
  role: UserRole;
  hourlyRate: number;
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, login: user.login, role: user.role, hourlyRate: user.hourlyRate }, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, SECRET) as AuthUser;
  } catch {
    return null;
  }
}

// The token only proves identity. Role and hourly rate are always read from the database,
// so role changes and deleted accounts take effect immediately instead of when the token expires.
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload?.id) return null;
  return prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, login: true, role: true, hourlyRate: true },
  });
}

export async function requireAuth(roles?: UserRole[]): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  if (roles && !roles.includes(user.role)) throw new Error("Forbidden");
  return user;
}
