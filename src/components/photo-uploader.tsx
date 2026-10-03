"use client";
import { Camera, Check } from "lucide-react";
import { useRef } from "react";
import { cn } from "./ui";

/** Resize in the browser (max 1280px, JPEG q=.72) so phone photos are ~150KB, not 6MB. */
async function toSmallJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function PhotoUploader({ label, value, existingUrl, onChange }: { label: string; value?: string; existingUrl?: string | null; onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const src = value || existingUrl || undefined;
  return (
    <button type="button" onClick={() => ref.current?.click()} className={cn("relative flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface-2 text-muted transition hover:border-brand-400", src && "border-solid")}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          <Camera className="mb-1 size-6" />
          <span className="text-xs font-semibold">{label}</span>
        </>
      )}
      {src && <span className="absolute right-2 top-2 rounded-full bg-emerald-600 p-1 text-white"><Check className="size-3.5" /></span>}
      {src && <span className="absolute bottom-0 inset-x-0 bg-black/50 py-1 text-xs font-semibold text-white">{label}</span>}
      <input
        ref={ref} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onChange(await toSmallJpeg(f));
          e.target.value = "";
        }}
      />
    </button>
  );
}
