import { useEffect, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { buttonClass, ErrorState } from "../../components/ui";

type Props = {
  file: File | null;
  error: string | null;
  saving: boolean;
  onPick: (file: File | null) => void;
  onSave: () => void;
  onClose: () => void;
};

/**
 * The CSV upload window. Before a file is chosen it shows the drop zone; after, the file card with a remove button.
 * Save uploads the file and the parent closes the window when the upload is done.
 */
export default function CsvUploadDialog({ file, error, saving, onPick, onSave, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Escape closes the window, unless an upload is running.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  function onDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onPick(dropped);
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/30 px-4">
      <div role="dialog" aria-modal="true" aria-labelledby="csv-upload-title"
           className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg ring-1 ring-line">
        <div className="flex items-center justify-between">
          <h2 id="csv-upload-title" className="text-lg font-semibold text-ink-900">Upload transactions CSV</h2>
          <button type="button" aria-label="Close" onClick={onClose} disabled={saving}
                  className="text-ink-400 hover:text-ink-900 disabled:opacity-40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-line">
          {file === null ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
                dragging ? "border-ok-600 bg-ok-50" : "border-ink-400 bg-page hover:bg-line/60"
              }`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-ok-600">
                  <path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2" />
                  <path d="M12 12v9M8 16l4-4 4 4" />
                </svg>
              </span>
              <span className="text-base font-semibold text-ink-900">Upload a new transactions CSV</span>
              <span className="text-sm text-ink-600">Only the file you upload here is imported</span>
              <span className="text-sm font-medium text-ok-600">.csv files only</span>
            </button>
          ) : (
            <div className="flex items-center gap-4 rounded-xl bg-white p-4 ring-1 ring-line">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ok-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-ok-600">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M8 13h8M8 17h8" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{file.name}</p>
                <p className="text-sm text-ink-600">{saving ? "Uploading…" : "Ready to upload"}</p>
              </div>
              <button type="button" aria-label="Remove file" disabled={saving} onClick={() => onPick(null)}
                      className="text-ink-400 hover:text-ink-900 disabled:opacity-40">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              onPick(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>

        {error && <div className="mt-4"><ErrorState text={`Upload failed. ${error}`} /></div>}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-5">
          <button type="button" onClick={onClose} disabled={saving} className={buttonClass("secondary")}>
            Back
          </button>
          <button type="button" onClick={onSave} disabled={file === null || saving} className={buttonClass()}>
            {saving ? "Uploading…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
