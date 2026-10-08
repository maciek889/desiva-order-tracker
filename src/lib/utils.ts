import { NextRequest } from "next/server";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import type { UserRole } from "./types";

export function generateOrderId(): string {
  const bytes = crypto.randomBytes(6);
  const num = bytes.readUIntBE(0, 6) % 900000000000 + 100000000000;
  return String(num);
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// --- Server-side field visibility ---
// Mirrors RESTRICTED_FIELDS in lib/client.ts so restricted data never leaves the API,
// not just gets hidden in the UI.
type Redactable = Record<string, unknown> & { timeEntries?: Record<string, unknown>[] };

export function redactOrder<T extends Redactable>(order: T, role: UserRole): T {
  const out: Redactable = { ...order };
  if (role === "Worker") {
    delete out.client;
    delete out.price;
    delete out.notatki;
  }
  if (role !== "Admin") {
    delete out.totalCost;
    if (out.timeEntries) {
      out.timeEntries = out.timeEntries.map(({ cost: _cost, ...entry }) => entry);
    }
  }
  return out as T;
}

// --- API route handler wrapper ---
// Throw an ApiError for expected failures (validation, not found) — its message is sent to the client.
export class ApiError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// Errors thrown by requireAuth()
const AUTH_ERROR_STATUS: Record<string, number> = {
  Unauthorized: 401,
  Forbidden: 403,
};

type RouteHandler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

export function apiHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e: unknown) {
      if (e instanceof ApiError) return errorResponse(e.message, e.status);
      if (e instanceof Error && AUTH_ERROR_STATUS[e.message]) {
        return errorResponse(e.message, AUTH_ERROR_STATUS[e.message]);
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") return errorResponse("Rekord o tej wartości już istnieje", 409);
        if (e.code === "P2025") return errorResponse("Nie znaleziono rekordu", 404);
        // Foreign key violation, e.g. deleting a record that other records still reference
        if (e.code === "P2003") return errorResponse("Rekord jest powiązany z innymi danymi", 409);
        // Serializable transaction conflict
        if (e.code === "P2034") return errorResponse("Konflikt zapisu, spróbuj ponownie", 409);
      }
      // Wrongly typed input that reached a query (e.g. invalid enum value or date)
      if (e instanceof Prisma.PrismaClientValidationError) {
        return errorResponse("Nieprawidłowe dane", 400);
      }
      // Malformed JSON request body
      if (e instanceof SyntaxError) return errorResponse("Nieprawidłowy format danych", 400);
      // Unexpected error — log details server-side, never leak internals to the client
      console.error(`[${req.method} ${req.nextUrl.pathname}]`, e);
      return errorResponse("Internal server error", 500);
    }
  };
}
