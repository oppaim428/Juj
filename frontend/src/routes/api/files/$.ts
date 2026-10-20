import { createFileRoute } from "@tanstack/react-router";
import { one } from "@/lib/db.server";
import { getObject } from "@/lib/storage.server";

export const Route = createFileRoute("/api/files/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";
        const rec = await one<{ content_type: string }>("SELECT content_type FROM uploads WHERE storage_path = ? AND is_deleted = 0", [path]);
        if (!rec) return new Response("Not found", { status: 404 });
        const obj = await getObject(path);
        if (!obj) return new Response("Not found", { status: 404 });
        return new Response(obj.body, { headers: { "content-type": rec.content_type, "cache-control": "public, max-age=31536000, immutable" } });
      },
    },
  },
});
