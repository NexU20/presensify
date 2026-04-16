import "server-only";

import type { NextRequest, NextResponse } from "next/server";

export const BASE_URL = "https://presensi.ppmuinjkt.com";
const LOGIN_URL = `${BASE_URL}/login`;
const DASHBOARD_URL = `${BASE_URL}/dashboard-mahasiswa`;
const ATTENDANCE_URL = `${BASE_URL}/dashboard`;
export const ATTENDANCE_STATUS = "Hadir";
export const DEFAULT_LOCATION =
  "UIN Syarif Hidayatullah, Jalan Haji Limun, RW 08, Pisangan, " +
  "Ciputat Timur, South Tangerang, Banten, Java, 15419, Indonesia";
const DEFAULT_TIMEOUT = 30_000;

const TOKEN_INPUT_RE =
  /<input[^>]+name=["']_token["'][^>]+value=["']([^"']+)["']/i;
const META_CSRF_RE =
  /<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i;

export const SESSION_COOKIE_NAME = "presensify_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 6;

type CookieJar = Map<string, string>;

export type SessionPayload = {
  ppmSecuritySession: string;
  xsrfToken: string;
};

export type AttendanceSubmission = {
  alasan: string;
  foto: File;
  lokasi: string;
};

export type AttendanceResult = {
  bodySnippet: string;
  redirectTo: string | null;
  session: SessionPayload;
  status: number;
  success: boolean;
};

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&gt;": ">",
  "&lt;": "<",
  "&#39;": "'",
  "&#039;": "'",
  "&quot;": '"',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(amp|gt|lt|#39|#039|quot);/g,
    (entity) => HTML_ENTITY_MAP[entity] ?? entity,
  );
}

function extractFormToken(pageHtml: string): string {
  const match = TOKEN_INPUT_RE.exec(pageHtml) ?? META_CSRF_RE.exec(pageHtml);

  if (!match?.[1]) {
    throw new Error("Tidak menemukan token login/dashboard dari halaman target.");
  }

  return decodeHtmlEntities(match[1]);
}

function requireCookie(jar: CookieJar, name: string): string {
  const value = jar.get(name);

  if (!value) {
    throw new Error(`Cookie wajib \`${name}\` tidak ditemukan pada session.`);
  }

  return value;
}

function cookieHeaderFromJar(jar: CookieJar): string {
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function splitSetCookieHeader(headerValue: string): string[] {
  return headerValue
    .split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/g)
    .map((value) => value.trim())
    .filter(Boolean);
}

function getSetCookieValues(headers: Headers): string[] {
  const headersWithGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithGetSetCookie.getSetCookie === "function") {
    return headersWithGetSetCookie.getSetCookie();
  }

  const combinedValue = headers.get("set-cookie");
  return combinedValue ? splitSetCookieHeader(combinedValue) : [];
}

function updateJarFromResponse(jar: CookieJar, response: Response): void {
  for (const cookieText of getSetCookieValues(response.headers)) {
    const [nameValue] = cookieText.split(";", 1);
    const separatorIndex = nameValue.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const name = nameValue.slice(0, separatorIndex).trim();
    const value = nameValue.slice(separatorIndex + 1).trim();

    if (!value) {
      jar.delete(name);
      continue;
    }

    jar.set(name, value);
  }
}

async function fetchTarget(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });
}

function buildHtmlHeaders(referer: string, cookieJar?: CookieJar): HeadersInit {
  return {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    ...(cookieJar ? { Cookie: cookieHeaderFromJar(cookieJar) } : {}),
    Referer: referer,
    "Upgrade-Insecure-Requests": "1",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) " +
      "Gecko/20100101 Firefox/149.0",
  };
}

async function bootstrapLogin(jar: CookieJar): Promise<string> {
  const response = await fetchTarget(`${BASE_URL}/`, {
    headers: buildHtmlHeaders(BASE_URL),
  });

  if (!response.ok) {
    throw new Error(`Gagal membuka halaman login. HTTP ${response.status}.`);
  }

  updateJarFromResponse(jar, response);
  requireCookie(jar, "XSRF-TOKEN");
  requireCookie(jar, "ppm-security-session");

  return extractFormToken(await response.text());
}

