import { useSyncExternalStore } from "react";
import { z } from "zod";
import { uploadFile } from "../../api/upload";

// Upload and import state for the import page. It lives outside the page component, so switching tabs does not lose a
// running upload. The import and sync ids are also kept in sessionStorage, so returning to the page reconnects to them.

const UploadSchema = z.object({ id: z.number(), status: z.string(), duplicate: z.boolean() });

export type UploadState = { busy: boolean; sent: number | null; saving: boolean; error: string | null };

let upload: UploadState = { busy: false, sent: null, saving: false, error: null };
const listeners = new Set<() => void>();

function emit(next: Partial<UploadState>) {
  upload = { ...upload, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useUploadState(): UploadState {
  return useSyncExternalStore(subscribe, () => upload);
}

const IMPORT_KEY = "aml_import_id";
const SYNC_KEY = "aml_sync_started_id";

function readId(key: string): number | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? null : Number(raw);
  } catch {
    return null; // storage blocked (private mode): the page still works for this visit
  }
}

function writeId(key: string, id: number): void {
  try {
    sessionStorage.setItem(key, String(id));
  } catch {
    // storage blocked: nothing to restore on return
  }
}

export const savedImportId = (): number | null => readId(IMPORT_KEY);
export const savedSyncStarted = (): number | null => readId(SYNC_KEY);
export const saveSyncStarted = (id: number): void => writeId(SYNC_KEY, id);

/** Uploads the file. Its progress is in the store, and its import id is saved, so the page picks it up on return. */
export async function startUpload(file: File): Promise<number> {
  emit({ busy: true, sent: 0, saving: false, error: null });
  try {
    const raw = await uploadFile(
      "/api/imports",
      file,
      (fraction) => emit({ sent: fraction }),
      () => emit({ saving: true }),
    );
    const { id } = UploadSchema.parse(raw);
    writeId(IMPORT_KEY, id);
    emit({ busy: false, sent: null, saving: false });
    return id;
  } catch (err) {
    emit({ busy: false, sent: null, saving: false, error: (err as Error).message });
    throw err;
  }
}
