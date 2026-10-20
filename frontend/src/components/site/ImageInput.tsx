import { useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";

type Props = { value: string; onChange: (url: string) => void; testId: string; previewClass?: string; accept?: string };

/** Paste an image link or upload a file to object storage. */
export function ImageInput({ value, onChange, testId, previewClass = "h-20 w-32", accept = "image/png,image/jpeg,image/webp,image/gif" }: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "include" }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { url?: string; error?: string } | undefined;
    setBusy(false);
    if (!r?.ok || !d?.url) return toast.error(t(d?.error ?? "Upload failed. Please try again."));
    onChange(d.url);
    toast.success(t("Image uploaded"));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder={t("https://… or upload an image")} value={value} onChange={(e) => onChange(e.target.value)} data-testid={`${testId}-url`} />
        <input ref={ref} type="file" hidden accept={accept} data-testid={`${testId}-file`} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => ref.current?.click()} data-testid={`${testId}-upload`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />} {t("Upload")}
        </Button>
      </div>
      {value && <img src={value} alt="" className={`${previewClass} rounded-md border object-cover`} data-testid={`${testId}-preview`} />}
    </div>
  );
}
