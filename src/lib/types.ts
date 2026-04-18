/** Shared frontend types for the Presensify dashboard. */

export type FeedbackTone = "info" | "success" | "danger";

export type StatusState = "checking" | "ready" | "locked";

export type SessionResponse = {
  loggedIn: boolean;
  message: string;
};

export type AttendanceResponse = {
  message: string;
  ok: boolean;
  redirectTo?: string | null;
  status?: string;
  upstreamBody?: string;
  upstreamStatus?: number;
};

export type DashboardInfo = {
  /** Whether the user has already submitted attendance today. */
  alreadySubmitted: boolean;
  /** The available status options in the dropdown (e.g. ["Hadir","Izin","Sakit"] or ["Pulang"]). */
  availableOptions: string[];
  /** Aggregated attendance stats from the portal. */
  stats: { hadir: number; izin: number; sakit: number };
  /** Clock-in time shown on the portal (e.g. "08:43" or "--:--"). */
  jamMasuk: string;
  /** Clock-out time shown on the portal (e.g. "--:--"). */
  jamPulang: string;
};

export type DashboardInfoResponse = {
  ok: boolean;
  message: string;
  data: DashboardInfo | null;
};

export const DEFAULT_LOCATION =
  "UIN Syarif Hidayatullah, Jalan Haji Limun, RW 08, Pisangan, " +
  "Ciputat Timur, South Tangerang, Banten, Java, 15419, Indonesia";
