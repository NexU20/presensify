import { NextRequest, NextResponse } from "next/server";

import {
  clearSessionCookie,
  getDashboardInfo,
  readSessionFromRequest,
  writeSessionCookie,
} from "@/lib/presensi";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = readSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({
      ok: false,
      message: "Session login belum tersedia.",
      data: null,
    });
  }

  try {
    const { info, session: refreshedSession } =
      await getDashboardInfo(session);

    const response = NextResponse.json({
      ok: true,
      message: info.alreadySubmitted
        ? "Anda sudah melakukan absensi hari ini."
        : "Anda belum melakukan absensi hari ini.",
      data: info,
    });

    writeSessionCookie(response, request, refreshedSession);
    return response;
  } catch {
    const response = NextResponse.json(
      {
        ok: false,
        message:
          "Gagal mengambil info dashboard. Session mungkin sudah expired.",
        data: null,
      },
      { status: 401 },
    );
    clearSessionCookie(response, request);
    return response;
  }
}
