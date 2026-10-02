"use client";

import { adminBrowserClient } from "@/lib/celebration/browser";

const BUCKET = "memorial-photos";
const MAX_EDGE = 1600;

/**
 * Shrinks a phone photo (often 4–8 MB) to a ~1600px JPEG before upload so
 * the public page loads quickly over a cellular connection. Falls back to
 * the original file if the browser can't decode it (e.g. some HEIC files).
 */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Uploads a photo to the public memorial-photos bucket (admins only, per storage RLS) and returns its URL. */
export async function uploadMemorialPhoto(eventId: string, file: File): Promise<string> {
  const body = await shrink(file);
  const ext = body.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
  const supabase = adminBrowserClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: body.type || file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
