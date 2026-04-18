"use client";

import type { DashboardInfo } from "@/lib/types";

type AttendanceStatusCardProps = {
  dashboardInfo: DashboardInfo | null;
  loading: boolean;
  sessionReady: boolean;
};

export default function AttendanceStatusCard({
  dashboardInfo,
  loading,
  sessionReady,
}: AttendanceStatusCardProps) {
  // Determine which inner content to render — the outer <section> always
  // stays in the DOM so we never get a content layout shift.
  const showPlaceholder = !sessionReady;
  const showSkeleton = sessionReady && (loading || !dashboardInfo);

  if (showPlaceholder) {
    return (
      <section
        className="neuro-panel rise-in p-5 sm:p-6 [animation-delay:60ms]"
        aria-label="Status absensi"
      >
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/6 text-[var(--text-dim)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-dim)] sm:text-lg">
              Status Absensi
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-dim)] sm:text-sm">
              Login terlebih dahulu untuk melihat status absensi hari ini.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (showSkeleton) {
    return (
      <section
        className="neuro-panel rise-in p-5 sm:p-6"
        aria-label="Memuat status absensi"
      >
        <SkeletonInner />
      </section>
    );
  }

  if (!dashboardInfo) {
    return null;
  }

  const submitted = dashboardInfo.alreadySubmitted;
  const { stats, jamMasuk, jamPulang } = dashboardInfo;

  return (
    <section
      className="neuro-panel rise-in overflow-hidden p-5 sm:p-6 [animation-delay:60ms]"
      aria-label="Status absensi hari ini"
    >
      {/* Main status row */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl ${
              submitted
                ? "bg-emerald-400/12 text-emerald-300"
                : "bg-amber-400/12 text-amber-300"
            }`}
          >
            {submitted ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          {/* Text */}
          <div>
            <h3
              className={`text-base font-semibold sm:text-lg ${
                submitted ? "text-emerald-200" : "text-amber-200"
              }`}
            >
              {submitted ? "Sudah Absen Hari Ini" : "Belum Absen Hari Ini"}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-dim)] sm:text-sm">
              {submitted
                ? `Absen tercatat pada ${jamMasuk !== "--:--" ? jamMasuk : "hari ini"}`
                : "Silakan lakukan absensi melalui form di bawah."}
            </p>
          </div>
        </div>

        {/* Jam Masuk / Pulang badges */}
        <div className="flex items-center gap-3">
          <TimeBadge label="Masuk" value={jamMasuk} />
          <TimeBadge label="Pulang" value={jamPulang} />
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <StatChip
          label="Hadir"
          value={stats.hadir}
          colorClass="text-emerald-300"
        />
        <StatChip
          label="Izin"
          value={stats.izin}
          colorClass="text-amber-300"
        />
        <StatChip
          label="Sakit"
          value={stats.sakit}
          colorClass="text-red-300"
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Internal sub-components                                             */
/* ------------------------------------------------------------------ */

function TimeBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-2.5 text-center">
      <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-dim)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">
        {value}
      </p>
    </div>
  );
}

function StatChip({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-3 text-center">
      <p className={`text-xl font-bold tabular-nums ${colorClass}`}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-dim)]">
        {label}
      </p>
    </div>
  );
}


function SkeletonInner() {
  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-white/8" />
          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded-lg bg-white/8" />
            <div className="h-3.5 w-64 animate-pulse rounded-lg bg-white/6" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-[52px] w-[72px] animate-pulse rounded-2xl bg-white/6" />
          <div className="h-[52px] w-[72px] animate-pulse rounded-2xl bg-white/6" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="h-[62px] animate-pulse rounded-2xl bg-white/5" />
        <div className="h-[62px] animate-pulse rounded-2xl bg-white/5" />
        <div className="h-[62px] animate-pulse rounded-2xl bg-white/5" />
      </div>
    </>
  );
}