async function performLogin(
  jar: CookieJar,
  nim: string,
  password: string,
  loginToken: string,
): Promise<void> {
  const response = await fetchTarget(LOGIN_URL, {
    body: new URLSearchParams({
      _token: loginToken,
      nim,
      password,
    }).toString(),
    headers: {
      ...buildHtmlHeaders(`${BASE_URL}/`, jar),
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: BASE_URL,
    },
    method: "POST",
    redirect: "manual",
  });

  updateJarFromResponse(jar, response);

  const location = response.headers.get("location") ?? "";
  if (![302, 303].includes(response.status)) {
    throw new Error(
      `Login gagal. HTTP ${response.status}. Body awal: ${(
        await response.text()
      )
        .replace(/\s+/g, " ")
        .slice(0, 220)}`,
    );
  }

  if (!location.includes("dashboard-mahasiswa")) {
    throw new Error(
      `Login ditolak target. Redirect yang diterima: ${location || "<kosong>"}.`,
    );
  }

  requireCookie(jar, "XSRF-TOKEN");
  requireCookie(jar, "ppm-security-session");
}

async function fetchDashboardToken(jar: CookieJar): Promise<string> {
  const response = await fetchTarget(DASHBOARD_URL, {
    headers: buildHtmlHeaders(`${BASE_URL}/`, jar),
  });

  if (!response.ok) {
    throw new Error(
      `Session login tidak valid saat membuka dashboard. HTTP ${response.status}.`,
    );
  }

  updateJarFromResponse(jar, response);
  requireCookie(jar, "XSRF-TOKEN");
  requireCookie(jar, "ppm-security-session");

  return extractFormToken(await response.text());
}

function sessionToJar(session: SessionPayload): CookieJar {
  return new Map<string, string>([
    ["XSRF-TOKEN", session.xsrfToken],
    ["ppm-security-session", session.ppmSecuritySession],
  ]);
}

function jarToSession(jar: CookieJar): SessionPayload {
  return {
    ppmSecuritySession: requireCookie(jar, "ppm-security-session"),
    xsrfToken: requireCookie(jar, "XSRF-TOKEN"),
  };
}

export async function loginAndCreateSession(
  nim: string,
  password: string,
): Promise<SessionPayload> {
  const jar = new Map<string, string>();
  const loginToken = await bootstrapLogin(jar);
  await performLogin(jar, nim, password, loginToken);
  await fetchDashboardToken(jar);
  return jarToSession(jar);
}

export async function verifySession(
  session: SessionPayload,
): Promise<SessionPayload> {
  const jar = sessionToJar(session);
  await fetchDashboardToken(jar);
  return jarToSession(jar);
}

export async function submitAttendance(
  session: SessionPayload,
  submission: AttendanceSubmission,
): Promise<AttendanceResult> {
  const jar = sessionToJar(session);
  const dashboardToken = await fetchDashboardToken(jar);

  const payload = new FormData();
  payload.set("_token", dashboardToken);
  payload.set("status", ATTENDANCE_STATUS);
  payload.set("lokasi", submission.lokasi.trim() || DEFAULT_LOCATION);
  payload.set("alasan", submission.alasan.trim());
  payload.set(
    "foto",
    submission.foto,
    submission.foto.name || "foto-presensi.webp",
  );

  const response = await fetchTarget(ATTENDANCE_URL, {
    body: payload,
    headers: {
      ...buildHtmlHeaders(DASHBOARD_URL, jar),
      Cookie: cookieHeaderFromJar(jar),
      Origin: BASE_URL,
    },
    method: "POST",
    redirect: "manual",
  });

  updateJarFromResponse(jar, response);

  const responseBody = (await response.text()).replace(/\s+/g, " ").trim();
  const redirectTo = response.headers.get("location");

  return {
    bodySnippet: responseBody.slice(0, 280),
    redirectTo,
    session: jarToSession(jar),
    status: response.status,
    success: response.status >= 200 && response.status < 400,
  };
}

export function encodeSessionCookie(session: SessionPayload): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

export function decodeSessionCookie(value: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;

    if (
      typeof parsed.ppmSecuritySession !== "string" ||
      typeof parsed.xsrfToken !== "string"
    ) {
      return null;
    }

    return {
      ppmSecuritySession: parsed.ppmSecuritySession,
      xsrfToken: parsed.xsrfToken,
    };
  } catch {
    return null;
  }
}

export function readSessionFromRequest(
  request: NextRequest,
): SessionPayload | null {
  const encodedSession = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return encodedSession ? decodeSessionCookie(encodedSession) : null;
}

function buildSessionCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
  };
}

export function writeSessionCookie(
  response: NextResponse,
  request: NextRequest,
  session: SessionPayload,
): void {
  response.cookies.set({
    ...buildSessionCookieOptions(request),
    name: SESSION_COOKIE_NAME,
    value: encodeSessionCookie(session),
  });
}

export function clearSessionCookie(
  response: NextResponse,
  request: NextRequest,
): void {
  response.cookies.set({
    ...buildSessionCookieOptions(request),
    maxAge: 0,
    name: SESSION_COOKIE_NAME,
    value: "",
  });
}
