import { getToken } from "../auth/session";
import { API_BASE } from "./client";

/**
 * POSTs a file as multipart form data and reports how much of it has been sent (0 to 1).
 * fetch cannot report upload progress, so this uses XMLHttpRequest. onSent fires once every byte has left the browser;
 * the server still has to hash and write the file after that.
 */
export function uploadFile(
  path: string,
  file: File,
  onProgress: (fraction: number) => void,
  onSent: () => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${getToken() ?? ""}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.upload.onload = () => onSent();
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`upload failed: ${xhr.status}`));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error("upload returned an unreadable response"));
      }
    };
    xhr.onerror = () => reject(new Error("network error during upload"));
    xhr.ontimeout = () => reject(new Error("upload timed out"));
    xhr.timeout = 0; // no client timeout: a 475 MB file on a slow link can take minutes
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}
