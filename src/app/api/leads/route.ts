import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, apiHandler } from "@/lib/utils";

export const GET = apiHandler(async () => {
  await requireAuth(["Admin"]);
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });
  return jsonResponse(leads);
});

export const POST = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const body = await req.json();
  const { customerName, orderName, email, phoneNumber, notes, stage } = body;

  if (!customerName || !orderName) {
    return errorResponse("Imię i nazwisko klienta oraz nazwa zamówienia są wymagane");
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse("Nieprawidłowy format adresu e-mail");
  }

  if (phoneNumber && !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
    return errorResponse("Nieprawidłowy format numeru telefonu (wymagany format: +48...)");
  }

  const lead = await prisma.lead.create({
    data: {
      customerName,
      orderName,
      email: email || null,
      phoneNumber: phoneNumber || null,
      notes: notes || "",
      stage: stage || "Nowy",
    },
  });

  return jsonResponse(lead, 201);
});

export const DELETE = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const { id } = await req.json();

  if (!id) return errorResponse("ID leada jest wymagane");

  await prisma.lead.delete({ where: { id } });
  return jsonResponse({ ok: true });
});

export const PATCH = apiHandler(async (req) => {
  await requireAuth(["Admin"]);
  const body = await req.json();
  const { id, customerName, orderName, email, phoneNumber, notes, stage } = body;

  if (!id) return errorResponse("ID leada jest wymagane");

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse("Nieprawidłowy format adresu e-mail");
  }

  if (phoneNumber && !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
    return errorResponse("Nieprawidłowy format numeru telefonu (wymagany format: +48...)");
  }

  // Only allow updating specific fields
  const updateData: Record<string, string | null> = {};
  if (customerName !== undefined) updateData.customerName = customerName;
  if (orderName !== undefined) updateData.orderName = orderName;
  if (notes !== undefined) updateData.notes = notes;
  if (stage !== undefined) updateData.stage = stage;
  if (email !== undefined) updateData.email = email || null;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber || null;

  const lead = await prisma.lead.update({
    where: { id },
    data: updateData,
  });

  return jsonResponse(lead);
});
