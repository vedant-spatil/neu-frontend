import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "../auth/session";
import { useMe } from "../auth/useAuth";
import { API_BASE } from "./client";

const MAX_SIDE = 256; // pixels; the server accepts up to 2 MB, a resized picture is far smaller

/**
 * Scales a picture so its longest side is at most MAX_SIDE, and returns it as a JPEG. Transparent areas are filled
 * white first, so a PNG with transparency does not turn black. The server accepts PNG or JPEG; JPEG is the smaller.
 */
export async function shrinkPicture(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("this browser cannot prepare the picture");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("the picture could not be prepared");
  return blob;
}

/** Sends the signed-in user's picture. Throws with the server's message when it is refused. */
export async function uploadAvatar(file: File): Promise<void> {
  const body = new FormData();
  body.append("file", await shrinkPicture(file), "avatar.jpg");
  const res = await fetch(`${API_BASE}/api/auth/me/avatar`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    body,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail ?? `upload failed: ${res.status}`);
  }
}

async function fetchAvatar(): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/auth/me/avatar`, {
    headers: { Authorization: `Bearer ${getToken() ?? ""}` },
  });
  if (!res.ok) throw new Error(`avatar: ${res.status}`);
  return res.blob();
}

/**
 * An object URL for the signed-in user's picture, or null when they have none. The image is fetched with the bearer
 * token, because an <img> tag cannot send it. The query key includes the user id, and the account page invalidates
 * the "avatar" key after an upload so the new picture shows.
 */
export function useAvatarUrl(): string | null {
  const me = useMe();
  const picture = useQuery({
    queryKey: ["avatar", me.data?.id],
    queryFn: fetchAvatar,
    enabled: me.data?.has_avatar === true,
    staleTime: Infinity,
  });
  return useMemo(() => (picture.data ? URL.createObjectURL(picture.data) : null), [picture.data]);
}
