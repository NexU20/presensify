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

export const DEFAULT_LOCATION =
  "UIN Syarif Hidayatullah, Jalan Haji Limun, RW 08, Pisangan, " +
  "Ciputat Timur, South Tangerang, Banten, Java, 15419, Indonesia";
