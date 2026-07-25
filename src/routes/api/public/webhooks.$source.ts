import { createFileRoute } from "@tanstack/react-router";
import { dispatchWebhook } from "@/lib/core/webhooks";

// Universal webhook entry point. External services POST to
// /api/public/webhooks/:source. Handlers register via `registerWebhook(source, fn)`
// and own their signature verification.
export const Route = createFileRoute("/api/public/webhooks/$source")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const rawBody = await request.text();
        let body: unknown = rawBody;
        try { body = JSON.parse(rawBody); } catch { /* keep as text */ }
        return dispatchWebhook({
          source: params.source,
          headers: request.headers,
          body,
          rawBody,
        });
      },
    },
  },
});