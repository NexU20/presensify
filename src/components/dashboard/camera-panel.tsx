"use client";

import { ChangeEvent, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatBytes } from "@/lib/image";

type CameraPanelProps = {
  photoFile: File | null;
  photoPreviewUrl: string | null;
  controlsLocked: boolean;
  convertingPhoto: boolean;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function CameraPanel({
  photoFile,
  photoPreviewUrl,
  controlsLocked,
  convertingPhoto,
  onPhotoChange,
}: CameraPanelProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openLightbox = useCallback(() => {
    if (!photoPreviewUrl) return;
    setLightboxOpen(true);
  }, [photoPreviewUrl]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const hasPreview = !!photoPreviewUrl;

  return (
    <section className="neuro-panel rise-in float-card p-5 sm:p-6 [animation-delay:240ms]">
      <div className="flex h-full flex-col gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-dim)]">
            Step 2
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Camera Upload
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-dim)]">
            Upload dikunci sampai session login valid.
          </p>
        </div>

        {/* Hidden file input — triggered programmatically */}
        <input
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={controlsLocked || convertingPhoto}
          onChange={onPhotoChange}
          type="file"
        />

        {/*
          Fixed-height zone prevents CLS.
          When preview exists: click image → lightbox, "Ganti foto" button → file input.
          When no preview: entire zone is clickable → file input.
        */}
        <div
          className={`relative mx-auto grid h-72 w-full max-w-xs place-items-center overflow-hidden rounded-[26px] border border-dashed px-6 text-center transition sm:max-w-none ${
            controlsLocked
              ? "border-white/8 bg-white/4 opacity-50"
              : hasPreview
                ? "border-[rgba(121,168,255,0.18)] bg-[rgba(121,168,255,0.05)]"
                : "cursor-pointer border-[rgba(121,168,255,0.28)] bg-[rgba(121,168,255,0.08)] hover:border-[rgba(121,168,255,0.42)] hover:bg-[rgba(121,168,255,0.12)]"
          }`}
          onClick={!hasPreview && !controlsLocked ? triggerFileInput : undefined}
          role={!hasPreview ? "button" : undefined}
          tabIndex={!hasPreview ? 0 : undefined}
        >
          {hasPreview ? (
            <div className="grid gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Preview foto presensi"
                className="mx-auto w-3/5 max-h-40 cursor-zoom-in rounded-[20px] object-cover shadow-[0_18px_40px_rgba(0,0,0,0.34)] transition duration-300 hover:scale-[1.03]"
                onClick={openLightbox}
                src={photoPreviewUrl}
              />
              <div className="space-y-0.5 text-sm">
                <p className="font-semibold text-white">{photoFile?.name}</p>
                <p className="text-[var(--text-dim)]">
                  {photoFile ? formatBytes(photoFile.size) : "-"} • image/webp
                </p>
              </div>
              <button
                className="mx-auto rounded-full border border-white/10 bg-white/6 px-4 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-white/12"
                disabled={controlsLocked || convertingPhoto}
                onClick={triggerFileInput}
                type="button"
              >
                Ganti foto
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/7 text-2xl shadow-[inset_1px_1px_0_rgba(255,255,255,0.08),_12px_12px_22px_rgba(4,8,15,0.52)]">
                +
              </div>
              <div>
                <p className="text-base font-semibold text-white">
                  {convertingPhoto
                    ? "Konversi foto berjalan..."
                    : "Tap untuk ambil/pilih foto"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 rounded-[24px] border border-white/8 bg-black/12 p-4 text-sm text-[var(--text-dim)]">
          <div className="flex items-center justify-between gap-3">
            <span>Status upload</span>
            <span className="font-semibold text-white">
              {controlsLocked ? "Terkunci" : photoFile ? "Siap" : "Menunggu foto"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Auto-format</span>
            <span className="font-semibold text-[var(--accent)]">.webp</span>
          </div>
        </div>
      </div>

      {/* Lightbox modal — portalled to body to escape ancestor transforms */}
      {lightboxOpen &&
        photoPreviewUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] grid place-items-center bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Preview foto"
          >
            <div
              className="relative max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Preview foto presensi (full)"
                className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
                src={photoPreviewUrl}
              />
              <button
                className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                onClick={() => setLightboxOpen(false)}
                type="button"
                aria-label="Tutup preview"
              >
                ✕
              </button>
              {photoFile && (
                <p className="mt-3 text-center text-sm text-white/70">
                  {photoFile.name} • {formatBytes(photoFile.size)}
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
