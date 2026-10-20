import { createFileRoute } from "@tanstack/react-router";
import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/auth.server";
import { exec } from "@/lib/db.server";
import { APP_PREFIX, putObject } from "@/lib/storage.server";

const TYPES: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
  "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico",
};
const MAX = 5 * 1024 * 1024;

export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await currentUser();
        if (!user || user.role === "buyer") return Response.json({ error: "Only sellers and admins can upload images." }, { status: 401 });
        const file = (await request.formData().catch(() => null))?.get("file");
        if (!(file instanceof File)) return Response.json({ error: "Choose an image file." }, { status: 400 });
        const ext = TYPES[file.type];
        if (!ext) return Response.json({ error: "Use a PNG, JPG, WEBP, GIF or ICO image." }, { status: 400 });
        if (file.size > MAX) return Response.json({ error: "The image must be 5 MB or smaller." }, { status: 413 });
        try {
          const r = await putObject(`${APP_PREFIX}/uploads/${user.id}/${randomUUID()}.${ext}`, new Uint8Array(await file.arrayBuffer()), file.type);
          await exec("INSERT INTO uploads (id, storage_path, original_name, content_type, size_bytes, uploader_id) VALUES (?, ?, ?, ?, ?, ?)",
            [randomUUID(), r.path, file.name.slice(0, 255), file.type, file.size, user.id]);
          return Response.json({ url: `/api/files/${r.path}` });
        } catch (e) {
          console.error("[upload]", e);
          return Response.json({ error: "Upload failed. Please try again." }, { status: 502 });
        }
      },
    },
  },
});
