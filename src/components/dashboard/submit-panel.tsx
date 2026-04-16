"use client";

import type { FormEvent } from "react";
import type { AttendanceResponse } from "@/lib/types";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("./location-picker"), {
  ssr: false,
  loading: () => (
    <div className="grid h-56 place-items-center rounded-[20px] border border-white/10 bg-black/20 text-sm text-[var(--text-dim)] sm:h-64">
      Memuat peta...
    </div>
  ),
});

type SubmitPanelProps = {
  lokasi: string;
  alasan: string;
  controlsLocked: boolean;
  submitLoading: boolean;
  submitDisabled: boolean;
  sessionReady: boolean;
  photoFile: File | null;
  attendanceResult: AttendanceResponse | null;
  onLokasiChange: (value: string) => void;
  onAlasanChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function SubmitPanel({
  lokasi,
  alasan,
  controlsLocked,
  submitLoading,
  submitDisabled,
  sessionReady,
  photoFile,
  attendanceResult,
  onLokasiChange,
  onAlasanChange,
  onSubmit,
}: SubmitPanelProps) {
  return (
    <section className="neuro-panel rise-in p-5 sm:p-6 [animation-delay:360ms]">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-dim)]">
              Step 3
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Submit Request
            </h2>
          </div>

          <LocationPicker
            disabled={controlsLocked || submitLoading}
            onLocationSelect={onLokasiChange}
          />

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--text-dim)]">
              Lokasi
            </span>
            <textarea
              className="neuro-field min-h-24 resize-none px-4 py-4 text-sm"
              disabled={controlsLocked || submitLoading}
              onChange={(event) => onLokasiChange(event.target.value)}
              value={lokasi}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--text-dim)]">
              Alasan (opsional)
            </span>
            <textarea
              className="neuro-field min-h-24 resize-none px-4 py-4"
              disabled={controlsLocked || submitLoading}
              onChange={(event) => onAlasanChange(event.target.value)}
              placeholder="Untuk status Hadir biasanya dibiarkan kosong."
              value={alasan}
            />
          </label>

          <button
            className="neuro-button mt-2 px-5 py-4 text-sm font-semibold text-white"
            disabled={submitDisabled}
            type="submit"
          >
            {submitLoading ? "Mengirim ke target..." : "Kirim Request Presensi"}
          </button>
        </form>

        <aside className="grid gap-4">
          <LiveChecklist
            sessionReady={sessionReady}
            photoFile={photoFile}
            submitDisabled={submitDisabled}
          />

          <ResponseInspector result={attendanceResult} />
        </aside>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal sub-components (only used by SubmitPanel)                  */
/* ------------------------------------------------------------------ */

function LiveChecklist({
  sessionReady,
  photoFile,
  submitDisabled,
}: {
  sessionReady: boolean;
  photoFile: File | null;
  submitDisabled: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-dim)]">
        Live Checklist
      </p>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-dim)]">Cookie/session</span>
          <span className={sessionReady ? "text-emerald-200" : "text-red-200"}>
            {sessionReady ? "Valid" : "Belum ada"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-dim)]">Foto .webp</span>
          <span className={photoFile ? "text-emerald-200" : "text-red-200"}>
            {photoFile ? "Siap" : "Belum siap"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-dim)]">Submit button</span>
          <span
            className={
              submitDisabled ? "text-red-200" : "text-[var(--accent)]"
            }
          >
            {submitDisabled ? "Disabled" : "Enabled"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ResponseInspector({
  result,
}: {
  result: AttendanceResponse | null;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/14 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-dim)]">
        Response Target
      </p>
      {result ? (
        <div className="mt-4 grid gap-3 text-sm leading-7 text-[var(--text-dim)]">
          <p className={result.ok ? "text-emerald-100" : "text-red-100"}>
            {result.message}
          </p>
          <p>
            HTTP target:{" "}
            <span className="font-semibold text-white">
              {result.upstreamStatus ?? "-"}
            </span>
          </p>
          <p>
            Redirect:{" "}
            <span className="break-all font-medium text-[var(--accent)]">
              {result.redirectTo || "-"}
            </span>
          </p>
          <p className="rounded-2xl border border-white/7 bg-black/18 px-4 py-3 font-mono text-xs text-slate-200">
            {result.upstreamBody || "Body response kosong."}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-[var(--text-dim)]">
          Detail response target akan muncul di sini setelah request presensi
          dikirim.
        </p>
      )}
    </div>
  );
}
