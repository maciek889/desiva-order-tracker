import { requireAuth } from "@/lib/auth";
import { eventBus, type AppEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const events: AppEvent[] = ["timers:changed", "orders:changed"];

      const listeners = events.map((event) => {
        const listener = () => {
          try {
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          } catch {
            // Client disconnected
          }
        };
        eventBus.on(event, listener);
        return { event, listener };
      });

      // Send keepalive every 30s to prevent proxy timeouts
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 30000);

      // Send initial connection confirmation
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Cleanup on close
      const checkClosed = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(""));
        } catch {
          clearInterval(checkClosed);
          clearInterval(keepalive);
          listeners.forEach(({ event, listener }) => eventBus.off(event, listener));
        }
      }, 60000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
